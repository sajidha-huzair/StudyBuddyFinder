import json
import os

from django.conf import settings
from django.db.models import Q
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from matches.models import Match, MatchStatus
from users.models import User
from users.blocking import is_blocked
from .models import Message, MessageType
from .serializers import MessageSerializer, MessageCreateSerializer


def _are_buddies(user1, user2):
    return Match.objects.filter(
        Q(user1=user1, user2=user2) | Q(user1=user2, user2=user1),
        status=MatchStatus.ACCEPTED,
    ).exists()


def _serialize_for_user(message, user):
    item = MessageSerializer(message, context={'request': None}).data
    item['sender'] = 'me' if message.sender_id == user.id else 'buddy'
    return item


def _preview_content(message):
    if message.message_type == MessageType.FILE:
        meta = json.loads(message.metadata or '{}')
        return f'📎 {meta.get("fileName", "Attachment")}'
    if message.message_type == MessageType.RECORDING:
        return '🎥 Session recording'
    if message.message_type == MessageType.SESSION_PROPOSAL:
        return '📅 Session invite'
    return message.content[:120]


def _notify_and_push(message, sender, recipient):
    preview = _preview_content(message)
    try:
        from notifications.services import create_notification
        create_notification(
            recipient,
            'new_message',
            'New Message',
            f'{sender.full_name or sender.username}: {preview}',
            f'/chat/{sender.id}',
        )
    except Exception:
        pass

    try:
        from chat.realtime import push_chat_message
        item = MessageSerializer(message).data
        item['sender'] = 'buddy'
        push_chat_message(recipient.id, item)
    except Exception:
        pass


class MessageViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    @action(detail=False, methods=['get'], url_path='conversations')
    def conversations(self, request):
        user = request.user
        messages = Message.objects.filter(Q(sender=user) | Q(recipient=user)).select_related('sender', 'recipient')

        buddy_map = {}
        for msg in messages.order_by('-created_at'):
            buddy = msg.recipient if msg.sender_id == user.id else msg.sender
            if buddy.id not in buddy_map:
                unread = Message.objects.filter(sender=buddy, recipient=user, read=False).count()
                buddy_map[buddy.id] = {
                    'id': buddy.id,
                    'name': buddy.full_name or buddy.username,
                    'lastMessage': _preview_content(msg),
                    'lastMessageTime': msg.created_at.isoformat(),
                    'unreadCount': unread,
                }

        return Response(list(buddy_map.values()))

    @action(detail=False, methods=['get'], url_path='with/(?P<buddy_id>[^/.]+)')
    def with_buddy(self, request, buddy_id=None):
        user = request.user
        try:
            buddy = User.objects.get(id=buddy_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        if not _are_buddies(user, buddy):
            return Response({'error': 'You can only chat with connected study buddies'}, status=status.HTTP_403_FORBIDDEN)
        if is_blocked(user, buddy):
            return Response({'error': 'You cannot chat with this user'}, status=status.HTTP_403_FORBIDDEN)

        messages = Message.objects.filter(
            Q(sender=user, recipient=buddy) | Q(sender=buddy, recipient=user)
        ).order_by('created_at')

        now = timezone.now()
        unread_ids = list(
            Message.objects.filter(sender=buddy, recipient=user, read=False).values_list('id', flat=True)
        )
        if unread_ids:
            Message.objects.filter(id__in=unread_ids).update(read=True, read_at=now)
            try:
                from chat.realtime import push_read_receipt
                push_read_receipt(buddy.id, user.id, unread_ids)
            except Exception:
                pass

        data = MessageSerializer(messages, many=True, context={'request': request}).data
        q = (request.query_params.get('q') or '').strip().lower()
        if q:
            data = [item for item in data if q in (item.get('content') or '').lower()]
        for item in data:
            item['sender'] = 'me' if item['senderId'] == user.id else 'buddy'
        return Response(data)

    @action(detail=False, methods=['get'], url_path='with/(?P<buddy_id>[^/.]+)/media')
    def buddy_media(self, request, buddy_id=None):
        from chat.room_views import _media_item_from_message

        user = request.user
        try:
            buddy = User.objects.get(id=buddy_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        if not _are_buddies(user, buddy):
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

        messages = Message.objects.filter(
            Q(sender=user, recipient=buddy) | Q(sender=buddy, recipient=user)
        ).select_related('sender').order_by('-created_at')

        media = {'media': [], 'docs': [], 'links': [], 'recordings': []}
        for msg in messages:
            item = _media_item_from_message(msg, request)
            if not item:
                continue
            cat = item.pop('category', 'docs')
            if cat in media:
                media[cat].append(item)
        return Response(media)

    def create(self, request):
        recipient_id = request.data.get('recipient_id') or request.data.get('recipientId')
        if not recipient_id:
            return Response({'error': 'recipient_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            recipient = User.objects.get(id=int(recipient_id))
        except (User.DoesNotExist, TypeError, ValueError):
            return Response({'error': 'Recipient not found'}, status=status.HTTP_404_NOT_FOUND)

        if not _are_buddies(request.user, recipient):
            return Response({'error': 'You can only message connected study buddies'}, status=status.HTTP_403_FORBIDDEN)
        if is_blocked(request.user, recipient):
            return Response({'error': 'You cannot message this user'}, status=status.HTTP_403_FORBIDDEN)

        upload = request.FILES.get('file')
        message_type = request.data.get('message_type') or request.data.get('messageType') or MessageType.TEXT
        metadata_raw = request.data.get('metadata', '{}')
        if isinstance(metadata_raw, str):
            try:
                metadata = json.loads(metadata_raw) if metadata_raw else {}
            except json.JSONDecodeError:
                metadata = {}
        else:
            metadata = metadata_raw or {}

        content = (request.data.get('content') or '').strip()

        if upload:
            max_bytes = getattr(settings, 'CHAT_UPLOAD_MAX_BYTES', 5 * 1024 * 1024)
            if upload.size > max_bytes:
                return Response({'error': 'File too large (max 5 MB)'}, status=status.HTTP_400_BAD_REQUEST)
            allowed = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx', '.txt'}
            ext = os.path.splitext(upload.name)[1].lower()
            if ext not in allowed:
                return Response({'error': 'File type not allowed'}, status=status.HTTP_400_BAD_REQUEST)

            message_type = MessageType.FILE
            metadata = {
                **metadata,
                'fileName': upload.name,
                'fileSize': upload.size,
                'mimeType': upload.content_type or 'application/octet-stream',
            }
            if not content:
                content = upload.name

        if message_type == MessageType.SESSION_PROPOSAL and not content:
            title = metadata.get('title', 'Study session')
            content = f'Session invite: {title}'

        if not content and not upload:
            return Response({'error': 'Message cannot be empty'}, status=status.HTTP_400_BAD_REQUEST)

        message = Message.objects.create(
            sender=request.user,
            recipient=recipient,
            message_type=message_type,
            content=content,
            attachment=upload if upload else None,
            metadata=json.dumps(metadata),
        )

        _notify_and_push(message, request.user, recipient)

        item = MessageSerializer(message, context={'request': request}).data
        item['sender'] = 'me'
        return Response(item, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='pin')
    def pin(self, request, pk=None):
        try:
            message = Message.objects.get(pk=pk)
        except Message.DoesNotExist:
            return Response({'error': 'Message not found'}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        if user.id not in [message.sender_id, message.recipient_id]:
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

        message.is_pinned = not message.is_pinned
        message.save(update_fields=['is_pinned'])
        item = MessageSerializer(message, context={'request': request}).data
        item['sender'] = 'me' if message.sender_id == user.id else 'buddy'
        return Response(item)

    @action(detail=False, methods=['post'], url_path='mark-read')
    def mark_read(self, request):
        buddy_id = request.data.get('buddyId') or request.data.get('buddy_id')
        message_ids = request.data.get('messageIds') or request.data.get('message_ids') or []
        if not buddy_id:
            return Response({'error': 'buddyId required'}, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()
        qs = Message.objects.filter(sender_id=buddy_id, recipient=request.user, read=False)
        if message_ids:
            qs = qs.filter(id__in=message_ids)
        updated = list(qs.values_list('id', flat=True))
        qs.update(read=True, read_at=now)

        try:
            from chat.realtime import push_read_receipt
            push_read_receipt(int(buddy_id), request.user.id, updated)
        except Exception:
            pass

        return Response({'success': True, 'messageIds': updated})
