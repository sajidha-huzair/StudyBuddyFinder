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
