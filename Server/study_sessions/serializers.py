from datetime import datetime, timedelta

from django.db.models import Q
from django.utils import timezone
from rest_framework import serializers

from users.models import User
from .models import StudySession, SessionParticipant, SessionStatus
from .video import create_video_room


class SessionParticipantSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='user.id')
    name = serializers.SerializerMethodField()
    inviteStatus = serializers.CharField(source='invite_status')

    class Meta:
        model = SessionParticipant
        fields = ['id', 'name', 'role', 'inviteStatus']

    def get_name(self, obj):
        return obj.user.full_name or obj.user.username


class StudySessionSerializer(serializers.ModelSerializer):
    subject = serializers.CharField(source='course')
    date = serializers.SerializerMethodField()
    time = serializers.SerializerMethodField()
    duration = serializers.IntegerField(source='duration_minutes')
    status = serializers.SerializerMethodField()
    participants = serializers.SerializerMethodField()
    organizer = serializers.SerializerMethodField()
    participantCount = serializers.SerializerMethodField()
    myInviteStatus = serializers.SerializerMethodField()
    isOrganizer = serializers.SerializerMethodField()
    videoRoomUrl = serializers.URLField(source='video_room_url', read_only=True)
    recurrence = serializers.CharField(read_only=True)
    recurrenceCount = serializers.IntegerField(source='recurrence_count', read_only=True)
    startedAt = serializers.DateTimeField(source='started_at', read_only=True)
    endedAt = serializers.DateTimeField(source='ended_at', read_only=True)
    actualDuration = serializers.IntegerField(source='actual_duration_minutes', read_only=True)
    sessionFormat = serializers.SerializerMethodField()

    class Meta:
        model = StudySession
        fields = [
            'id', 'title', 'subject', 'description', 'location', 'sessionFormat',
            'date', 'time', 'duration', 'duration_minutes', 'max_participants',
            'status', 'participants', 'organizer', 'participantCount',
            'myInviteStatus', 'isOrganizer', 'videoRoomUrl',
            'recurrence', 'recurrenceCount', 'startedAt', 'endedAt', 'actualDuration',
            'scheduled_at', 'created_at', 'updated_at',
        ]

    def get_sessionFormat(self, obj):
        return 'in_person' if obj.location else 'online'

    def get_date(self, obj):
        return obj.scheduled_at.date().isoformat()

    def get_time(self, obj):
        return obj.scheduled_at.strftime('%H:%M')

    def get_status(self, obj):
        mapping = {
            SessionStatus.PENDING: 'upcoming',
            SessionStatus.SCHEDULED: 'upcoming',
            SessionStatus.COMPLETED: 'completed',
            SessionStatus.CANCELLED: 'cancelled',
        }
        return mapping.get(obj.status, 'upcoming')

    def get_participants(self, obj):
        records = obj.participant_records.select_related('user').all()
        return SessionParticipantSerializer(records, many=True).data

    def get_organizer(self, obj):
        return {
            'id': obj.creator_id,
            'name': obj.creator.full_name or obj.creator.username,
        }

    def get_participantCount(self, obj):
        return obj.participant_records.filter(
            invite_status__in=[
                SessionParticipant.STATUS_ACCEPTED,
                SessionParticipant.STATUS_INVITED,
            ]
        ).count()

    def _my_participant_record(self, obj):
        request = self.context.get('request')
        if not request:
            return None
        return obj.participant_records.filter(user=request.user).first()

    def get_myInviteStatus(self, obj):
        record = self._my_participant_record(obj)
        if not record:
            return None
        return record.invite_status

    def get_isOrganizer(self, obj):
        request = self.context.get('request')
        return bool(request and obj.creator_id == request.user.id)


class StudySessionCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200)
    subject = serializers.CharField(max_length=100)
    description = serializers.CharField(required=False, allow_blank=True, default='')
    location = serializers.CharField(required=False, allow_blank=True, default='')
    sessionFormat = serializers.ChoiceField(
        choices=['online', 'in_person'],
        required=False,
        default='online',
    )
    date = serializers.DateField()
    time = serializers.TimeField()
    duration = serializers.IntegerField(min_value=15)
    maxParticipants = serializers.IntegerField(required=False, default=5, min_value=2)
    invitedBuddies = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        default=list,
    )
    recurrence = serializers.ChoiceField(
        choices=['none', 'weekly', 'biweekly'],
        required=False,
        default='none',
    )
    recurrenceCount = serializers.IntegerField(required=False, default=0, min_value=0, max_value=12)

    def validate(self, attrs):
        session_format = attrs.pop('sessionFormat', 'online')
        if session_format == 'online':
            attrs['location'] = ''
        elif not attrs.get('location', '').strip():
            raise serializers.ValidationError({'location': 'Add a meeting place for in-person sessions.'})

        scheduled_at = datetime.combine(attrs['date'], attrs['time'])
        if timezone.is_naive(scheduled_at):
            scheduled_at = timezone.make_aware(scheduled_at)
        if scheduled_at <= timezone.now():
            raise serializers.ValidationError('Session date and time must be in the future.')
        attrs['scheduled_at'] = scheduled_at
        return attrs

    def _get_buddy_ids(self, user):
        from matches.models import Match, MatchStatus

        buddy_ids = set()
        matches = Match.objects.filter(
            Q(user1=user) | Q(user2=user),
            status=MatchStatus.ACCEPTED,
        )
        for match in matches:
            buddy_ids.add(match.user2_id if match.user1_id == user.id else match.user1_id)
        return buddy_ids

    def create(self, validated_data):
        request = self.context['request']
        invited_ids = validated_data.pop('invitedBuddies', []) or []
        duration = validated_data.pop('duration')
        validated_data.pop('date')
        validated_data.pop('time')
        max_participants = validated_data.pop('maxParticipants', 5)
        subject = validated_data.pop('subject')
        recurrence = validated_data.pop('recurrence', 'none')
        recurrence_count = validated_data.pop('recurrenceCount', 0)
        buddy_ids = self._get_buddy_ids(request.user)

        session = StudySession.objects.create(
            creator=request.user,
            course=subject,
            duration_minutes=duration,
            max_participants=max_participants,
            status=SessionStatus.PENDING,
            recurrence=recurrence,
            recurrence_count=recurrence_count,
            **validated_data,
        )

        SessionParticipant.objects.create(
            session=session,
            user=request.user,
            role=SessionParticipant.ROLE_ORGANIZER,
            invite_status=SessionParticipant.STATUS_ACCEPTED,
        )

        invited_added = []
        for buddy_id in invited_ids:
            buddy_id = int(buddy_id)
            if buddy_id in buddy_ids and buddy_id != request.user.id:
                participant, _ = SessionParticipant.objects.get_or_create(
                    session=session,
                    user_id=buddy_id,
                    defaults={
                        'role': SessionParticipant.ROLE_INVITEE,
                        'invite_status': SessionParticipant.STATUS_INVITED,
                    },
                )
                if participant.invite_status == SessionParticipant.STATUS_DECLINED:
                    participant.invite_status = SessionParticipant.STATUS_INVITED
                    participant.save(update_fields=['invite_status'])
                invited_added.append(buddy_id)
                try:
                    from notifications.services import create_notification
                    buddy = User.objects.get(id=buddy_id)
                    create_notification(
                        buddy,
                        'session_invite',
                        'Study Session Invitation',
                        f'{request.user.full_name or request.user.username} invited you to "{session.title}"',
                        '/sessions?tab=invitations',
                    )
                except Exception:
                    pass

        session.video_room_url = create_video_room(session)
        session.save(update_fields=['video_room_url'])

        self._create_recurring_sessions(
            session,
            {'recurrence': recurrence, 'recurrenceCount': recurrence_count},
            request,
            invited_ids,
            buddy_ids,
        )

        try:
            from .session_chat import notify_session_planned
            notify_session_planned(request.user, session, invited_added)
        except Exception:
            pass

        return session

    def _create_recurring_sessions(self, parent, validated_data, request, invited_ids, buddy_ids):
        recurrence = validated_data.get('recurrence', 'none')
        count = validated_data.get('recurrenceCount', 0) or 0
        if recurrence == 'none' or count <= 0:
            return

        delta = timedelta(weeks=2 if recurrence == 'biweekly' else 1)
        current_time = parent.scheduled_at

        for i in range(count):
            current_time = current_time + delta
            child = StudySession.objects.create(
                creator=request.user,
                course=parent.course,
                title=parent.title,
                description=parent.description,
                location=parent.location,
                scheduled_at=current_time,
                duration_minutes=parent.duration_minutes,
                max_participants=parent.max_participants,
                status=SessionStatus.PENDING,
                recurrence=recurrence,
                recurrence_count=0,
                parent_session=parent,
            )
            SessionParticipant.objects.create(
                session=child,
                user=request.user,
                role=SessionParticipant.ROLE_ORGANIZER,
                invite_status=SessionParticipant.STATUS_ACCEPTED,
            )
            for buddy_id in invited_ids:
                buddy_id = int(buddy_id)
                if buddy_id in buddy_ids and buddy_id != request.user.id:
                    SessionParticipant.objects.create(
                        session=child,
                        user_id=buddy_id,
                        role=SessionParticipant.ROLE_INVITEE,
                        invite_status=SessionParticipant.STATUS_INVITED,
                    )
            child.video_room_url = create_video_room(child)
            child.save(update_fields=['video_room_url'])
