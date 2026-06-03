from collections import defaultdict
from datetime import timedelta

from django.db.models import Q, Count
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from matches.models import Match, MatchStatus
from study_sessions.models import StudySession, SessionParticipant, SessionStatus


def _period_start(period, now):
    if period == 'week':
        return now - timedelta(days=7)
    if period == 'month':
        return now - timedelta(days=30)
    if period == 'year':
        return now - timedelta(days=365)
    return None


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_analytics(request):
    user = request.user
    now = timezone.now()
    period = request.query_params.get('period', 'all')
    period_start = _period_start(period, now)

    participant_ids = SessionParticipant.objects.filter(user=user).values_list('session_id', flat=True)
    sessions = StudySession.objects.filter(
        Q(creator=user) | Q(partner=user) | Q(id__in=participant_ids)
    ).distinct()

    completed = sessions.filter(status=SessionStatus.COMPLETED)
    if period_start:
        completed = completed.filter(scheduled_at__gte=period_start)

    total_sessions = completed.count()
    total_minutes = sum(
        (s.actual_duration_minutes or s.duration_minutes) for s in completed
    )
    total_hours = round(total_minutes / 60, 1)

    buddy_count = Match.objects.filter(
        Q(user1=user) | Q(user2=user),
        status=MatchStatus.ACCEPTED,
    ).count()

    completed_dates = sorted(
        {s.scheduled_at.date() for s in completed},
        reverse=True,
    )
    streak = 0
    expected = now.date()
    for day in completed_dates:
        if day == expected:
            streak += 1
            expected -= timedelta(days=1)
        elif day < expected:
            break

    monthly = defaultdict(int)
    for session in completed:
        key = session.scheduled_at.strftime('%b')
        monthly[key] += 1
    sessions_over_time = [{'month': m, 'sessions': monthly[m]} for m in monthly.keys()]

    subject_hours = defaultdict(float)
    for session in completed:
        minutes = session.actual_duration_minutes or session.duration_minutes
        subject_hours[session.course] += minutes / 60
    hours_by_subject = [
        {'subject': subject, 'hours': round(hours, 1)}
        for subject, hours in subject_hours.items()
    ]

    weekly_hours = defaultdict(float)
    for session in completed:
        week_label = session.scheduled_at.strftime('%a %d %b')
        minutes = session.actual_duration_minutes or session.duration_minutes
        weekly_hours[week_label] += minutes / 60
    weekly_study_hours = [
        {'week': label, 'hours': round(hours, 1)}
        for label, hours in sorted(weekly_hours.items(), key=lambda x: x[0])
    ][-8:]

    avg_duration = round(total_minutes / total_sessions, 1) if total_sessions else 0

    return Response({
        'totalSessions': total_sessions,
        'totalHours': total_hours,
        'buddyCount': buddy_count,
        'studyStreak': streak,
        'averageSessionDuration': avg_duration,
        'period': period,
        'sessionsOverTime': sessions_over_time or [
            {'month': now.strftime('%b'), 'sessions': 0}
        ],
        'hoursBySubject': hours_by_subject or [
            {'subject': 'No data', 'hours': 0}
        ],
        'weeklyStudyHours': weekly_study_hours or [
            {'week': 'No data', 'hours': 0}
        ],
    })
