import secrets

from django.core.mail import send_mail
from django.conf import settings

from .models import ParentLink


def create_or_refresh_parent_link(student, parent_email):
    parent_email = (parent_email or '').strip().lower()
    if not parent_email:
        raise ValueError('Parent email is required')

    token = secrets.token_urlsafe(32)
    link, _ = ParentLink.objects.update_or_create(
        student=student,
        parent_email=parent_email,
        defaults={'access_token': token, 'is_verified': False},
    )
    student.parent_email = parent_email
    student.save(update_fields=['parent_email'])

    frontend = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173').rstrip('/')
    view_url = f'{frontend}/parent/{token}'

    try:
        send_mail(
            subject='Study Buddy Finder — Parent access link',
            message=(
                f'Hello,\n\n{student.full_name or student.username} added you as a parent/guardian '
                f'on Study Buddy Finder.\n\nView their study activity (read-only):\n{view_url}\n\n'
                'This link is private — do not share it.'
            ),
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@studybuddy.lk'),
            recipient_list=[parent_email],
            fail_silently=True,
        )
    except Exception:
        pass

    return link, view_url


def get_parent_dashboard_data(token):
    link = ParentLink.objects.select_related('student').filter(access_token=token).first()
    if not link:
        return None

    from study_sessions.models import StudySession, SessionSummary, SessionStatus
    from django.db.models import Q

    student = link.student
    sessions = StudySession.objects.filter(
        Q(creator=student) | Q(participant_records__user=student),
        status=SessionStatus.COMPLETED,
    ).distinct().order_by('-scheduled_at')[:20]

    recent_summaries = []
    for s in sessions[:10]:
        summary = getattr(s, 'summary', None)
        if summary:
            recent_summaries.append({
                'title': s.title,
                'subject': s.course,
                'date': s.scheduled_at.date().isoformat(),
                'summary': summary.summary_text[:300],
                'actionItems': summary.action_items,
            })

    return {
        'studentName': student.full_name or student.username,
        'grade': student.grade,
        'gradeBand': student.grade_band,
        'school': student.university,
        'examYear': student.exam_year,
        'completedSessions': sessions.count(),
        'recentSummaries': recent_summaries,
    }
