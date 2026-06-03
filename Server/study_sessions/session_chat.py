import json

from chat.models import Message, MessageType


def notify_session_planned(creator, session, buddy_ids):
    if not buddy_ids:
        return

    date_str = session.scheduled_at.date().isoformat()
    time_str = session.scheduled_at.strftime('%H:%M')
    session_format = 'in_person' if session.location else 'online'

    for buddy_id in buddy_ids:
        if buddy_id == creator.id:
            continue
        metadata = {
            'sessionId': session.id,
            'title': session.title,
            'subject': session.course,
            'course': session.course,
            'date': date_str,
            'time': time_str,
            'sessionFormat': session_format,
            'location': session.location or '',
            'duration': session.duration_minutes,
        }
        content = f'Session planned: {session.title} · {date_str} {time_str}'

        message = Message.objects.create(
            sender=creator,
            recipient_id=buddy_id,
            message_type=MessageType.SESSION_PROPOSAL,
            content=content,
            metadata=json.dumps(metadata),
        )

        try:
            from chat.realtime import push_chat_message
            from chat.serializers import MessageSerializer

            item = MessageSerializer(message).data
            item['sender'] = 'buddy'
            push_chat_message(buddy_id, item)
        except Exception:
            pass

        try:
            from notifications.services import create_notification
            from users.models import User
            buddy = User.objects.get(id=buddy_id)
            create_notification(
                buddy,
                'new_message',
                'Session planned',
                content,
                f'/chat/{creator.id}',
            )
        except Exception:
            pass
