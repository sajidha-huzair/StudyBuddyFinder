import json

from channels.generic.websocket import AsyncJsonWebsocketConsumer


class ChatConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        user = self.scope.get('user')
        if not user or not user.is_authenticated:
            await self.close()
            return

        self.user_group = f'user_{user.id}'
        self.user_id = user.id
        await self.channel_layer.group_add(self.user_group, self.channel_name)
        await self.accept()
        await self.send_json({'type': 'connected', 'userId': user.id})

    async def disconnect(self, close_code):
        if hasattr(self, 'user_group'):
            await self.channel_layer.group_discard(self.user_group, self.channel_name)

    async def receive_json(self, content):
        event_type = content.get('type')
        if event_type == 'typing':
            recipient_id = content.get('recipientId')
            is_typing = bool(content.get('isTyping', True))
            if recipient_id and recipient_id != self.user_id:
                await self.channel_layer.group_send(
                    f'user_{recipient_id}',
                    {
                        'type': 'chat.message',
                        'message': {
                            'type': 'typing',
                            'data': {
                                'senderId': self.user_id,
                                'isTyping': is_typing,
                            },
                        },
                    },
                )

    async def chat_message(self, event):
        await self.send_json(event['message'])
