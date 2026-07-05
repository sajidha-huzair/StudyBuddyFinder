"""Sri Lankan school curriculum constants (Grades 6–13)."""

GRADE_BANDS = {
    'JUNIOR': {'label': 'Grades 6–9', 'education_level': 'Grades 6-9', 'grades': [6, 7, 8, 9]},
    'OL': {'label': 'Grades 10–11 (O/L)', 'education_level': 'GCE O/L', 'grades': [10, 11]},
    'AL': {'label': 'Grades 12–13 (A/L)', 'education_level': 'GCE A/L', 'grades': [12, 13]},
}

OL_COMPULSORY = [
    'Religion', 'First Language', 'English', 'Mathematics', 'Science', 'History',
]

OL_OPTIONAL_BASKETS = {
    'basket1': ['Geography', 'Civic Education', 'Business & Accounting Studies', 'Second National Language'],
    'basket2': ['Art', 'Music', 'Dancing', 'Drama & Theatre', 'English Literature', 'Tamil Literature'],
    'basket3': ['ICT', 'Health & Physical Education', 'Home Economics', 'Agriculture & Food Technology'],
}

JUNIOR_SUBJECTS = [
    'Religion', 'First Language', 'English', 'Mathematics', 'Science', 'History',
    'Geography', 'Civic Education', 'Health & Physical Education', 'Practical & Technical Skills',
    'ICT', 'Second National Language', 'Aesthetic Subject',
]

AESTHETIC_OPTIONS = ['Art', 'Music', 'Dancing', 'Drama & Theatre']

AL_STREAMS = {
    'PHYSICAL_SCIENCE': {
        'label': 'Physical Science',
        'subjects': ['Combined Mathematics', 'Physics', 'Chemistry'],
    },
    'BIOLOGICAL_SCIENCE': {
        'label': 'Biological Science',
        'subjects': ['Biology', 'Chemistry', 'Physics', 'Agricultural Science'],
        'pick': 3,
        'required': ['Biology', 'Chemistry'],
    },
    'COMMERCE': {
        'label': 'Commerce',
        'subjects': ['Accounting', 'Business Studies', 'Economics'],
    },
    'ARTS': {
        'label': 'Arts',
        'subjects': [
            'History', 'Political Science', 'Geography', 'Sinhala', 'Tamil', 'English',
            'Logic & Scientific Method', 'Buddhist Civilization', 'Islamic Civilization',
            'Hindu Civilization', 'Economics', 'Media Studies', 'Drama & Theatre',
        ],
        'pick': 3,
    },
    'TECHNOLOGY': {
        'label': 'Technology',
        'subjects': [
            'Engineering Technology', 'Bio Systems Technology', 'Science for Technology', 'ICT',
        ],
        'pick': 3,
        'options': {
            'ENGINEERING': ['Engineering Technology', 'Science for Technology', 'ICT'],
            'BIOSYSTEMS': ['Bio Systems Technology', 'Science for Technology', 'ICT'],
        },
    },
}

AL_COMMON = ['General English', 'General Information Technology (GIT)']

MEDIUMS = ['Sinhala', 'Tamil', 'English']
DISTRICTS = [
    'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
    'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar',
    'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee',
    'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla',
    'Monaragala', 'Ratnapura', 'Kegalle',
]

STUDY_GOALS = [
    'O/L exam preparation', 'A/L exam preparation', 'Past paper practice',
    'Theory revision', 'Model paper discussion', 'Homework help', 'Weekly study group',
]

LEARNING_STYLES = ['Visual', 'Auditory', 'Reading/Writing', 'Kinesthetic']

PAST_PAPER_TEMPLATES = [
    {'id': 'ol-maths', 'label': 'O/L Mathematics past paper', 'subject': 'Mathematics', 'gradeBand': 'OL'},
    {'id': 'ol-science', 'label': 'O/L Science past paper', 'subject': 'Science', 'gradeBand': 'OL'},
    {'id': 'ol-english', 'label': 'O/L English past paper', 'subject': 'English', 'gradeBand': 'OL'},
    {'id': 'al-combined-maths', 'label': 'A/L Combined Maths past paper', 'subject': 'Combined Mathematics', 'gradeBand': 'AL'},
    {'id': 'al-physics', 'label': 'A/L Physics past paper', 'subject': 'Physics', 'gradeBand': 'AL'},
    {'id': 'al-chemistry', 'label': 'A/L Chemistry past paper', 'subject': 'Chemistry', 'gradeBand': 'AL'},
    {'id': 'al-biology', 'label': 'A/L Biology past paper', 'subject': 'Biology', 'gradeBand': 'AL'},
    {'id': 'al-accounting', 'label': 'A/L Accounting past paper', 'subject': 'Accounting', 'gradeBand': 'AL'},
]


def grade_band_for_grade(grade):
    try:
        g = int(grade)
    except (TypeError, ValueError):
        return None
    for band, info in GRADE_BANDS.items():
        if g in info['grades']:
            return band
    return None


def grades_compatible(grade1, grade2):
    """Same band; adjacent grades allowed within OL (10↔11) and AL (12↔13)."""
    try:
        g1, g2 = int(grade1), int(grade2)
    except (TypeError, ValueError):
        return False
    b1, b2 = grade_band_for_grade(g1), grade_band_for_grade(g2)
    if not b1 or b1 != b2:
        return False
    if g1 == g2:
        return True
    if b1 == 'OL' and {g1, g2} <= {10, 11}:
        return True
    if b1 == 'AL' and {g1, g2} <= {12, 13}:
        return True
    return False


def mentor_grades_compatible(mentor_grade, mentee_grade):
    """A/L mentor (12–13) may mentor O/L mentee (10–11) when mentor mode is on."""
    try:
        mg, lg = int(mentor_grade), int(mentee_grade)
    except (TypeError, ValueError):
        return False
    return grade_band_for_grade(mg) == 'AL' and grade_band_for_grade(lg) == 'OL'
