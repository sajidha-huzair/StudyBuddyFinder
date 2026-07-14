from django.db.models import Q
from django.utils import timezone
from django.http import FileResponse
import mimetypes
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from .models import StudySession, SessionParticipant, SessionStatus, SessionAgenda, SessionNote, SessionSummary, SubjectVaultFile
from .serializers import StudySessionSerializer, StudySessionCreateSerializer
from .lifecycle_serializers import SessionAgendaSerializer, SessionNoteSerializer, SessionSummarySerializer, SubjectVaultFileSerializer
from .summary_service import generate_session_summary
from .parent_service import create_or_refresh_parent_link, get_parent_dashboard_data
from .update_serializers import StudySessionUpdateSerializer
from .video import create_video_room, create_meeting_token, start_cloud_recording, stop_cloud_recording, fetch_latest_room_recording, ensure_room_chat_disabled
from .availability_utils import get_availability_conflicts


class StudySessionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = StudySessionSerializer
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ADMIN':
            return StudySession.objects.all().select_related('creator', 'partner').prefetch_related(
                'participant_records__user'
            )

        participant_session_ids = SessionParticipant.objects.filter(
            user=user,
        ).exclude(
            invite_status=SessionParticipant.STATUS_DECLINED,
        ).values_list('session_id', flat=True)

        return StudySession.objects.filter(
            Q(creator=user) | Q(partner=user) | Q(id__in=participant_session_ids)
        ).select_related('creator', 'partner').prefetch_related('participant_records__user').distinct()

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def get_serializer_class(self):
        if self.action == 'create':
            return StudySessionCreateSerializer
        if self.action in ('partial_update', 'update'):
            return StudySessionUpdateSerializer
        return StudySessionSerializer

    def partial_update(self, request, *args, **kwargs):
        session = self.get_object()
        if request.user.id != session.creator_id:
            return Response({'error': 'Only the organizer can update this session'}, status=status.HTTP_403_FORBIDDEN)

        serializer = StudySessionUpdateSerializer(data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.update(session, serializer.validated_data)
        return Response(StudySessionSerializer(session, context={'request': request}).data)

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        status_filter = request.query_params.get('status', '').lower()
        user = request.user

        if status_filter == 'invitations':
            invited_session_ids = SessionParticipant.objects.filter(
                user=user,
                invite_status=SessionParticipant.STATUS_INVITED,
                role=SessionParticipant.ROLE_INVITEE,
            ).values_list('session_id', flat=True)
            queryset = queryset.filter(id__in=invited_session_ids)
            queryset = queryset.filter(
                status__in=[SessionStatus.PENDING, SessionStatus.SCHEDULED],
                scheduled_at__gte=timezone.now(),
            )
        elif status_filter in ('upcoming', 'scheduled', 'pending'):
            queryset = queryset.filter(status__in=[SessionStatus.PENDING, SessionStatus.SCHEDULED])
            queryset = queryset.filter(scheduled_at__gte=timezone.now())
            accepted_or_organizer_ids = SessionParticipant.objects.filter(
                user=user,
            ).filter(
                Q(invite_status=SessionParticipant.STATUS_ACCEPTED) |
                Q(role=SessionParticipant.ROLE_ORGANIZER)
            ).values_list('session_id', flat=True)
            queryset = queryset.filter(
                Q(creator=user) | Q(id__in=accepted_or_organizer_ids) | Q(partner=user)
            )
        elif status_filter == 'past':
            queryset = queryset.filter(
                Q(status__in=[SessionStatus.COMPLETED, SessionStatus.CANCELLED]) |
                Q(scheduled_at__lt=timezone.now())
            )
        elif status_filter == 'completed':
            queryset = queryset.filter(status=SessionStatus.COMPLETED)

        serializer = StudySessionSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)

    def create(self, request):
        serializer = StudySessionCreateSerializer(data=request.data, context={'request': request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        session = serializer.save()
        return Response(
            StudySessionSerializer(session, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'])
    def accept_invite(self, request, pk=None):
        session = self.get_object()
        participant = SessionParticipant.objects.filter(
            session=session,
            user=request.user,
            role=SessionParticipant.ROLE_INVITEE,
        ).first()

        if not participant:
            return Response({'error': 'No invitation found for this session'}, status=status.HTTP_404_NOT_FOUND)
        if participant.invite_status == SessionParticipant.STATUS_ACCEPTED:
            return Response(StudySessionSerializer(session, context={'request': request}).data)

        participant.invite_status = SessionParticipant.STATUS_ACCEPTED
        participant.save(update_fields=['invite_status'])

        if not session.partner_id and request.user.id != session.creator_id:
            session.partner = request.user
        session.status = SessionStatus.SCHEDULED
        session.save()

        try:
            from notifications.services import create_notification
            create_notification(
                session.creator,
                'session_invite',
                'Session Invite Accepted',
                f'{request.user.full_name or request.user.username} accepted your session invite for "{session.title}"',
                '/sessions',
            )
        except Exception:
            pass

        return Response({
            'success': True,
            'message': 'Session invitation accepted',
            'session': StudySessionSerializer(session, context={'request': request}).data,
        })

    @action(detail=True, methods=['post'])
    def decline_invite(self, request, pk=None):
        session = self.get_object()
        participant = SessionParticipant.objects.filter(
            session=session,
            user=request.user,
            role=SessionParticipant.ROLE_INVITEE,
        ).first()

        if not participant:
            return Response({'error': 'No invitation found for this session'}, status=status.HTTP_404_NOT_FOUND)

        participant.invite_status = SessionParticipant.STATUS_DECLINED
        participant.save(update_fields=['invite_status'])

        if session.partner_id == request.user.id:
            session.partner = None
            session.save(update_fields=['partner_id'])

        return Response({'success': True, 'message': 'Session invitation declined'})

    @action(detail=True, methods=['get'])
    def video(self, request, pk=None):
        session = self.get_object()
        is_participant = SessionParticipant.objects.filter(
            session=session,
            user=request.user,
        ).exclude(invite_status=SessionParticipant.STATUS_DECLINED).exists()

        if not is_participant and request.user.id not in [session.creator_id, session.partner_id]:
            return Response({'error': 'Not authorized for this session'}, status=status.HTTP_403_FORBIDDEN)

        if not session.video_room_url:
            session.video_room_url = create_video_room(session)
            session.save(update_fields=['video_room_url'])

        if 'daily.co' in session.video_room_url:
            ensure_room_chat_disabled(session)

        provider = 'daily' if 'daily.co' in session.video_room_url else 'jitsi'
        payload = {
            'videoRoomUrl': session.video_room_url,
            'provider': provider,
            'sessionTitle': session.title,
        }
        if provider == 'daily':
            token = create_meeting_token(session, request.user)
            if not token:
                return Response(
                    {'error': 'Could not create video meeting token. Try again or contact support.'},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
            payload['meetingToken'] = token

        return Response(payload)

    @action(detail=True, methods=['post'])
    def start_meeting(self, request, pk=None):
        session = self.get_object()
        if not session.started_at:
            session.started_at = timezone.now()
            session.save(update_fields=['started_at'])
        if request.user.id == session.creator_id:
            start_cloud_recording(session)
        return Response({
            'success': True,
            'startedAt': session.started_at.isoformat(),
        })

    @action(detail=True, methods=['post'])
    def sync_recording(self, request, pk=None):
        session = self.get_object()
        try:
            from .recording_service import sync_recording_from_daily
            recording = sync_recording_from_daily(session)
        except Exception:
            recording = None

        if not recording:
            return Response({'ready': False, 'recording': None})

        return Response({
            'ready': bool(recording.download_url),
            'recording': {
                'id': recording.daily_recording_id,
                'downloadUrl': recording.download_url,
                'status': recording.status,
            },
        })

    @action(detail=True, methods=['post'])
    def end_meeting(self, request, pk=None):
        session = self.get_object()
        now = timezone.now()
        session.ended_at = now
        if session.started_at:
            delta = now - session.started_at
            session.actual_duration_minutes = max(1, int(delta.total_seconds() / 60))
        else:
            session.actual_duration_minutes = session.duration_minutes

        participants = session.participant_records.exclude(
            invite_status=SessionParticipant.STATUS_DECLINED
        ).count()
        if participants <= 1 or request.user.id == session.creator_id:
            session.status = SessionStatus.COMPLETED

        session.save(update_fields=['ended_at', 'actual_duration_minutes', 'status'])

        if request.user.id == session.creator_id:
            stop_cloud_recording(session)
            try:
                from .recording_service import sync_recording_from_daily, schedule_recording_sync
                sync_recording_from_daily(session)
                schedule_recording_sync(session.id)
            except Exception:
                pass

        try:
            from chat.group_chat import finalize_session_chat
            finalize_session_chat(session)
        except Exception:
            pass

        return Response({
            'success': True,
            'endedAt': session.ended_at.isoformat(),
            'actualDurationMinutes': session.actual_duration_minutes,
            'status': StudySessionSerializer(session, context={'request': request}).data.get('status'),
        })

    @action(detail=True, methods=['post'])
    def join(self, request, pk=None):
        session = self.get_object()

        if session.participant_records.filter(
            invite_status__in=[SessionParticipant.STATUS_ACCEPTED, SessionParticipant.STATUS_INVITED]
        ).count() >= session.max_participants:
            return Response({'error': 'Session is full'}, status=status.HTTP_400_BAD_REQUEST)

        participant, created = SessionParticipant.objects.get_or_create(
            session=session,
            user=request.user,
            defaults={
                'role': SessionParticipant.ROLE_INVITEE,
                'invite_status': SessionParticipant.STATUS_ACCEPTED,
            },
        )
        if not created and participant.invite_status == SessionParticipant.STATUS_INVITED:
            participant.invite_status = SessionParticipant.STATUS_ACCEPTED
            participant.save(update_fields=['invite_status'])

        if not session.partner_id and request.user.id != session.creator_id:
            session.partner = request.user
        session.status = SessionStatus.SCHEDULED
        session.save()
        return Response(StudySessionSerializer(session, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        session = self.get_object()
        if request.user.id != session.creator_id:
            return Response({'error': 'Only the organizer can complete this session'}, status=status.HTTP_403_FORBIDDEN)

        session.status = SessionStatus.COMPLETED
        session.save()
        try:
            from chat.group_chat import finalize_session_chat
            finalize_session_chat(session)
        except Exception:
            pass
        return Response({
            'success': True,
            'message': 'Session marked as completed',
            'session': StudySessionSerializer(session, context={'request': request}).data,
        })

    @action(detail=False, methods=['post'])
    def check_availability(self, request):
        date_str = request.data.get('date', '')
        time_str = request.data.get('time', '')
        buddy_ids = request.data.get('invitedBuddies', [])
        if isinstance(buddy_ids, str):
            buddy_ids = [int(x) for x in buddy_ids.split(',') if x.strip().isdigit()]
        conflicts = get_availability_conflicts(buddy_ids, date_str, time_str)
        return Response({'conflicts': conflicts, 'hasConflicts': len(conflicts) > 0})

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        session = self.get_object()
        is_participant = SessionParticipant.objects.filter(session=session, user=request.user).exists()
        if request.user.id not in [session.creator_id, session.partner_id] and not is_participant:
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

        if request.user.id == session.creator_id:
            session.status = SessionStatus.CANCELLED
            session.save()
        else:
            SessionParticipant.objects.filter(session=session, user=request.user).delete()
            if session.partner_id == request.user.id:
                session.partner = None
                session.save(update_fields=['partner_id'])

        return Response({'success': True, 'message': 'Session updated'})

    def destroy(self, request, *args, **kwargs):
        session = self.get_object()
        if request.user.id != session.creator_id:
            return Response({'error': 'Only the organizer can delete this session'}, status=status.HTTP_403_FORBIDDEN)
        session.delete()
        return Response({'success': True, 'message': 'Session deleted'})

    def _session_access(self, session, user):
        is_participant = SessionParticipant.objects.filter(
            session=session, user=user,
        ).exclude(invite_status=SessionParticipant.STATUS_DECLINED).exists()
        return is_participant or user.id in [session.creator_id, session.partner_id]

    @action(detail=True, methods=['get', 'put'])
    def agenda(self, request, pk=None):
        session = self.get_object()
        if not self._session_access(session, request.user):
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

        agenda, _ = SessionAgenda.objects.get_or_create(session=session)
        if request.method == 'GET':
            return Response(SessionAgendaSerializer(agenda).data)

        if request.user.id != session.creator_id:
            return Response({'error': 'Only organizer can edit agenda'}, status=status.HTTP_403_FORBIDDEN)

        ser = SessionAgendaSerializer(agenda, data=request.data, partial=True)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        ser.save()
        return Response(ser.data)

    @action(detail=True, methods=['get', 'post'])
    def notes(self, request, pk=None):
        session = self.get_object()
        if not self._session_access(session, request.user):
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

        if request.method == 'GET':
            notes = session.notes.filter(user=request.user)
            return Response(SessionNoteSerializer(notes, many=True).data)

        note_type = request.data.get('noteType', SessionNote.NOTE_POST)
        note, _ = SessionNote.objects.update_or_create(
            session=session, user=request.user, note_type=note_type,
            defaults={
                'content': request.data.get('content', ''),
                'weak_topics': request.data.get('weakTopics', []),
            },
        )
        return Response(SessionNoteSerializer(note).data)

    @action(detail=True, methods=['get', 'post'])
    def summary(self, request, pk=None):
        session = self.get_object()
        if not self._session_access(session, request.user):
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

        if request.method == 'GET':
            summary = getattr(session, 'summary', None)
            if not summary:
                return Response({'summary_text': '', 'actionItems': [], 'aiGenerated': False})
            return Response(SessionSummarySerializer(summary).data)

        notes = list(session.notes.all())
        agenda = getattr(session, 'agenda', None)
        result = generate_session_summary(session, notes, agenda)
        summary, _ = SessionSummary.objects.update_or_create(
            session=session,
            defaults={
                'summary_text': result['summary_text'],
                'action_items': result['action_items'],
                'ai_generated': result['ai_generated'],
                'created_by': request.user,
            },
        )
        return Response(SessionSummarySerializer(summary).data)

    @action(detail=True, methods=['get', 'post'])
    def vault(self, request, pk=None):
        session = self.get_object()
        if not self._session_access(session, request.user):
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

        if request.method == 'GET':
            files = SubjectVaultFile.objects.filter(session=session, user=request.user)
            return Response(SubjectVaultFileSerializer(files, many=True, context={'request': request}).data)

        upload = request.FILES.get('file')
        if not upload:
            return Response({'error': 'file is required'}, status=status.HTTP_400_BAD_REQUEST)

        vault_file = SubjectVaultFile.objects.create(
            user=request.user,
            session=session,
            subject=session.course,
            title=request.data.get('title') or upload.name,
            file=upload,
            file_size=upload.size,
        )
        return Response(
            SubjectVaultFileSerializer(vault_file, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=['get', 'post'])
    def vault_all(self, request):
        if request.method == 'GET':
            subject = request.query_params.get('subject', '')
            qs = SubjectVaultFile.objects.filter(user=request.user)
            if subject:
                qs = qs.filter(subject__iexact=subject)
            return Response(SubjectVaultFileSerializer(qs, many=True, context={'request': request}).data)

        upload = request.FILES.get('file')
        if not upload:
            return Response({'error': 'file is required'}, status=status.HTTP_400_BAD_REQUEST)

        subject = (request.data.get('subject') or '').strip()
        if not subject:
            return Response({'error': 'subject is required'}, status=status.HTTP_400_BAD_REQUEST)

        session = None
        session_id = request.data.get('sessionId')
        if session_id:
            try:
                session = StudySession.objects.get(pk=session_id)
            except StudySession.DoesNotExist:
                return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)
            if not self._session_access(session, request.user):
                return Response({'error': 'Not authorized for this session'}, status=status.HTTP_403_FORBIDDEN)

        vault_file = SubjectVaultFile.objects.create(
            user=request.user,
            session=session,
            subject=subject,
            title=request.data.get('title') or upload.name,
            file=upload,
            file_size=upload.size,
        )
        return Response(
            SubjectVaultFileSerializer(vault_file, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=['patch', 'delete'], url_path=r'vault_files/(?P<file_id>[^/.]+)')
    def vault_file(self, request, file_id=None):
        try:
            vault_file = SubjectVaultFile.objects.get(pk=file_id, user=request.user)
        except SubjectVaultFile.DoesNotExist:
            return Response({'error': 'File not found'}, status=status.HTTP_404_NOT_FOUND)

        if request.method == 'DELETE':
            if vault_file.file:
                vault_file.file.delete(save=False)
            vault_file.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        title = (request.data.get('title') or '').strip()
        if not title:
            return Response({'error': 'title is required'}, status=status.HTTP_400_BAD_REQUEST)
        vault_file.title = title[:200]
        vault_file.save(update_fields=['title'])
        return Response(SubjectVaultFileSerializer(vault_file, context={'request': request}).data)

    @action(detail=False, methods=['get'], url_path=r'vault_files/(?P<file_id>[^/.]+)/preview')
    def vault_file_preview(self, request, file_id=None):
        try:
            vault_file = SubjectVaultFile.objects.get(pk=file_id, user=request.user)
        except SubjectVaultFile.DoesNotExist:
            return Response({'error': 'File not found'}, status=status.HTTP_404_NOT_FOUND)

        if not vault_file.file:
            return Response({'error': 'File missing'}, status=status.HTTP_404_NOT_FOUND)

        filename = vault_file.file.name.split('/')[-1]
        mime, _ = mimetypes.guess_type(filename)
        response = FileResponse(
            vault_file.file.open('rb'),
            content_type=mime or 'application/octet-stream',
        )
        safe_name = vault_file.title.replace('"', '')
        response['Content-Disposition'] = f'inline; filename="{safe_name}"'
        return response

    @action(detail=False, methods=['post'], url_path=r'vault_files/(?P<file_id>[^/.]+)/share')
    def vault_file_share(self, request, file_id=None):
        try:
            vault_file = SubjectVaultFile.objects.get(pk=file_id, user=request.user)
        except SubjectVaultFile.DoesNotExist:
            return Response({'error': 'File not found'}, status=status.HTTP_404_NOT_FOUND)

        buddy_id = request.data.get('buddyId') or request.data.get('buddy_id')
        room_id = request.data.get('roomId') or request.data.get('room_id')
        note = request.data.get('message') or request.data.get('content') or ''

        try:
            from .vault_share import share_vault_file
            result = share_vault_file(
                vault_file,
                request.user,
                buddy_id=buddy_id,
                room_id=room_id,
                note=note,
            )
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'success': True, **result})

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def parent_link(self, request):
        try:
            link, view_url = create_or_refresh_parent_link(request.user, request.data.get('parentEmail'))
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'success': True, 'viewUrl': view_url, 'parentEmail': link.parent_email})

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def parent_view(self, request):
        token = request.query_params.get('token', '')
        data = get_parent_dashboard_data(token)
        if not data:
            return Response({'error': 'Invalid or expired link'}, status=status.HTTP_404_NOT_FOUND)
        return Response(data)

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def templates(self, request):
        from users.curriculum import PAST_PAPER_TEMPLATES
        return Response(PAST_PAPER_TEMPLATES)
