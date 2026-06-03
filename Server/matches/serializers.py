from rest_framework import serializers
from .models import Match
from users.serializers import UserPublicSerializer


class MatchUserSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    email = serializers.EmailField()
    university = serializers.CharField(allow_null=True)
    major = serializers.CharField(allow_null=True)
    subjects = serializers.ListField(child=serializers.CharField())


def _user_to_request_dict(user):
    from users.serializers import UserSerializer
    data = UserSerializer(user).data
    return {
        'id': user.id,
        'name': user.full_name or user.username,
        'email': user.email,
        'university': user.university,
        'major': user.major,
        'subjects': data.get('subjects', []),
    }


class RecommendationSerializer(serializers.Serializer):
    id = serializers.IntegerField(source='user.id')
    name = serializers.SerializerMethodField()
    email = serializers.EmailField(source='user.email')
    university = serializers.CharField(source='user.university', allow_null=True)
    major = serializers.CharField(source='user.major', allow_null=True)
    year = serializers.CharField(source='user.year', allow_null=True)
    bio = serializers.CharField(source='user.bio', allow_null=True)
    educationLevel = serializers.CharField(source='user.education_level', allow_null=True)
    subjects = serializers.SerializerMethodField()
    strengths = serializers.SerializerMethodField()
    weaknesses = serializers.SerializerMethodField()
    learningStyle = serializers.SerializerMethodField()
    studyGoals = serializers.SerializerMethodField()
    compatibilityScore = serializers.FloatField(source='compatibility_score')
    matchReasons = serializers.SerializerMethodField()
    matchBreakdown = serializers.SerializerMethodField()
    sharedAvailability = serializers.SerializerMethodField()
    overlapCount = serializers.SerializerMethodField()
    lastActiveAt = serializers.DateTimeField(source='user.last_active_at', allow_null=True)
    activityStatus = serializers.SerializerMethodField()
    isBookmarked = serializers.SerializerMethodField()
    isVerified = serializers.BooleanField(source='user.is_verified', read_only=True)

    def get_name(self, obj):
        user = obj['user']
        return user.full_name or user.username

    def get_subjects(self, obj):
        return obj['profile'].get('subjects', [])

    def get_strengths(self, obj):
        return obj['profile'].get('strengths', [])

    def get_weaknesses(self, obj):
        return obj['profile'].get('weaknesses', [])

    def get_learningStyle(self, obj):
        return obj['profile'].get('learning_style', '')

    def get_studyGoals(self, obj):
        return obj['profile'].get('study_goals', [])

    def get_matchReasons(self, obj):
        return obj.get('match_detail', {}).get('reasons', [])

    def get_matchBreakdown(self, obj):
        return obj.get('match_detail', {}).get('breakdown', {})

    def get_sharedAvailability(self, obj):
        from study_sessions.availability_utils import get_shared_availability
        request = self.context.get('request')
        if not request:
            return {'slots': {}, 'overlapCount': 0, 'summaryDays': []}
        return get_shared_availability(request.user, obj['user'])

    def get_overlapCount(self, obj):
        return self.get_sharedAvailability(obj).get('overlapCount', 0)

    def get_activityStatus(self, obj):
        from users.activity import get_activity_status
        return get_activity_status(obj['user'].last_active_at)

    def get_isBookmarked(self, obj):
        request = self.context.get('request')
        if not request:
            return False
        from users.bookmarks import is_bookmarked
        return is_bookmarked(request.user, obj['user'].id)


class MatchRequestSerializer(serializers.ModelSerializer):
    sender = serializers.SerializerMethodField()
    recipient = serializers.SerializerMethodField()
    message = serializers.CharField(allow_blank=True, default='')
    createdAt = serializers.DateTimeField(source='created_at')
    is_incoming = serializers.SerializerMethodField()

    class Meta:
        model = Match
        fields = ['id', 'sender', 'recipient', 'message', 'status', 'createdAt', 'is_incoming', 'compatibility_score']

    def get_sender(self, obj):
        return _user_to_request_dict(obj.user1)

    def get_recipient(self, obj):
        return _user_to_request_dict(obj.user2)

    def get_is_incoming(self, obj):
        request = self.context.get('request')
        if request:
            return obj.user2_id == request.user.id
        return False


class StudyBuddySerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    name = serializers.SerializerMethodField()
    email = serializers.SerializerMethodField()
    university = serializers.SerializerMethodField()
    major = serializers.SerializerMethodField()
    subjects = serializers.SerializerMethodField()
    sharedSubjects = serializers.SerializerMethodField()
    connectedSince = serializers.DateTimeField(source='updated_at')
    compatibilityScore = serializers.FloatField(source='compatibility_score')
    isVerified = serializers.SerializerMethodField()
    avatarUrl = serializers.SerializerMethodField()

    class Meta:
        model = Match
        fields = [
            'id', 'name', 'email', 'university', 'major', 'subjects',
            'sharedSubjects', 'connectedSince', 'compatibilityScore',
            'isVerified', 'avatarUrl',
        ]

    def _get_buddy_user(self, obj):
        request = self.context.get('request')
        if request and obj.user1_id == request.user.id:
            return obj.user2
        return obj.user1

    def get_id(self, obj):
        return self._get_buddy_user(obj).id

    def get_name(self, obj):
        buddy = self._get_buddy_user(obj)
        return buddy.full_name or buddy.username

    def get_email(self, obj):
        return self._get_buddy_user(obj).email

    def get_university(self, obj):
        return self._get_buddy_user(obj).university

    def get_major(self, obj):
        return self._get_buddy_user(obj).major

    def get_subjects(self, obj):
        from users.serializers import UserSerializer
        buddy = self._get_buddy_user(obj)
        return UserSerializer(buddy).data.get('subjects', [])

    def get_sharedSubjects(self, obj):
        request = self.context.get('request')
        if not request:
            return []
        from users.serializers import UserSerializer
        my_subjects = set(UserSerializer(request.user).data.get('subjects', []))
        buddy_subjects = set(self.get_subjects(obj))
        return list(my_subjects & buddy_subjects)

    def get_isVerified(self, obj):
        return self._get_buddy_user(obj).is_verified

    def get_avatarUrl(self, obj):
        buddy = self._get_buddy_user(obj)
        if not buddy.avatar:
            return None
        request = self.context.get('request')
        url = buddy.avatar.url
        if request:
            return request.build_absolute_uri(url)
        return url


class MatchSerializer(serializers.ModelSerializer):
    user1_details = UserPublicSerializer(source='user1', read_only=True)
    user2_details = UserPublicSerializer(source='user2', read_only=True)
    is_incoming = serializers.SerializerMethodField()

    class Meta:
        model = Match
        fields = [
            'id', 'user1', 'user2', 'user1_details', 'user2_details',
            'compatibility_score', 'message', 'status', 'created_at', 'updated_at',
            'is_incoming'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_is_incoming(self, obj):
        request = self.context.get('request')
        if request:
            return obj.user2_id == request.user.id
        return False


class MatchCreateSerializer(serializers.ModelSerializer):
    message = serializers.CharField(required=False, allow_blank=True, default='')

    class Meta:
        model = Match
        fields = ['user2', 'compatibility_score', 'message']

    def validate_user2(self, value):
        request = self.context['request']
        if value.id == request.user.id:
            raise serializers.ValidationError('Cannot send a request to yourself.')
        return value

    def validate(self, attrs):
        from django.db.models import Q
        from .models import MatchStatus

        request = self.context['request']
        user2 = attrs['user2']

        existing = Match.objects.filter(
            Q(user1=request.user, user2=user2) | Q(user1=user2, user2=request.user)
        ).exclude(status=MatchStatus.REJECTED).exists()

        if existing:
            raise serializers.ValidationError('A request already exists between these users.')

        return attrs
