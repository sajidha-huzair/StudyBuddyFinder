from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Match, MatchStatus
from .serializers import (
    MatchSerializer,
    MatchCreateSerializer,
    RecommendationSerializer,
    MatchRequestSerializer,
    StudyBuddySerializer,
)
from .matching import calculate_compatibility, get_recommendations, get_bookmarked_recommendations
from users.blocking import is_blocked, get_blocked_user_ids


def _create_notification(user, notification_type, title, message, link=''):
    try:
        from notifications.services import create_notification
        create_notification(user, notification_type, title, message, link)
    except Exception:
        pass


class MatchViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = MatchSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = Match.objects.all() if user.role == 'ADMIN' else Match.objects.filter(
            Q(user1=user) | Q(user2=user)
        )

        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter.upper())

        return queryset.select_related('user1', 'user2')

    def get_serializer_class(self):
        if self.action == 'create':
            return MatchCreateSerializer
        if self.action == 'recommendations':
            return RecommendationSerializer
        if self.action in ('incoming_requests', 'sent_requests'):
            return MatchRequestSerializer
        if self.action == 'study_buddies':
            return StudyBuddySerializer
        return MatchSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = MatchSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)

    def create(self, request):
        serializer = MatchCreateSerializer(data=request.data, context={'request': request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user2 = serializer.validated_data['user2']
        if is_blocked(request.user, user2):
            return Response({'error': 'Cannot send request to this user'}, status=status.HTTP_403_FORBIDDEN)

        compatibility = serializer.validated_data.get('compatibility_score')
        if compatibility is None:
            compatibility = calculate_compatibility(request.user, user2)

        match = serializer.save(
            user1=request.user,
            compatibility_score=compatibility,
            status=MatchStatus.PENDING,
        )

        _create_notification(
            user2,
            'buddy_request',
            'New Study Buddy Request',
            f'{request.user.full_name or request.user.username} sent you a study buddy request',
            '/requests',
        )

        return Response(MatchSerializer(match, context={'request': request}).data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        match = self.get_object()
        if request.user not in [match.user1, match.user2]:
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        if match.status == MatchStatus.ACCEPTED:
            return Response({'error': 'Cannot cancel an accepted match'}, status=status.HTTP_400_BAD_REQUEST)
        match.delete()
        return Response({'success': True, 'message': 'Request cancelled.'})

    @action(detail=False, methods=['get'])
    def recommendations(self, request):
        subject = request.query_params.get('subject', '')
        education_level = request.query_params.get('education_level', '')
        university = request.query_params.get('university', '')
        search = request.query_params.get('search', '')
        min_score = float(request.query_params.get('minCompatibility', 0))
        learning_style = request.query_params.get('learningStyle', '')
        sort = request.query_params.get('sort', 'compatibility')

        results = get_recommendations(
            request.user,
            subject=subject or None,
            education_level=education_level or None,
            university=university or None,
            search=search or None,
            min_score=min_score,
            learning_style=learning_style or None,
            sort=sort or 'compatibility',
        )
        serializer = RecommendationSerializer(results, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get', 'post'])
    def bookmarks(self, request):
        from users.bookmarks import toggle_bookmark, get_bookmark_ids

        if request.method == 'POST':
            user_id = request.data.get('userId') or request.data.get('user_id')
            if not user_id:
                return Response({'error': 'userId is required'}, status=status.HTTP_400_BAD_REQUEST)
            try:
                bookmarked, bookmark_ids = toggle_bookmark(request.user, user_id)
            except ValueError as exc:
                return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
            return Response({
                'bookmarked': bookmarked,
                'bookmarkIds': bookmark_ids,
            })

        subject = request.query_params.get('subject', '')
        education_level = request.query_params.get('education_level', '')
        university = request.query_params.get('university', '')
        search = request.query_params.get('search', '')
        min_score = float(request.query_params.get('minCompatibility', 0))
        learning_style = request.query_params.get('learningStyle', '')
        sort = request.query_params.get('sort', 'compatibility')

        results = get_bookmarked_recommendations(
            request.user,
            subject=subject or None,
            education_level=education_level or None,
            university=university or None,
            search=search or None,
            min_score=min_score,
            learning_style=learning_style or None,
            sort=sort or 'compatibility',
        )
        serializer = RecommendationSerializer(results, many=True, context={'request': request})
        return Response({
            'bookmarks': serializer.data,
            'bookmarkIds': get_bookmark_ids(request.user),
        })

    @action(detail=False, methods=['get'])
    def incoming_requests(self, request):
        queryset = Match.objects.filter(user2=request.user, status=MatchStatus.PENDING)
        serializer = MatchRequestSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def sent_requests(self, request):
        queryset = Match.objects.filter(user1=request.user, status=MatchStatus.PENDING)
        serializer = MatchRequestSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def study_buddies(self, request):
        blocked_ids = get_blocked_user_ids(request.user)
        queryset = Match.objects.filter(
            Q(user1=request.user) | Q(user2=request.user),
            status=MatchStatus.ACCEPTED,
        )
        serializer = StudyBuddySerializer(queryset, many=True, context={'request': request})
        buddies = [
            buddy for buddy in serializer.data
            if buddy.get('id') not in blocked_ids
        ]
        return Response(buddies)

    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        match = self.get_object()

        if request.user != match.user2:
            return Response({'error': 'Only the recipient can accept this request'}, status=status.HTTP_403_FORBIDDEN)

        match.status = MatchStatus.ACCEPTED
        match.save()

        _create_notification(
            match.user1,
            'buddy_accepted',
            'Request Accepted',
            f'{request.user.full_name or request.user.username} accepted your study buddy request',
            '/matches',
        )

        return Response({'success': True, 'message': 'Request accepted! New study buddy added.', 'match': MatchSerializer(match, context={'request': request}).data})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        match = self.get_object()

        if request.user != match.user2:
            return Response({'error': 'Only the recipient can reject this request'}, status=status.HTTP_403_FORBIDDEN)

        match.status = MatchStatus.REJECTED
        match.save()

        _create_notification(
            match.user1,
            'buddy_rejected',
            'Request Declined',
            f'{request.user.full_name or request.user.username} declined your study buddy request',
            '/requests',
        )

        return Response({'success': True, 'message': 'Request rejected.'})
