import json
from datetime import datetime

WEEKDAY_KEYS = [
    'monday', 'tuesday', 'wednesday', 'thursday',
    'friday', 'saturday', 'sunday',
]


def _parse_availability(user):
    raw = user.availability
    if not raw:
        return {}
    if isinstance(raw, str):
        try:
            return json.loads(raw)
        except (json.JSONDecodeError, TypeError):
            return {}
    if isinstance(raw, dict):
        return raw
    return {}


def is_user_available_at(user, scheduled_at):
    availability = _parse_availability(user)
    if not availability:
        return True

    day_key = WEEKDAY_KEYS[scheduled_at.weekday()]
    time_key = scheduled_at.strftime('%H:%M')
    slots = availability.get(day_key, [])
    return time_key in slots


def get_shared_availability(user_a, user_b):
    avail_a = _parse_availability(user_a)
    avail_b = _parse_availability(user_b)

    if not avail_a or not avail_b:
        return {'slots': {}, 'overlapCount': 0, 'summaryDays': []}

    shared = {}
    total = 0
    summary_days = []
    day_labels = {
        'monday': 'Mon', 'tuesday': 'Tue', 'wednesday': 'Wed',
        'thursday': 'Thu', 'friday': 'Fri', 'saturday': 'Sat', 'sunday': 'Sun',
    }

    for day in WEEKDAY_KEYS:
        slots_a = set(avail_a.get(day, []) or [])
        slots_b = set(avail_b.get(day, []) or [])
        overlap = sorted(slots_a & slots_b)
        if overlap:
            shared[day] = overlap
            total += len(overlap)
            summary_days.append(day_labels[day])

    return {
        'slots': shared,
        'overlapCount': total,
        'summaryDays': summary_days,
    }


def get_availability_conflicts(buddy_ids, date_str, time_str):
    from users.models import User

    if not date_str or not time_str or not buddy_ids:
        return []

    try:
        scheduled_at = datetime.strptime(f'{date_str} {time_str}', '%Y-%m-%d %H:%M')
    except ValueError:
        return []

    conflicts = []
    buddies = User.objects.filter(id__in=buddy_ids)
    for buddy in buddies:
        if not is_user_available_at(buddy, scheduled_at):
            conflicts.append({
                'id': buddy.id,
                'name': buddy.full_name or buddy.username,
            })
    return conflicts
