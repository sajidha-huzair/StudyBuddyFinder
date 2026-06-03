from django.db import models
from users.models import User


class ReportStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    REVIEWING = 'REVIEWING', 'Reviewing'
    RESOLVED = 'RESOLVED', 'Resolved'
    DISMISSED = 'DISMISSED', 'Dismissed'


class Report(models.Model):
    reporter = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='reports_made',
        db_column='reporter_id'
    )
    reported_user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='reports_received',
        db_column='reported_user_id'
    )
    
    reason = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    status = models.CharField(
        max_length=20,
        choices=ReportStatus.choices,
        default=ReportStatus.PENDING,
        null=True
    )
    
    admin_notes = models.TextField(blank=True, null=True)
    resolved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='resolved_reports',
        db_column='resolved_by'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True, null=True)
    
    class Meta:
        db_table = 'reports'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Report: {self.reporter.username} -> {self.reported_user.username}"

