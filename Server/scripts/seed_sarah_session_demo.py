import json
import os
import sys
from datetime import timedelta

import django

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'studybuddy.settings')
django.setup()

from django.utils import timezone
from users.models import User
from matches.models import Match, MatchStatus
from study_sessions.models import StudySession, SessionParticipant, SessionStatus
from study_sessions.serializers import StudySessionCreateSerializer
from rest_framework.test import APIRequestFactory, force_authenticate
from rest_framework.request import Request
from chat.models import ChatRoom, ChatRoomMessage
from chat.group_chat import finalize_session_chat


def accept_match(match):
    match.status = MatchStatus.ACCEPTED
    match.save(update_fields=['status'])
    print(f'Accepted match #{match.id}: {match.user1.email} <-> {match.user2.email}')


def ensure_buddy_match(user1, user2):
    match = Match.objects.filter(user1=user1, user2=user2).first()
    if not match:
        match = Match.objects.filter(user1=user2, user2=user1).first()
    if match:
        if match.status != MatchStatus.ACCEPTED:
            if match.user2_id == user2.id:
                accept_match(match)
            else:
                match.status = MatchStatus.ACCEPTED
                match.save()
                print(f'Accepted existing match #{match.id}')
        return match
    match = Match.objects.create(
        user1=user1,
        user2=user2,
        status=MatchStatus.ACCEPTED,
        compatibility_score=75.0,
        message='Demo study buddy connection',
    )
    print(f'Created accepted match: {user1.email} -> {user2.email}')
    return match


def main():
    sarah = User.objects.get(email='sarah@gmail.com')
    amara = User.objects.get(email='amara.match88@test.com')
    nina = User.objects.get(email='nina.match82@test.com')

    pending = Match.objects.filter(user1=sarah, user2=amara, status=MatchStatus.PENDING).first()
    if pending:
        accept_match(pending)
    else:
        ensure_buddy_match(sarah, amara)

    ensure_buddy_match(sarah, nina)

    factory = APIRequestFactory()
    scheduled = timezone.now() + timedelta(days=1)
    payload = {
        'title': 'A/L Arts — Geography & History revision',
        'subject': 'Geography',
        'description': 'Group online revision before term test.',
        'date': scheduled.date().isoformat(),
        'time': scheduled.strftime('%H:%M'),
        'duration': 60,
        'sessionFormat': 'online',
        'invitedBuddies': [amara.id, nina.id],
        'agenda': {
            'sessionGoal': 'Revise Grade 12 Geography landforms + History paper structure',
            'pastPaperRef': '2023 A/L Geography Paper I',
            'topics': ['Landforms', 'Map reading', 'Essay planning'],
            'checklist': ['Download past paper', 'Prepare notes'],
        },
    }
    request = factory.post('/api/sessions/', payload, format='json')
    force_authenticate(request, user=sarah)
    drf_request = Request(request)
    serializer = StudySessionCreateSerializer(data=payload, context={'request': drf_request})
    serializer.is_valid(raise_exception=True)
    session = serializer.save()

    print(f'\nSession #{session.id}: {session.title}')
    print(f'  When: {session.scheduled_at}')
    print(f'  Max participants: {session.max_participants}')
    print(f'  Invited: Amara, Nina')

    room = ChatRoom.objects.filter(session=session).first()
    if room:
        print(f'  Group chat room #{room.id}: {room.title}')
        print(f'  Messages in room: {room.messages.count()}')

    session.status = SessionStatus.COMPLETED
    session.started_at = timezone.now() - timedelta(hours=1)
    session.ended_at = timezone.now()
    session.actual_duration_minutes = 58
    session.save()
    from study_sessions.models import SessionNote
    SessionNote.objects.update_or_create(
        session=session, user=sarah, note_type='post',
        defaults={'content': 'Covered landforms and map symbols. Need more practice on essay outlines.', 'weak_topics': ['Essay planning']},
    )
    SessionNote.objects.update_or_create(
        session=session, user=amara, note_type='post',
        defaults={'content': 'Shared my Geography notes on river systems.', 'weak_topics': []},
    )
    finalize_session_chat(session)
    print(f'  After finalize - group chat messages: {room.messages.count()}')

    from django.core.files.base import ContentFile
    from study_sessions.models import SubjectVaultFile
    sample_title = 'Geography Landforms Revision Notes.txt'
    sample_bytes = (
        b'A/L Geography landforms, map reading, and river systems - demo notes from group session.\n'
    )
    vault_file, vault_created = SubjectVaultFile.objects.get_or_create(
        user=sarah,
        session=session,
        title=sample_title,
        defaults={'subject': session.course, 'file_size': len(sample_bytes)},
    )
    if vault_created or not vault_file.file:
        vault_file.file.save(sample_title, ContentFile(sample_bytes), save=False)
        vault_file.file_size = len(sample_bytes)
        vault_file.save()
    finalize_session_chat(session)
    print(f'  Vault file: {sample_title} (id #{vault_file.id})')
    print(f'  Group chat messages after vault: {room.messages.count()}')

    print('\nDone! Log in as sarah@gmail.com -> Sessions or Chat -> session group chat.')
    print(f'Group chat URL path: /chat/room/{room.id}')


if __name__ == '__main__':
    main()
