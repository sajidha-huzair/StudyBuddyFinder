from django.db import models
from users.models import User


class SessionStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    SCHEDULED = 'CONFIRMED', 'Scheduled'
    COMPLETED = 'COMPLETED', 'Completed'
    CANCELLED = 'CANCELLED', 'Cancelled'


class StudySession(models.Model):
    creator = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='created_sessions',
        db_column='creator_id',
    )
    partner = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='partner_sessions',
        db_column='partner_id',
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    course = models.CharField(max_length=100)
    location = models.CharField(max_length=200, blank=True, default='')
    video_room_url = models.URLField(max_length=500, blank=True, default='')
    recurrence = models.CharField(max_length=20, blank=True, default='none')
    recurrence_count = models.IntegerField(default=0)
    parent_session = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='recurring_instances',
        db_column='parent_session_id',
    )
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    actual_duration_minutes = models.IntegerField(null=True, blank=True)
    scheduled_at = models.DateTimeField()
    duration_minutes = models.IntegerField()
    max_participants = models.IntegerField(default=5)
    status = models.CharField(
        max_length=20,
        choices=SessionStatus.choices,
        default=SessionStatus.PENDING,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'study_sessions'
        ordering = ['-scheduled_at']

    def __str__(self):
        return f'{self.title} - {self.course}'


class SessionParticipant(models.Model):
    ROLE_ORGANIZER = 'organizer'
    ROLE_INVITEE = 'invitee'
    ROLE_CHOICES = [
        (ROLE_ORGANIZER, 'Organizer'),
        (ROLE_INVITEE, 'Invitee'),
    ]

    STATUS_INVITED = 'invited'
    STATUS_ACCEPTED = 'accepted'
    STATUS_DECLINED = 'declined'
    INVITE_STATUS_CHOICES = [
        (STATUS_INVITED, 'Invited'),
        (STATUS_ACCEPTED, 'Accepted'),
        (STATUS_DECLINED, 'Declined'),
    ]

    session = models.ForeignKey(
        StudySession,
        on_delete=models.CASCADE,
        related_name='participant_records',
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='session_participations',
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_INVITEE)
    invite_status = models.CharField(
        max_length=20,
        choices=INVITE_STATUS_CHOICES,
        default=STATUS_INVITED,
    )
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'session_participants'
        unique_together = ['session', 'user']

    def __str__(self):
        return f'{self.user.username} in {self.session.title}'


class SessionRecording(models.Model):
    session = models.ForeignKey(
        StudySession,
        on_delete=models.CASCADE,
        related_name='recordings',
    )
    daily_recording_id = models.CharField(max_length=120, unique=True, blank=True, default='')
    download_url = models.URLField(max_length=1000, blank=True, default='')
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    duration_seconds = models.IntegerField(default=0)
    status = models.CharField(max_length=30, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'session_recordings'
        ordering = ['-created_at']

    def __str__(self):
        return f'Recording for {self.session.title}'

