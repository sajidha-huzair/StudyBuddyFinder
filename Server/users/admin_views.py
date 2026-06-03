from datetime import timedelta

from django.db.models import Q, Count
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from matches.models import Match, MatchStatus
from reports.models import Report, ReportStatus
from study_sessions.models import StudySession, SessionParticipant, SessionStatus
from users.models import User


def _require_admin(user):
    return user.role == 'ADMIN'


def _weekly_session_counts(now):
    week_start = now - timedelta(days=6)
    day_labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    weekly_sessions = []
    for i in range(7):
        day = (week_start + timedelta(days=i)).date()
        count = StudySession.objects.filter(scheduled_at__date=day).count()
        weekly_sessions.append({'day': day_labels[day.weekday()], 'sessions': count})
    return weekly_sessions


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_stats(request):
    if not _require_admin(request.user):
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

    now = timezone.now()
    week_ago = now - timedelta(days=7)

    active_users = User.objects.filter(
        Q(last_login__gte=week_ago) |
        Q(created_sessions__created_at__gte=week_ago) |
        Q(session_participations__joined_at__gte=week_ago)
    ).distinct().count()

    total_users = User.objects.count()
    total_sessions = StudySession.objects.count()
    total_matches = Match.objects.count()
    accepted_matches = Match.objects.filter(status=MatchStatus.ACCEPTED).count()
    pending_reports = Report.objects.filter(status=ReportStatus.PENDING).count()
    pending_match_requests = Match.objects.filter(status=MatchStatus.PENDING).count()
    completed_sessions = StudySession.objects.filter(status=SessionStatus.COMPLETED).count()

    recent_users = []
    for user in User.objects.order_by('-created_at')[:5]:
        recent_users.append({
            'id': user.id,
            'name': user.full_name or user.username,
            'email': user.email,
            'role': user.role,
            'status': 'active' if user.is_active else 'inactive',
            'createdAt': user.created_at.isoformat() if user.created_at else None,
        })

    recent_reports = []
    for report in Report.objects.select_related('reporter', 'reported_user').order_by('-created_at')[:5]:
        recent_reports.append({
            'id': report.id,
            'reporter': report.reporter.full_name or report.reporter.username,
            'reported': report.reported_user.full_name or report.reported_user.username,
            'reason': report.reason,
            'status': (report.status or ReportStatus.PENDING).lower(),
            'createdAt': report.created_at.isoformat() if report.created_at else None,
        })

    upcoming_sessions = []
    for session in StudySession.objects.select_related('creator').filter(
        scheduled_at__gte=now,
    ).order_by('scheduled_at')[:5]:
        upcoming_sessions.append({
            'id': session.id,
            'title': session.title,
            'course': session.course,
            'scheduledAt': session.scheduled_at.isoformat(),
            'status': session.status,
            'creator': session.creator.full_name or session.creator.username,
        })

    return Response({
        'totalUsers': total_users,
        'activeUsers': active_users,
        'totalSessions': total_sessions,
        'completedSessions': completed_sessions,
        'pendingReports': pending_reports,
        'totalMatches': accepted_matches,
        'pendingMatchRequests': pending_match_requests,
        'newUsersThisWeek': User.objects.filter(created_at__gte=week_ago).count(),
        'studentUsers': User.objects.filter(role='STUDENT').count(),
        'matchSuccessRate': round((accepted_matches / total_matches) * 100) if total_matches else 0,
        'weeklySessions': _weekly_session_counts(now),
        'recentUsers': recent_users,
        'recentReports': recent_reports,
        'upcomingSessions': upcoming_sessions,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_users(request):
    if not _require_admin(request.user):
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

    search = request.query_params.get('search', '').strip()
    users = User.objects.all().order_by('-created_at')
    if search:
        users = users.filter(
            Q(full_name__icontains=search) |
            Q(email__icontains=search) |
            Q(username__icontains=search)
        )

    data = []
    for user in users[:100]:
        session_count = SessionParticipant.objects.filter(user=user).count()
        data.append({
            'id': user.id,
            'name': user.full_name or user.username,
            'email': user.email,
            'role': user.role,
            'status': 'active' if user.is_active else 'inactive',
            'sessions': session_count,
            'educationLevel': user.education_level,
            'createdAt': user.created_at.isoformat() if user.created_at else None,
        })
    return Response(data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_toggle_user(request, user_id):
    if not _require_admin(request.user):
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

    if request.user.id == user_id:
        return Response({'error': 'You cannot deactivate your own account'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    if user.role == 'ADMIN':
        return Response({'error': 'Cannot deactivate admin accounts'}, status=status.HTTP_400_BAD_REQUEST)

    user.is_active = not user.is_active
    user.save(update_fields=['is_active'])
    return Response({
        'success': True,
        'status': 'active' if user.is_active else 'inactive',
    })


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def admin_delete_user(request, user_id):
    if not _require_admin(request.user):
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

    if request.user.id == user_id:
        return Response({'error': 'You cannot delete your own account'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    if user.role == 'ADMIN':
        return Response({'error': 'Cannot delete admin accounts'}, status=status.HTTP_400_BAD_REQUEST)

    user.delete()
    return Response({'success': True, 'message': 'User deleted'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_system_stats(request):
    if not _require_admin(request.user):
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

    now = timezone.now()
    user_growth = []
    for i in range(5, -1, -1):
        month_start = (now.replace(day=1) - timedelta(days=i * 30)).replace(day=1)
        month_end = (month_start + timedelta(days=32)).replace(day=1)
        user_growth.append({
            'month': month_start.strftime('%b'),
            'users': User.objects.filter(created_at__lt=month_end).count(),
        })

    weekly_sessions = _weekly_session_counts(now)

    subject_counts = (
        StudySession.objects.values('course')
        .annotate(count=Count('id'))
        .order_by('-count')[:6]
    )
    subject_distribution = [
        {'name': item['course'] or 'Other', 'value': item['count']}
        for item in subject_counts
    ] or [{'name': 'No data', 'value': 1}]

    total_users = User.objects.count()
    total_sessions = StudySession.objects.count()
    total_matches = Match.objects.count()
    accepted_matches = Match.objects.filter(status=MatchStatus.ACCEPTED).count()
    completed_sessions = StudySession.objects.filter(status=SessionStatus.COMPLETED)
    completed_count = completed_sessions.count()
    total_minutes = sum(s.duration_minutes for s in completed_sessions)

    return Response({
        'userGrowth': user_growth,
        'weeklySessions': weekly_sessions,
        'subjectDistribution': subject_distribution,
        'keyMetrics': {
            'avgSessionsPerUser': round(total_sessions / total_users, 1) if total_users else 0,
            'matchSuccessRate': round((accepted_matches / total_matches) * 100) if total_matches else 0,
            'avgSessionDuration': round((total_minutes / completed_count) / 60, 1) if completed_count else 0,
            'pendingReports': Report.objects.filter(status=ReportStatus.PENDING).count(),
        },
    })
