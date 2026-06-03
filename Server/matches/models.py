from django.db import models
from users.models import User


class MatchStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    ACCEPTED = 'ACCEPTED', 'Accepted'
    REJECTED = 'REJECTED', 'Rejected'


class Match(models.Model):
    user1 = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='matches_as_user1',
        db_column='user1_id'
    )
    user2 = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='matches_as_user2',
        db_column='user2_id'
    )
    
    compatibility_score = models.FloatField(null=True, blank=True)
    message = models.TextField(blank=True, null=True)
    status = models.CharField(
        max_length=20,
        choices=MatchStatus.choices,
        default=MatchStatus.PENDING,
        null=True
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True, null=True)
    
    class Meta:
        db_table = 'matches'
        unique_together = ['user1', 'user2']
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Match: {self.user1.username} - {self.user2.username}"

