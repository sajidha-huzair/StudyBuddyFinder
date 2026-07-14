import json
import os
import sys

import django

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'studybuddy.settings')
django.setup()

from django.utils import timezone
from users.models import User
from matches.matching import get_recommendations

TARGET_EMAIL = 'sarah@gmail.com'

SHARED_AVAILABILITY = {
    'monday': ['09:00'],
    'tuesday': ['09:00'],
    'wednesday': ['09:00'],
    'thursday': ['10:00', '12:00'],
    'friday': ['13:00'],
}


def arts_profile(al_subjects, strengths, weaknesses, learning_style, study_goals, grade, exam_year=2027):
    courses = {
        'subjects': al_subjects,
        'alSubjects': al_subjects,
        'strengths': strengths,
        'weaknesses': weaknesses,
        'sitsGit': False,
    }
    prefs = {
        'learningStyle': learning_style,
        'studyGoals': study_goals,
        'studyLanguage': 'English',
        'groupSizePreference': 'Small group (2–4)',
        'profileCompleted': True,
    }
    return {
        'education_level': 'GCE A/L',
        'grade_band': 'AL',
        'grade': str(grade),
        'stream': 'ARTS',
        'medium': 'English',
        'exam_year': exam_year,
        'district': 'Kegalle',
        'university': 'Viharamahadevi Balika Vidyalaya',
        'courses': json.dumps(courses),
        'study_preferences': json.dumps(prefs),
        'availability': json.dumps(SHARED_AVAILABILITY),
        'is_active': True,
        'last_active_at': timezone.now(),
    }


MATCH_CANDIDATES = [
    {
        'email': 'amara.match88@test.com',
        'full_name': 'Amara Jayasinghe',
        'bio': 'A/L Arts Grade 12 — strong in History & Political Science, wants help with Geography.',
        **arts_profile(
            ['Geography', 'History', 'Political Science'],
            ['History', 'Political Science'],
            ['Geography'],
            'Visual',
            ['A/L exam preparation', 'Past paper practice'],
            grade=12,
        ),
    },
    {
        'email': 'priya.match92@test.com',
        'full_name': 'Priya Silva',
        'bio': 'A/L Arts Grade 13 — revising for 2027 exams, strong in Political Science.',
        **arts_profile(
            ['Geography', 'Political Science', 'Economics'],
            ['Political Science', 'Economics'],
            ['Geography'],
            'Auditory',
            ['Weekly study group', 'Theory revision'],
            grade=13,
        ),
    },
    {
        'email': 'alex.match95@test.com',
        'full_name': 'Alex Fernando',
        'bio': 'A/L Arts Grade 12 at same school — Geography & History focus.',
        **arts_profile(
            ['Geography', 'History', 'Media Studies'],
            ['Geography', 'History'],
            ['Political Science'],
            'Reading/Writing',
            ['Weekly study group', 'Model paper discussion'],
            grade=12,
        ),
    },
    {
        'email': 'nina.match82@test.com',
        'full_name': 'Nina Perera',
        'bio': 'A/L Arts Grade 13 — complements your weak areas in History.',
        **arts_profile(
            ['History', 'Geography', 'Political Science'],
            ['History'],
            ['Political Science'],
            'Kinesthetic',
            ['Past paper practice', 'Homework help'],
            grade=13,
        ),
    },
    {
        'email': 'david.match68@test.com',
        'full_name': 'David Kumar',
        'bio': 'A/L Arts Grade 12 — Logic & Geography enthusiast.',
        **arts_profile(
            ['Geography', 'Political Science', 'Logic & Scientific Method'],
            ['Logic & Scientific Method', 'Geography'],
            ['History'],
            'Visual',
            ['A/L exam preparation', 'Weekly study group'],
            grade=12,
        ),
    },
]


def main():
    try:
        sarah = User.objects.get(email=TARGET_EMAIL)
    except User.DoesNotExist:
        print(f'User not found: {TARGET_EMAIL}')
        sys.exit(1)

    updated = 0
    for data in MATCH_CANDIDATES:
        email = data.pop('email')
        user = User.objects.filter(email=email).first()
        if not user:
            print(f'Skip (not found): {email}')
            continue
        for key, value in data.items():
            setattr(user, key, value)
        user.save()
        updated += 1
        print(f'Updated: {user.full_name} ({email})')

    print(f'\nUpdated {updated} profiles for {TARGET_EMAIL}')

    recs = get_recommendations(sarah, min_score=0)
    print(f'\nRecommendations for Sarah: {len(recs)}')
    for item in recs:
        u = item['user']
        print(f"  {item['compatibility_score']:5.1f}% — {u.full_name or u.username} (Grade {u.grade})")
        for reason in item.get('match_detail', {}).get('reasons', [])[:2]:
            print(f'         · {reason}')


if __name__ == '__main__':
    main()
