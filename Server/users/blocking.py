from django.db.models import Q

from users.models import BlockedUser


def get_blocked_user_ids(user):
    blocked_by_me = BlockedUser.objects.filter(blocker=user).values_list('blocked_id', flat=True)
    blocked_me = BlockedUser.objects.filter(blocked=user).values_list('blocker_id', flat=True)
    return set(blocked_by_me) | set(blocked_me)


def is_blocked(user_a, user_b):
    if user_a.id == user_b.id:
        return False
    return BlockedUser.objects.filter(
        Q(blocker=user_a, blocked=user_b) | Q(blocker=user_b, blocked=user_a)
    ).exists()


def users_are_blocked(user_a_id, user_b_id):
    return BlockedUser.objects.filter(
        Q(blocker_id=user_a_id, blocked_id=user_b_id) |
        Q(blocker_id=user_b_id, blocked_id=user_a_id)
    ).exists()
