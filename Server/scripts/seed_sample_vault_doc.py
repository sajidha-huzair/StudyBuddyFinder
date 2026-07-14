import os
import sys

import django

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'studybuddy.settings')
django.setup()

from django.core.files.base import ContentFile
from django.utils import timezone
from users.models import User
from study_sessions.models import StudySession, SubjectVaultFile, SessionStatus
from chat.group_chat import finalize_session_chat


SAMPLE_CONTENT = """A/L Geography - Landforms Revision Notes
Grade 12 | Session demo file

1. Landforms
- Mountains: fold, block, volcanic
- Plateaus: dissected, intermontane
- Plains: alluvial, coastal

2. Map reading
- Contour intervals and slope direction
- Six-figure grid references

3. River systems
- Upper course: vertical erosion, waterfalls
- Middle course: lateral erosion, meanders
- Lower course: deposition, deltas

4. Essay planning tip
- Introduction: define terms + outline structure
- Body: 3 themed paragraphs with labelled diagrams
- Conclusion: link back to question command word

Prepared for: A/L Arts Geography & History revision session
"""


def main():
    sarah = User.objects.get(email='sarah@gmail.com')
    session = (
        StudySession.objects.filter(creator=sarah, course='Geography')
        .order_by('-id')
        .first()
    )
    if not session:
        print('No Geography session found for Sarah. Run seed_sarah_session_demo.py first.')
        return

    title = 'Geography Landforms Revision Notes.txt'
    encoded = SAMPLE_CONTENT.encode('utf-8')
    vault_file, created = SubjectVaultFile.objects.get_or_create(
        user=sarah,
        session=session,
        title=title,
        defaults={
            'subject': session.course,
            'file_size': len(encoded),
        },
    )
    if created or not vault_file.file:
        vault_file.file.save(title, ContentFile(encoded), save=False)
        vault_file.file_size = len(encoded)
        vault_file.save()
        print(f'Created vault file #{vault_file.id}: {title}')
    else:
        print(f'Vault file already exists: #{vault_file.id} {title}')

    if session.status == SessionStatus.COMPLETED:
        finalize_session_chat(session)
        print('Refreshed group chat archive with vault file reference.')

    print(f'Session #{session.id}: {session.title}')
    print('View at /vault as sarah@gmail.com')


if __name__ == '__main__':
    main()
