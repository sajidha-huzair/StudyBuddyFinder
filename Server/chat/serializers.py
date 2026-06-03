import json

from rest_framework import serializers
from .models import Message, MessageType


def _parse_metadata(value):
    if not value:
        return {}
    if isinstance(value, dict):
        return value
    try:
        return json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return {}


class MessageSerializer(serializers.ModelSerializer):
    senderId = serializers.IntegerField(source='sender_id', read_only=True)
    recipientId = serializers.IntegerField(source='recipient_id', read_only=True)
    messageType = serializers.CharField(source='message_type', read_only=True)
    attachmentUrl = serializers.SerializerMethodField()
    metadata = serializers.SerializerMethodField()
    isPinned = serializers.BooleanField(source='is_pinned', read_only=True)
    readAt = serializers.DateTimeField(source='read_at', read_only=True)
    timestamp = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = Message
        fields = [
            'id', 'senderId', 'recipientId', 'messageType', 'content',
            'attachmentUrl', 'metadata', 'isPinned', 'read', 'readAt', 'timestamp',
        ]

    def get_attachmentUrl(self, obj):
        if not obj.attachment:
            return None
        request = self.context.get('request')
        url = obj.attachment.url
        if request:
            return request.build_absolute_uri(url)
        return url

    def get_metadata(self, obj):
        return _parse_metadata(obj.metadata)


class MessageCreateSerializer(serializers.Serializer):
    recipient_id = serializers.IntegerField()
    content = serializers.CharField(max_length=2000, required=False, allow_blank=True, default='')
    message_type = serializers.ChoiceField(
        choices=MessageType.choices,
        required=False,
        default=MessageType.TEXT,
    )
    metadata = serializers.JSONField(required=False, default=dict)
