import json
import mimetypes

from django.core.files.base import ContentFile
from django.db.models import Q

from chat.models import ChatRoom, ChatRoomMessage, Message, MessageType
from chat.group_chat import user_can_access_room
from matches.models import Match, MatchStatus
from users.models import User


def _are_buddies(user1, user2):
    return Match.objects.filter(
        Q(user1=user1, user2=user2) | Q(user1=user2, user2=user1),
        status=MatchStatus.ACCEPTED,
    ).exists()


def _read_vault_bytes(vault_file):
    if not vault_file.file:
        raise ValueError('File not found on server')
    with vault_file.file.open('rb') as src:
        return src.read()


def _file_meta(vault_file):
    filename = vault_file.file.name.split('/')[-1] if vault_file.file else vault_file.title
    mime, _ = mimetypes.guess_type(filename)
    return {
        'fileName': vault_file.title,
        'fileSize': vault_file.file_size,
        'mimeType': mime or 'application/octet-stream',
        'vaultFileId': vault_file.id,
        'subject': vault_file.subject,
        'sharedFromVault': True,
    }


def share_vault_file(vault_file, user, *, buddy_id=None, room_id=None, note=''):
    data = _read_vault_bytes(vault_file)
    filename = vault_file.file.name.split('/')[-1]
    content = (note or '').strip() or f'Shared from vault: {vault_file.title}'
    metadata = _file_meta(vault_file)

    if buddy_id:
        try:
            buddy = User.objects.get(pk=int(buddy_id))
        except (User.DoesNotExist, TypeError, ValueError):
            raise ValueError('Buddy not found')
        if not _are_buddies(user, buddy):
            raise ValueError('You can only share with connected study buddies')

        message = Message(
            sender=user,
            recipient=buddy,
            message_type=MessageType.FILE,
            content=content,
            metadata=json.dumps(metadata),
        )
        message.save()
        message.attachment.save(filename, ContentFile(data), save=True)

        try:
            from chat.views import _notify_and_push
            _notify_and_push(message, user, buddy)
        except Exception:
            pass

        return {'target': 'buddy', 'buddyId': buddy.id, 'messageId': message.id}

    if room_id:
        try:
            room = ChatRoom.objects.get(pk=int(room_id))
        except (ChatRoom.DoesNotExist, TypeError, ValueError):
            raise ValueError('Chat room not found')
        if not user_can_access_room(user, room):
            raise ValueError('You are not in this group chat')

        message = ChatRoomMessage(
            room=room,
            sender=user,
            message_type=MessageType.FILE,
            content=content,
            metadata=json.dumps(metadata),
        )
        message.save()
        message.attachment.save(filename, ContentFile(data), save=True)

        try:
            from chat.room_views import _push_room_message
            _push_room_message(room, message, user)
        except Exception:
            pass

        return {'target': 'room', 'roomId': room.id, 'messageId': message.id}

    raise ValueError('buddyId or roomId is required')
