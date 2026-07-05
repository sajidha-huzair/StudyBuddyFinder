from django.db import models
from users.models import User


class MessageType(models.TextChoices):
    TEXT = 'TEXT', 'Text'
    FILE = 'FILE', 'File'
    RECORDING = 'RECORDING', 'Recording'
    SESSION_PROPOSAL = 'SESSION_PROPOSAL', 'Session proposal'
    SYSTEM = 'SYSTEM', 'System'


class Message(models.Model):
    sender = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='sent_messages',
        db_column='sender_id',
    )
    recipient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='received_messages',
        db_column='recipient_id',
    )
    message_type = models.CharField(
        max_length=20,
        choices=MessageType.choices,
        default=MessageType.TEXT,
    )
    content = models.TextField()
    attachment = models.FileField(upload_to='chat/%Y/%m/', blank=True, null=True)
    metadata = models.TextField(default='{}', blank=True)
    is_pinned = models.BooleanField(default=False)
    read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'messages'
        ordering = ['created_at']

    def __str__(self):
        return f'{self.sender.username} -> {self.recipient.username}'


class ChatRoom(models.Model):
    ROOM_SESSION = 'session'
    ROOM_GROUP = 'group'
    ROOM_TYPES = [(ROOM_SESSION, 'Session'), (ROOM_GROUP, 'Group')]

    session = models.OneToOneField(
        'study_sessions.StudySession',
        on_delete=models.CASCADE,
        related_name='chat_room',
        null=True,
        blank=True,
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    icon = models.ImageField(upload_to='chat/rooms/icons/', blank=True, null=True)
    room_type = models.CharField(max_length=20, choices=ROOM_TYPES, default=ROOM_SESSION)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'chat_rooms'
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class ChatRoomMember(models.Model):
    room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name='members')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_room_memberships')
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'chat_room_members'
        unique_together = ['room', 'user']


class ChatRoomMessage(models.Model):
    room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='room_messages',
    )
    message_type = models.CharField(
        max_length=20,
        choices=MessageType.choices,
        default=MessageType.TEXT,
    )
    content = models.TextField()
    attachment = models.FileField(upload_to='chat/rooms/%Y/%m/', blank=True, null=True)
    metadata = models.TextField(default='{}', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'chat_room_messages'
        ordering = ['created_at']

    def __str__(self):
        sender = self.sender.username if self.sender else 'system'
        return f'{self.room.title}: {sender}'
