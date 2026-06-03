import json
import secrets
from datetime import timedelta

from django.utils import timezone


RESET_EXPIRY_HOURS = 1


def _load_prefs(user):
    try:
        return json.loads(user.study_preferences or '{}')
    except (json.JSONDecodeError, TypeError):
        return {}


def _save_prefs(user, prefs):
    user.study_preferences = json.dumps(prefs)
    user.save(update_fields=['study_preferences'])


def create_password_reset_token(user):
    token = secrets.token_urlsafe(32)
    prefs = _load_prefs(user)
    prefs['passwordReset'] = {
        'token': token,
        'expires': (timezone.now() + timedelta(hours=RESET_EXPIRY_HOURS)).isoformat(),
    }
    _save_prefs(user, prefs)
    return token


def clear_password_reset_token(user):
    prefs = _load_prefs(user)
    prefs.pop('passwordReset', None)
    _save_prefs(user, prefs)


def find_user_by_reset_token(token):
    if not token:
        return None
    from .models import User

    for user in User.objects.filter(is_active=True):
        prefs = _load_prefs(user)
        reset = prefs.get('passwordReset') or {}
        if reset.get('token') != token:
            continue
        expires_raw = reset.get('expires')
        if not expires_raw:
            continue
        try:
            expires = timezone.datetime.fromisoformat(expires_raw.replace('Z', '+00:00'))
            if timezone.is_naive(expires):
                expires = timezone.make_aware(expires)
        except (ValueError, TypeError):
            continue
        if timezone.now() > expires:
            continue
        return user
    return None
