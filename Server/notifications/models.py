from django.db import models
from users.models import User


class Notification(models.Model):
    TYPE_CHOICES = [
        ('buddy_request', 'Buddy Request'),
        ('buddy_accepted', 'Buddy Accepted'),
        ('buddy_rejected', 'Buddy Rejected'),
        ('session_invite', 'Session Invite'),
        ('session_reminder', 'Session Reminder'),
        ('new_message', 'New Message'),
        ('system', 'System'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    type = models.CharField(max_length=50, choices=TYPE_CHOICES)
    title = models.CharField(max_length=255)
    message = models.TextField()
    link = models.CharField(max_length=255, blank=True, default='')
    read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.title} -> {self.user.username}'
