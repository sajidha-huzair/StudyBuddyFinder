import json

from .models import User


def _load_prefs(user):
    try:
        return json.loads(user.study_preferences or '{}')
    except (json.JSONDecodeError, TypeError):
        return {}


def _save_prefs(user, prefs):
    user.study_preferences = json.dumps(prefs)
    user.save(update_fields=['study_preferences'])


def get_bookmark_ids(user):
    return _load_prefs(user).get('bookmarks', [])


def is_bookmarked(user, target_user_id):
    return int(target_user_id) in [int(i) for i in get_bookmark_ids(user)]


def toggle_bookmark(user, target_user_id):
    target_user_id = int(target_user_id)
    if target_user_id == user.id:
        raise ValueError('Cannot bookmark yourself')

    if not User.objects.filter(id=target_user_id, is_active=True, role='STUDENT').exists():
        raise ValueError('User not found')

    prefs = _load_prefs(user)
    bookmarks = [int(i) for i in prefs.get('bookmarks', [])]
    if target_user_id in bookmarks:
        bookmarks.remove(target_user_id)
        bookmarked = False
    else:
        bookmarks.append(target_user_id)
        bookmarked = True
    prefs['bookmarks'] = bookmarks
    _save_prefs(user, prefs)
    return bookmarked, bookmarks
