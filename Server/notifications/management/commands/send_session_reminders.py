from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from notifications.models import Notification
from notifications.services import create_notification
from study_sessions.models import SessionParticipant, SessionStatus, StudySession


class Command(BaseCommand):
    help = 'Send session reminder notifications for sessions starting in ~1 hour'

    def handle(self, *args, **options):
        now = timezone.now()
        window_start = now + timedelta(minutes=55)
        window_end = now + timedelta(minutes=65)

        sessions = StudySession.objects.filter(
            scheduled_at__gte=window_start,
            scheduled_at__lte=window_end,
            status__in=[SessionStatus.PENDING, SessionStatus.SCHEDULED],
        ).prefetch_related('participant_records__user')

        sent_count = 0
        for session in sessions:
            reminder_link = f'/sessions?reminder={session.id}'
            participants = session.participant_records.filter(
                invite_status__in=[
                    SessionParticipant.STATUS_ACCEPTED,
                    SessionParticipant.STATUS_INVITED,
                ],
            ).select_related('user')

            for participant in participants:
                user = participant.user
                already_sent = Notification.objects.filter(
                    user=user,
                    type='session_reminder',
                    link=reminder_link,
                ).exists()
                if already_sent:
                    continue

                notification = create_notification(
                    user,
                    'session_reminder',
                    'Session Starting Soon',
                    f'Your session "{session.title}" starts in about 1 hour.',
                    reminder_link,
                )
                if notification:
                    sent_count += 1

        self.stdout.write(self.style.SUCCESS(f'Sent {sent_count} session reminder(s)'))
