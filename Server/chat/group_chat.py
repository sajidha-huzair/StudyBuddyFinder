import json
from datetime import timedelta

from django.utils import timezone

from chat.models import ChatRoom, ChatRoomMember, ChatRoomMessage, MessageType
from study_sessions.models import SessionParticipant, StudySession


def ensure_session_chat_room(session):
    """Create or refresh the group chat for a study session."""
    title = f'{session.title} · {session.course}'
    room, created = ChatRoom.objects.get_or_create(
        session=session,
        defaults={'title': title, 'room_type': ChatRoom.ROOM_SESSION},
    )
    if not created and room.title != title:
        room.title = title
        room.save(update_fields=['title'])

    member_ids = {session.creator_id}
    for record in session.participant_records.exclude(
        invite_status=SessionParticipant.STATUS_DECLINED,
    ):
        member_ids.add(record.user_id)

    for user_id in member_ids:
        ChatRoomMember.objects.get_or_create(room=room, user_id=user_id)

    if created:
        _post_room_message(
            room,
            session.creator,
            MessageType.SYSTEM,
            f'Session group chat created for "{session.title}". Plan here before and after your online session.',
            {'sessionId': session.id, 'event': 'room_created'},
        )
    return room


def post_session_planned_to_room(session):
    room = ensure_session_chat_room(session)
    when = session.scheduled_at.strftime('%d %b %Y at %H:%M')
    _post_room_message(
        room,
        session.creator,
        MessageType.SESSION_PROPOSAL,
        f'Online session scheduled: {when} ({session.duration_minutes} min)',
        {
            'sessionId': session.id,
            'title': session.title,
            'subject': session.course,
            'date': session.scheduled_at.date().isoformat(),
            'time': session.scheduled_at.strftime('%H:%M'),
            'sessionFormat': 'online',
            'duration': session.duration_minutes,
        },
    )
    return room


def finalize_session_chat(session):
    """After a session ends, archive summary, recording, and notes into the group chat."""
    room = ChatRoom.objects.filter(session=session).first()
    if not room:
        room = ensure_session_chat_room(session)

    ensure_session_chat_room(session)

    duration = session.actual_duration_minutes or session.duration_minutes
    _post_room_message(
        room,
        session.creator,
        MessageType.SYSTEM,
        f'Session completed · {duration} min recorded online.',
        {'sessionId': session.id, 'event': 'session_completed', 'duration': duration},
    )

    agenda = getattr(session, 'agenda', None)
    if agenda and (agenda.session_goal or agenda.past_paper_ref):
        parts = []
        if agenda.session_goal:
            parts.append(f'Goal: {agenda.session_goal}')
        if agenda.past_paper_ref:
            parts.append(f'Past paper: {agenda.past_paper_ref}')
        _post_room_message(
            room,
            session.creator,
            MessageType.SYSTEM,
            ' · '.join(parts),
            {'sessionId': session.id, 'event': 'agenda_recap'},
        )

    for note in session.notes.all():
        if note.content.strip():
            name = note.user.full_name or note.user.username
            _post_room_message(
                room,
                note.user,
                MessageType.TEXT,
                f'[Post-session notes — {name}] {note.content}',
                {'sessionId': session.id, 'event': 'post_notes', 'noteType': note.note_type},
            )

    summary = getattr(session, 'summary', None)
    if summary and summary.summary_text.strip():
        body = summary.summary_text
        if summary.action_items:
            body += '\n\nAction items:\n' + '\n'.join(f'• {a}' for a in summary.action_items)
        _post_room_message(
            room,
            session.creator,
            MessageType.SYSTEM,
            body,
            {
                'sessionId': session.id,
                'event': 'session_summary',
                'aiGenerated': summary.ai_generated,
                'actionItems': summary.action_items,
            },
        )

    recording = session.recordings.filter(download_url__gt='').order_by('-created_at').first()
    if recording and recording.download_url:
        _post_room_message(
            room,
            session.creator,
            MessageType.RECORDING,
            'Session recording is ready.',
            {
                'sessionId': session.id,
                'event': 'recording',
                'downloadUrl': recording.download_url,
                'recordingId': recording.daily_recording_id,
            },
        )

    for vault in session.vault_files.all():
        file_url = None
        if vault.file:
            try:
                from django.conf import settings
                file_url = vault.file.url
            except Exception:
                pass
        _post_room_message(
            room,
            vault.user,
            MessageType.FILE,
            f'Shared to vault: {vault.title}',
            {
                'sessionId': session.id,
                'event': 'vault_file',
                'subject': vault.subject,
                'fileName': vault.title,
                'downloadUrl': file_url,
                'mimeType': 'application/octet-stream',
            },
        )

    return room


def _post_room_message(room, sender, message_type, content, metadata=None):
    msg = ChatRoomMessage.objects.create(
        room=room,
        sender=sender,
        message_type=message_type,
        content=content,
        metadata=json.dumps(metadata or {}),
    )
    try:
        from chat.realtime import push_room_message
        from chat.room_serializers import ChatRoomMessageSerializer

        payload = ChatRoomMessageSerializer(msg).data
        for member in room.members.select_related('user'):
            push_room_message(member.user_id, room.id, payload)
    except Exception:
        pass
    return msg


def user_can_access_room(user, room):
    return ChatRoomMember.objects.filter(room=room, user=user).exists()
