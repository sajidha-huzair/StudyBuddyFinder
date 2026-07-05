import json
import os
import re

from django.conf import settings
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from .models import ChatRoom, ChatRoomMessage, MessageType
from .group_chat import user_can_access_room
from .room_serializers import (
    ChatRoomSerializer,
    ChatRoomDetailSerializer,
    ChatRoomMessageSerializer,
)

ALLOWED_CHAT_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx', '.txt'}
URL_PATTERN = re.compile(r'https?://[^\s<>"\']+')


def _validate_upload(upload):
    max_bytes = getattr(settings, 'CHAT_UPLOAD_MAX_BYTES', 5 * 1024 * 1024)
    if upload.size > max_bytes:
        return 'File too large (max 5 MB)'
    ext = os.path.splitext(upload.name)[1].lower()
    if ext not in ALLOWED_CHAT_EXTENSIONS:
        return 'File type not allowed'
    return None


def _can_edit_room(user, room):
    if not user_can_access_room(user, room):
        return False
    if room.session_id and room.session:
        return room.session.creator_id == user.id
    return True


def _push_room_message(room, message, sender_user):
    try:
        from chat.realtime import push_room_message
        payload = ChatRoomMessageSerializer(message).data
        payload['sender'] = 'me'
        for member in room.members.exclude(user=sender_user):
            item = {**payload, 'sender': 'buddy'}
            push_room_message(member.user_id, room.id, item)
    except Exception:
        pass


def _media_item_from_message(msg, request):
    meta = {}
    if msg.metadata:
        try:
            meta = json.loads(msg.metadata) if isinstance(msg.metadata, str) else msg.metadata
        except (json.JSONDecodeError, TypeError):
            meta = {}

    base = {
        'id': msg.id,
        'messageType': msg.message_type,
        'title': msg.content[:120],
        'timestamp': msg.created_at.isoformat(),
        'senderName': (msg.sender.full_name or msg.sender.username) if msg.sender else 'System',
    }

    if msg.message_type == MessageType.FILE:
        url = None
        if msg.attachment:
            url = msg.attachment.url
            if request:
                url = request.build_absolute_uri(url)
        mime = meta.get('mimeType', '')
        is_image = mime.startswith('image/') or (
            msg.attachment and msg.attachment.name.lower().endswith(
                ('.jpg', '.jpeg', '.png', '.gif', '.webp')
            )
        )
        return {
            **base,
            'category': 'media' if is_image else 'docs',
            'url': url or meta.get('downloadUrl'),
            'fileName': meta.get('fileName') or msg.content,
            'mimeType': mime,
        }

    if msg.message_type == MessageType.RECORDING:
        return {
            **base,
            'category': 'recordings',
            'url': meta.get('downloadUrl') or meta.get('recordingUrl'),
            'title': meta.get('sessionTitle') or 'Session recording',
        }

    if msg.message_type == MessageType.SESSION_PROPOSAL:
        return {
            **base,
            'category': 'links',
            'url': f'/sessions?session={meta.get("sessionId")}' if meta.get('sessionId') else None,
            'title': meta.get('title') or msg.content,
            'meta': meta,
        }

    urls = URL_PATTERN.findall(msg.content or '')
    if urls and msg.message_type == MessageType.TEXT:
        return {
            **base,
            'category': 'links',
            'url': urls[0],
            'title': msg.content[:80],
        }

    return None


class ChatRoomViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def list(self, request):
        room_ids = ChatRoom.objects.filter(
            members__user=request.user,
        ).values_list('id', flat=True).distinct()
        rooms = ChatRoom.objects.filter(id__in=room_ids).select_related('session')
        return Response(ChatRoomSerializer(rooms, many=True, context={'request': request}).data)

    def retrieve(self, request, pk=None):
        try:
            room = ChatRoom.objects.select_related('session').get(pk=pk)
        except ChatRoom.DoesNotExist:
            return Response({'error': 'Chat room not found'}, status=status.HTTP_404_NOT_FOUND)

        if not user_can_access_room(request.user, room):
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

        return Response(ChatRoomDetailSerializer(room, context={'request': request}).data)

    def partial_update(self, request, pk=None):
        try:
            room = ChatRoom.objects.select_related('session').get(pk=pk)
        except ChatRoom.DoesNotExist:
            return Response({'error': 'Chat room not found'}, status=status.HTTP_404_NOT_FOUND)

        if not _can_edit_room(request.user, room):
            return Response({'error': 'Only the session organizer can edit this group'}, status=status.HTTP_403_FORBIDDEN)

        title = request.data.get('title')
        if title is not None:
            title = str(title).strip()
            if not title:
                return Response({'error': 'Title cannot be empty'}, status=status.HTTP_400_BAD_REQUEST)
            room.title = title[:200]

        if 'description' in request.data:
            room.description = (request.data.get('description') or '')[:1000]

        icon = request.FILES.get('icon')
        if icon:
            err = _validate_upload(icon)
            if err:
                return Response({'error': err}, status=status.HTTP_400_BAD_REQUEST)
            if not (icon.content_type or '').startswith('image/'):
                return Response({'error': 'Icon must be an image'}, status=status.HTTP_400_BAD_REQUEST)
            room.icon = icon

        room.save()
        return Response(ChatRoomDetailSerializer(room, context={'request': request}).data)

    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        try:
            room = ChatRoom.objects.get(pk=pk)
        except ChatRoom.DoesNotExist:
            return Response({'error': 'Chat room not found'}, status=status.HTTP_404_NOT_FOUND)

        if not user_can_access_room(request.user, room):
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

        msgs = room.messages.select_related('sender').order_by('created_at')
        q = (request.query_params.get('q') or '').strip().lower()
        if q:
            msgs = [m for m in msgs if q in (m.content or '').lower()]

        data = ChatRoomMessageSerializer(msgs, many=True, context={'request': request}).data
        for item in data:
            item['sender'] = 'me' if item['senderId'] == request.user.id else 'buddy'
        return Response(data)

    @action(detail=True, methods=['get'])
    def media(self, request, pk=None):
        try:
            room = ChatRoom.objects.get(pk=pk)
        except ChatRoom.DoesNotExist:
            return Response({'error': 'Chat room not found'}, status=status.HTTP_404_NOT_FOUND)

        if not user_can_access_room(request.user, room):
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

        msgs = room.messages.select_related('sender').order_by('-created_at')
        media = {'media': [], 'docs': [], 'links': [], 'recordings': []}

        for msg in msgs:
            item = _media_item_from_message(msg, request)
            if not item:
                continue
            cat = item.pop('category', 'docs')
            if cat in media:
                media[cat].append(item)

        return Response(media)

    @action(detail=True, methods=['post'])
    def send(self, request, pk=None):
        try:
            room = ChatRoom.objects.get(pk=pk)
        except ChatRoom.DoesNotExist:
            return Response({'error': 'Chat room not found'}, status=status.HTTP_404_NOT_FOUND)

        if not user_can_access_room(request.user, room):
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

        upload = request.FILES.get('file')
        content = (request.data.get('content') or '').strip()
        metadata = request.data.get('metadata') or {}
        if isinstance(metadata, str):
            try:
                metadata = json.loads(metadata) if metadata else {}
            except json.JSONDecodeError:
                metadata = {}

        message_type = MessageType.TEXT
        attachment = None

        if upload:
            err = _validate_upload(upload)
            if err:
                return Response({'error': err}, status=status.HTTP_400_BAD_REQUEST)
            message_type = MessageType.FILE
            attachment = upload
            metadata = {
                **metadata,
                'fileName': upload.name,
                'fileSize': upload.size,
                'mimeType': upload.content_type or 'application/octet-stream',
            }
            if not content:
                content = upload.name

        if not content and not upload:
            return Response({'error': 'Message cannot be empty'}, status=status.HTTP_400_BAD_REQUEST)

        message = ChatRoomMessage.objects.create(
            room=room,
            sender=request.user,
            message_type=message_type,
            content=content,
            attachment=attachment,
            metadata=json.dumps(metadata),
        )

        _push_room_message(room, message, request.user)

        item = ChatRoomMessageSerializer(message, context={'request': request}).data
        item['sender'] = 'me'
        return Response(item, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='for-session/(?P<session_id>[^/.]+)')
    def for_session(self, request, session_id=None):
        room = ChatRoom.objects.filter(session_id=session_id, members__user=request.user).first()
        if not room:
            return Response({'error': 'No group chat for this session yet'}, status=status.HTTP_404_NOT_FOUND)
        return Response(ChatRoomDetailSerializer(room, context={'request': request}).data)
