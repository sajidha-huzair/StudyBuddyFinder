from django.utils import timezone


def get_activity_status(last_active_at):
    if not last_active_at:
        return 'inactive'
    now = timezone.now()
    if timezone.is_naive(last_active_at):
        last_active_at = timezone.make_aware(last_active_at)
    delta = now - last_active_at
    if delta.total_seconds() < 86400:
        return 'today'
    if delta.days < 7:
        return 'week'
    return 'inactive'


def get_activity_label(status):
    return {
        'today': 'Active today',
        'week': 'Active this week',
        'inactive': 'Not recently active',
    }.get(status, '')
