"""School email verification for Sri Lankan students."""

import re

# Common school email patterns in Sri Lanka
SCHOOL_EMAIL_PATTERNS = [
    r'@.*\.sch\.lk$',
    r'@.*\.school\.lk$',
    r'@.*\.edu\.lk$',
    r'@.*\.ac\.lk$',
]


def is_school_email(email):
    email = (email or '').strip().lower()
    return any(re.search(p, email) for p in SCHOOL_EMAIL_PATTERNS)


def verify_school_email(user, school_email):
    school_email = (school_email or '').strip().lower()
    if not is_school_email(school_email):
        return False, 'Use a valid school email ending in .sch.lk, .edu.lk, or similar.'

    user.email = school_email
    user.school_verified = True
    user.is_verified = True
    user.save(update_fields=['email', 'school_verified', 'is_verified'])
    return True, 'School email verified successfully.'
