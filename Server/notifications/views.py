from rest_framework import viewsets, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Notification
from .serializers import NotificationSerializer


class NotificationViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = [IsAuthenticated]
    serializer_class = NotificationSerializer

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    @action(detail=True, methods=['put'], url_path='read')
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.read = True
        notification.save()
        return Response({'success': True})

    @action(detail=False, methods=['put'], url_path='read-all')
    def mark_all_read(self, request):
        self.get_queryset().update(read=True)
        return Response({'success': True, 'message': 'All notifications marked as read'})

    def destroy(self, request, *args, **kwargs):
        notification = self.get_object()
        notification.delete()
        return Response({'success': True, 'message': 'Notification deleted'})
