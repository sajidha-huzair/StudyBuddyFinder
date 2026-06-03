from datetime import timedelta

from django.utils import timezone


class LastActiveMiddleware:

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        user = getattr(request, 'user', None)
        if user and getattr(user, 'is_authenticated', False):
            from users.models import User

            now = timezone.now()
            last = getattr(user, 'last_active_at', None)
            if last is None or (now - last) > timedelta(minutes=5):
                User.objects.filter(pk=user.pk).update(last_active_at=now)
        return response
