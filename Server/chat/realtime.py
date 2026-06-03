from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


def push_chat_message(recipient_id, message_data):
    push_event(recipient_id, {'type': 'new_message', 'data': message_data})


def push_typing(recipient_id, sender_id, is_typing):
    push_event(recipient_id, {
        'type': 'typing',
        'data': {'senderId': sender_id, 'isTyping': is_typing},
    })


def push_read_receipt(recipient_id, buddy_id, message_ids):
    push_event(recipient_id, {
        'type': 'read_receipt',
        'data': {'buddyId': buddy_id, 'messageIds': message_ids},
    })


def push_event(recipient_id, payload):
    channel_layer = get_channel_layer()
    if not channel_layer:
        return

    async_to_sync(channel_layer.group_send)(
        f'user_{recipient_id}',
        {
            'type': 'chat.message',
            'message': payload,
        },
    )
