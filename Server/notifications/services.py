import json

from notifications.models import Notification

PREFERENCE_KEYS = {
    'session_reminder': 'sessionReminders',
    'session_invite': 'sessionReminders',
    'match_recommendation': 'matchRecommendations',
}


def user_wants_notification(user, notification_type):
    if notification_type in (
        'buddy_request', 'buddy_accepted', 'buddy_rejected',
        'new_message', 'system',
    ):
        return True

    pref_key = PREFERENCE_KEYS.get(notification_type)
    if not pref_key:
        return True

    try:
        prefs = json.loads(user.study_preferences or '{}')
        notifications = prefs.get('notifications', {})
        return notifications.get(pref_key, True)
    except (TypeError, ValueError, AttributeError):
        return True


def create_notification(user, notification_type, title, message, link=''):
    if not user_wants_notification(user, notification_type):
        return None

    return Notification.objects.create(
        user=user,
        type=notification_type,
        title=title,
        message=message,
        link=link,
    )
