from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from users.models import User
from .models import Report, ReportStatus
from .serializers import ReportSerializer, ReportCreateSerializer


class ReportViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ReportSerializer
    http_method_names = ['get', 'post', 'head', 'options']

    def get_queryset(self):
        user = self.request.user
        queryset = Report.objects.all() if user.role == 'ADMIN' else Report.objects.filter(reporter=user)

        status_filter = self.request.query_params.get('status', '').upper()
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        return queryset.select_related('reporter', 'reported_user', 'resolved_by')

    def create(self, request):
        serializer = ReportCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        if int(request.data.get('reported_user', 0)) == request.user.id:
            return Response({'error': 'You cannot report yourself'}, status=status.HTTP_400_BAD_REQUEST)

        reported_user_id = serializer.validated_data['reported_user'].id
        if Report.objects.filter(
            reporter=request.user,
            reported_user_id=reported_user_id,
            status__in=[ReportStatus.PENDING, ReportStatus.REVIEWING],
        ).exists():
            return Response(
                {'error': 'You already have a pending report for this user'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        report = serializer.save(reporter=request.user)

        try:
            from notifications.services import create_notification
            reporter_name = request.user.full_name or request.user.username
            reported_name = report.reported_user.full_name or report.reported_user.username
            for admin in User.objects.filter(role='ADMIN', is_active=True):
                create_notification(
                    admin,
                    'system',
                    'New User Report',
                    f'{reporter_name} reported {reported_name} for {report.reason}',
                    '/admin/reports',
                )
        except Exception:
            pass

        return Response(
            ReportSerializer(report).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        if request.user.role != 'ADMIN':
            return Response(
                {'error': 'Admin access required'},
                status=status.HTTP_403_FORBIDDEN
            )

        report = self.get_object()
        resolution = request.data.get('resolution', 'resolved').lower()
        report.status = ReportStatus.DISMISSED if resolution == 'dismissed' else ReportStatus.RESOLVED
        report.resolved_by = request.user
        report.admin_notes = request.data.get('admin_notes', '')
        report.save()
        return Response(ReportSerializer(report).data)
