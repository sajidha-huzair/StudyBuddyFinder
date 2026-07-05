import json
import threading
from datetime import datetime, timedelta, timezone as dt_timezone

from django.db import close_old_connections
from django.utils import timezone

from chat.models import Message, MessageType
from .models import SessionRecording, SessionParticipant
from .video import fetch_recording_download_url, session_id_from_room_name


def _format_time(dt):
    if not dt:
        return ''
    if timezone.is_naive(dt):
        dt = timezone.make_aware(dt)
    return dt.strftime('%b %d, %Y · %I:%M %p')


def _recording_metadata(session, recording):
    started = recording.started_at or session.started_at
    ended = recording.ended_at or session.ended_at
    return {
        'sessionId': session.id,
        'sessionTitle': session.title,
        'recordingUrl': recording.download_url or '',
        'recordingId': recording.daily_recording_id,
        'startedAt': started.isoformat() if started else None,
        'endedAt': ended.isoformat() if ended else None,
        'durationSeconds': recording.duration_seconds,
    }


def _recording_content(session, recording):
    started = recording.started_at or session.started_at
    ended = recording.ended_at or session.ended_at
    start_label = _format_time(started)
    end_label = _format_time(ended)
    content = f'Session recording · {start_label}'
    if end_label:
        content += f' – {end_label}'
    return content


def _push_recording_message(user_id, message, is_sender):
    try:
        from chat.realtime import push_chat_message
        from chat.serializers import MessageSerializer

        item = MessageSerializer(message).data
        item['sender'] = 'me' if is_sender else 'buddy'
        push_chat_message(user_id, item)
    except Exception:
        pass


def _recording_message_exists(organizer_id, user_id, recording_id):
    return Message.objects.filter(
        sender_id=organizer_id,
        recipient_id=user_id,
        message_type=MessageType.RECORDING,
        metadata__contains=recording_id,
    ).exists()


def update_recording_chat_urls(recording):
    if not recording.download_url or not recording.daily_recording_id:
        return

    for message in Message.objects.filter(
        message_type=MessageType.RECORDING,
        metadata__contains=recording.daily_recording_id,
    ):
        meta = json.loads(message.metadata or '{}')
        if meta.get('recordingUrl') == recording.download_url:
            continue
        meta['recordingUrl'] = recording.download_url
        message.metadata = json.dumps(meta)
        message.save(update_fields=['metadata'])

        is_sender = message.sender_id
        _push_recording_message(message.recipient_id, message, is_sender=False)
        _push_recording_message(message.sender_id, message, is_sender=True)


def post_recording_to_chat(session, recording):
    from users.models import User

    if not recording.daily_recording_id:
        return

    participants = SessionParticipant.objects.filter(
        session=session,
    ).exclude(
        invite_status=SessionParticipant.STATUS_DECLINED,
    ).select_related('user')

    user_ids = {session.creator_id}
    for row in participants:
        user_ids.add(row.user_id)

    users = list(User.objects.filter(id__in=user_ids))
    if len(users) < 2:
        return

    metadata = _recording_metadata(session, recording)
    content = _recording_content(session, recording)
    organizer = session.creator

    for user in users:
        if user.id == organizer.id:
            continue
        if _recording_message_exists(organizer.id, user.id, recording.daily_recording_id):
            continue

        message = Message.objects.create(
            sender=organizer,
            recipient=user,
            message_type=MessageType.RECORDING,
            content=content,
            metadata=json.dumps(metadata),
        )

        _push_recording_message(user.id, message, is_sender=False)
        _push_recording_message(organizer.id, message, is_sender=True)

        try:
            from notifications.services import create_notification
            create_notification(
                user,
                'new_message',
                'Session recording ready',
                content,
                f'/chat/{organizer.id}',
            )
        except Exception:
            pass


def _recording_from_daily_row(session, row):
    recording_id = row.get('id') or row.get('recording_id')
    if not recording_id:
        return None

    start_ts = row.get('start_ts')
    duration = int(row.get('duration') or 0)
    started_at = datetime.fromtimestamp(start_ts, tz=dt_timezone.utc) if start_ts else session.started_at
    ended_at = started_at + timedelta(seconds=duration) if started_at and duration else session.ended_at

    download_url = fetch_recording_download_url(recording_id) or ''

    recording, created = SessionRecording.objects.update_or_create(
        daily_recording_id=recording_id,
        defaults={
            'session': session,
            'download_url': download_url,
            'started_at': started_at,
            'ended_at': ended_at,
            'duration_seconds': duration,
            'status': row.get('status') or 'ready',
        },
    )

    if download_url and recording.download_url != download_url:
        recording.download_url = download_url
        recording.save(update_fields=['download_url'])

    post_recording_to_chat(session, recording)
    update_recording_chat_urls(recording)
    return recording


def upsert_recording_from_webhook(payload):
    event_type = payload.get('type') or payload.get('event')
    if event_type != 'recording.ready-to-download':
        return None

    data = payload.get('payload') or payload
    recording_id = data.get('recording_id') or data.get('id')
    room_name = data.get('room_name') or ''
    session_id = session_id_from_room_name(room_name)

    if not session_id or not recording_id:
        return None

    from .models import StudySession
    try:
        session = StudySession.objects.get(id=session_id)
    except StudySession.DoesNotExist:
        return None

    start_ts = data.get('start_ts')
    duration = int(data.get('duration') or 0)
    started_at = datetime.fromtimestamp(start_ts, tz=dt_timezone.utc) if start_ts else session.started_at
    ended_at = None
    if started_at and duration:
        ended_at = started_at + timedelta(seconds=duration)

    download_url = fetch_recording_download_url(recording_id) or ''

    recording, _ = SessionRecording.objects.update_or_create(
        daily_recording_id=recording_id,
        defaults={
            'session': session,
            'download_url': download_url,
            'started_at': started_at,
            'ended_at': ended_at,
            'duration_seconds': duration,
            'status': 'ready',
        },
    )

    post_recording_to_chat(session, recording)
    update_recording_chat_urls(recording)
    return recording


def sync_recording_from_daily(session):
    from .models import StudySession
    from .video import fetch_latest_room_recording

    if not isinstance(session, StudySession):
        return None

    row = fetch_latest_room_recording(session)
    if not row:
        return None

    return _recording_from_daily_row(session, row)


def schedule_recording_sync(session_id, delays=(5, 15, 30, 60, 90, 120)):

    def _attempt():
        close_old_connections()
        from .models import StudySession
        try:
            session = StudySession.objects.get(pk=session_id)
        except StudySession.DoesNotExist:
            return
        recording = sync_recording_from_daily(session)
        if recording and recording.download_url:
            return
        if recording:
            update_recording_chat_urls(recording)

    for delay in delays:
        timer = threading.Timer(delay, _attempt)
        timer.daemon = True
        timer.start()
