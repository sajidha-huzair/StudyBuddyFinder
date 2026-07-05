import json

from users.models import User
from users.curriculum import grade_band_for_grade, grades_compatible, mentor_grades_compatible, GRADE_BANDS


def _parse_json_field(value, default=None):
    if default is None:
        default = {}
    if not value:
        return default
    if isinstance(value, (dict, list)):
        return value
    try:
        return json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return default


from users.learning_styles import learning_styles_from_prefs


def _get_profile_data(user):
    courses = _parse_json_field(user.courses, {})
    prefs = _parse_json_field(user.study_preferences, {})

    if isinstance(courses, list):
        courses = {'subjects': courses, 'strengths': [], 'weaknesses': []}

    subjects = courses.get('subjects', [])
    if not subjects and user.grade_band == 'OL':
        subjects = list(courses.get('compulsory', [])) + list(courses.get('optional', []))
    if not subjects and user.grade_band == 'AL':
        subjects = list(courses.get('alSubjects', []))

    return {
        'subjects': subjects,
        'strengths': courses.get('strengths', []),
        'weaknesses': courses.get('weaknesses', []),
        'learning_styles': learning_styles_from_prefs(prefs),
        'study_goals': prefs.get('studyGoals', []),
        'study_language': prefs.get('studyLanguage', ''),
        'group_size': prefs.get('groupSizePreference', ''),
        'grade_band': user.grade_band or grade_band_for_grade(user.grade),
        'grade': user.grade,
        'stream': user.stream,
        'medium': user.medium,
        'exam_year': user.exam_year,
        'district': user.district,
        'mentor_mode': user.mentor_mode,
        'school': user.university,
    }


def _availability_overlap_count(user1, user2):
    from study_sessions.availability_utils import get_shared_availability
    return get_shared_availability(user1, user2).get('overlapCount', 0)


def _is_eligible(current_user, candidate, match_type='all', mentor_context=False):
    p1 = _get_profile_data(current_user)
    p2 = _get_profile_data(candidate)

    if mentor_context or match_type == 'mentor':
        if current_user.mentor_mode and candidate.mentor_mode:
            return mentor_grades_compatible(candidate.grade, current_user.grade)
        if current_user.mentor_mode:
            return mentor_grades_compatible(current_user.grade, candidate.grade)
        if candidate.mentor_mode:
            return mentor_grades_compatible(candidate.grade, current_user.grade)
        return False

    g1, g2 = current_user.grade, candidate.grade
    if not g1 or not g2:
        return False
    if not grades_compatible(g1, g2):
        return False

    band = p1.get('grade_band') or grade_band_for_grade(g1)
    if band == 'AL':
        if not p1.get('stream') or p1.get('stream') != p2.get('stream'):
            return False

    subjects1 = set(p1['subjects'])
    subjects2 = set(p2['subjects'])
    if not subjects1 & subjects2:
        return False

    return True


def calculate_compatibility_detailed(user1, user2, match_type='all'):
    profile1 = _get_profile_data(user1)
    profile2 = _get_profile_data(user2)

    subjects1 = set(profile1['subjects'])
    subjects2 = set(profile2['subjects'])
    strengths1 = set(profile1['strengths'])
    weaknesses1 = set(profile1['weaknesses'])
    strengths2 = set(profile2['strengths'])
    weaknesses2 = set(profile2['weaknesses'])
    styles1 = set(profile1['learning_styles'])
    styles2 = set(profile2['learning_styles'])
    goals1 = set(profile1['study_goals'])
    goals2 = set(profile2['study_goals'])

    shared_subjects = sorted(subjects1 & subjects2)
    subject_score = 0.0
    if subjects1 and subjects2:
        subject_score = (len(shared_subjects) / max(len(subjects1), len(subjects2))) * 30

    complement_pairs = []
    for s in strengths1 & weaknesses2:
        complement_pairs.append({'they_need_help_with': s, 'you_are_strong_in': s})
    for s in strengths2 & weaknesses1:
        complement_pairs.append({'you_need_help_with': s, 'they_are_strong_in': s})

    complement = len(complement_pairs)
    denom = max(len(strengths1) + len(strengths2) + len(weaknesses1) + len(weaknesses2), 1)
    complement_score = (complement / denom) * 25

    shared_weak = len(set(profile1['weaknesses']) & set(profile2['weaknesses']))
    shared_weak_score = min(shared_weak * 5, 10)

    style_score = 0.0
    shared_styles = styles1 & styles2
    if styles1 and styles2:
        if shared_styles:
            style_score = min(len(shared_styles) / max(len(styles1), len(styles2)) * 10, 10)
        else:
            style_score = 5

    exam_score = 0.0
    if profile1.get('exam_year') and profile1['exam_year'] == profile2.get('exam_year'):
        exam_score = 10

    medium_score = 0.0
    if profile1.get('medium') and profile1['medium'] == profile2.get('medium'):
        medium_score = 10

    goal_score = 0.0
    if goals1 & goals2:
        goal_score = min(len(goals1 & goals2) * 5, 10)

    overlap = _availability_overlap_count(user1, user2)
    availability_score = min(overlap * 4, 15)

    match_type_boost = 0.0
    if match_type == 'complement' and complement > 0:
        match_type_boost = 10
    elif match_type == 'partner' and len(strengths1 & strengths2) > 0:
        match_type_boost = 8
    elif match_type == 'group' and overlap >= 2:
        match_type_boost = 8

    total = round(min(
        subject_score + complement_score + shared_weak_score + style_score
        + exam_score + medium_score + goal_score + availability_score + match_type_boost,
        100,
    ), 1)

    reasons = []
    band_label = GRADE_BANDS.get(profile1.get('grade_band'), {}).get('label', '')
    if user1.grade == user2.grade:
        reasons.append(f'Same grade — Grade {user1.grade} ({band_label}).')
    elif grades_compatible(user1.grade, user2.grade):
        reasons.append(f'Compatible grades — Grade {user1.grade} & Grade {user2.grade}.')

    if shared_subjects:
        reasons.append(f"You both study {', '.join(shared_subjects[:4])}.")
    for pair in complement_pairs[:3]:
        if 'they_are_strong_in' in pair:
            reasons.append(f"They're strong in {pair['they_are_strong_in']} where you want to improve.")
        else:
            reasons.append(f"You're strong in {pair['you_are_strong_in']} where they want to improve.")
    if profile1.get('exam_year') and profile1['exam_year'] == profile2.get('exam_year'):
        reasons.append(f"Both preparing for {profile1['exam_year']} exams.")
    if overlap > 0:
        reasons.append(f'{overlap} shared free time slot{"s" if overlap > 1 else ""} this week.')
    if profile1.get('medium') and profile1['medium'] == profile2.get('medium'):
        reasons.append(f'Same medium of study ({profile1["medium"]}).')
    if goals1 & goals2:
        reasons.append(f'Shared goals: {", ".join(sorted(goals1 & goals2)[:2])}.')
    if shared_styles:
        reasons.append(f'Shared learning styles: {", ".join(sorted(shared_styles))}.')

    if not reasons:
        reasons.append('Complete your profile to unlock more personalized match insights.')

    return {
        'score': total,
        'breakdown': {
            'sharedSubjects': round(subject_score, 1),
            'complementarity': round(complement_score, 1),
            'sharedWeakTopics': round(shared_weak_score, 1),
            'learningStyle': round(style_score, 1),
            'examYear': round(exam_score, 1),
            'medium': round(medium_score, 1),
            'studyGoals': round(goal_score, 1),
            'availability': round(availability_score, 1),
            'matchTypeBoost': round(match_type_boost, 1),
        },
        'sharedSubjects': shared_subjects,
        'complementPairs': complement_pairs,
        'reasons': reasons,
        'availabilityOverlap': overlap,
    }


def calculate_compatibility(user1, user2, match_type='all'):
    return calculate_compatibility_detailed(user1, user2, match_type)['score']


def get_excluded_user_ids(user):
    from django.db.models import Q
    from .models import Match, MatchStatus

    excluded = {user.id}
    matches = Match.objects.filter(
        Q(user1=user) | Q(user2=user)
    ).exclude(status=MatchStatus.REJECTED)

    for match in matches:
        excluded.add(match.user1_id)
        excluded.add(match.user2_id)

    return excluded


def _build_recommendation_item(current_user, candidate, match_type='all'):
    profile = _get_profile_data(candidate)
    mentor_context = match_type == 'mentor'
    detail = calculate_compatibility_detailed(current_user, candidate, match_type)
    return {
        'user': candidate,
        'compatibility_score': detail['score'],
        'profile': profile,
        'match_detail': detail,
        'match_type': match_type,
        'is_mentor_match': mentor_context,
    }


def _sort_recommendations(recommendations, sort='compatibility'):
    if sort == 'name':
        recommendations.sort(
            key=lambda item: (item['user'].full_name or item['user'].username or '').lower()
        )
    elif sort == 'active':
        recommendations.sort(
            key=lambda item: item['user'].last_active_at.timestamp()
            if item['user'].last_active_at else 0,
            reverse=True,
        )
    elif sort == 'availability':
        recommendations.sort(
            key=lambda item: item.get('match_detail', {}).get('availabilityOverlap', 0),
            reverse=True,
        )
    else:
        recommendations.sort(key=lambda item: item['compatibility_score'], reverse=True)
    return recommendations


def _apply_profile_filters(recommendations, subject=None, learning_style=None, min_score=0, district=None, medium=None):
    filtered = []
    for item in recommendations:
        profile = item['profile']
        if subject and subject.lower() not in [s.lower() for s in profile['subjects']]:
            continue
        if learning_style and learning_style not in profile.get('learning_styles', []):
            continue
        if district and (profile.get('district') or '').lower() != district.lower():
            continue
        if medium and profile.get('medium') != medium:
            continue
        if item['compatibility_score'] < min_score:
            continue
        filtered.append(item)
    return filtered


def _filter_by_match_type(recommendations, match_type, current_user):
    if match_type in ('', 'all', None):
        return recommendations

    filtered = []
    for item in recommendations:
        detail = item.get('match_detail', {})
        if match_type == 'complement':
            if detail.get('complementPairs'):
                filtered.append(item)
        elif match_type == 'partner':
            p1 = _get_profile_data(current_user)
            p2 = item['profile']
            if set(p1['strengths']) & set(p2['strengths']):
                filtered.append(item)
        elif match_type == 'group':
            if detail.get('availabilityOverlap', 0) >= 2:
                filtered.append(item)
        elif match_type == 'mentor':
            if item.get('is_mentor_match') or _is_eligible(current_user, item['user'], 'mentor', True):
                filtered.append(item)
        else:
            filtered.append(item)
    return filtered


def get_recommendations(
    current_user,
    subject=None,
    education_level=None,
    university=None,
    search=None,
    min_score=0,
    learning_style=None,
    sort='compatibility',
    grade_band=None,
    stream=None,
    district=None,
    medium=None,
    match_type='all',
):
    from django.db.models import Q
    from .models import Match, MatchStatus
    from users.blocking import get_blocked_user_ids

    excluded_ids = {current_user.id}
    excluded_ids.update(get_blocked_user_ids(current_user))
    related_matches = Match.objects.filter(
        Q(user1=current_user) | Q(user2=current_user)
    ).exclude(status=MatchStatus.REJECTED)

    for match in related_matches:
        excluded_ids.add(match.user1_id)
        excluded_ids.add(match.user2_id)

    candidates = User.objects.filter(role='STUDENT', is_active=True).exclude(id__in=excluded_ids)

    user_band = current_user.grade_band or grade_band_for_grade(current_user.grade)
    if match_type == 'mentor':
        if user_band == 'OL':
            candidates = candidates.filter(grade_band='AL', mentor_mode=True)
        elif user_band == 'AL' and current_user.mentor_mode:
            candidates = candidates.filter(grade_band='OL')
        else:
            return []
    elif user_band:
        candidates = candidates.filter(grade_band=user_band)
        if user_band == 'AL' and current_user.stream:
            candidates = candidates.filter(stream=current_user.stream)

    if education_level:
        candidates = candidates.filter(education_level=education_level)
    if grade_band:
        candidates = candidates.filter(grade_band=grade_band)
    if stream:
        candidates = candidates.filter(stream=stream)
    if district:
        candidates = candidates.filter(district__iexact=district)
    if medium:
        candidates = candidates.filter(medium=medium)
    if university:
        candidates = candidates.filter(university__icontains=university)
    if search:
        candidates = candidates.filter(
            Q(full_name__icontains=search) | Q(username__icontains=search)
        )

    mentor_context = match_type == 'mentor'
    recommendations = []
    for candidate in candidates:
        if _is_eligible(current_user, candidate, match_type, mentor_context):
            recommendations.append(_build_recommendation_item(current_user, candidate, match_type))

    recommendations = _apply_profile_filters(
        recommendations,
        subject=subject,
        learning_style=learning_style,
        min_score=min_score,
        district=district,
        medium=medium,
    )
    recommendations = _filter_by_match_type(recommendations, match_type, current_user)
    return _sort_recommendations(recommendations, sort)


def get_bookmarked_recommendations(
    current_user,
    subject=None,
    education_level=None,
    university=None,
    search=None,
    min_score=0,
    learning_style=None,
    sort='compatibility',
    grade_band=None,
    stream=None,
    district=None,
    medium=None,
    match_type='all',
):
    from django.db.models import Q
    from users.blocking import get_blocked_user_ids
    from users.bookmarks import get_bookmark_ids

    bookmark_ids = get_bookmark_ids(current_user)
    if not bookmark_ids:
        return []

    blocked_ids = get_blocked_user_ids(current_user)
    candidates = User.objects.filter(
        id__in=bookmark_ids,
        role='STUDENT',
        is_active=True,
    ).exclude(id__in=blocked_ids)

    if education_level:
        candidates = candidates.filter(education_level=education_level)
    if university:
        candidates = candidates.filter(university__icontains=university)
    if search:
        candidates = candidates.filter(
            Q(full_name__icontains=search) | Q(username__icontains=search)
        )

    mentor_context = match_type == 'mentor'
    recommendations = []
    for candidate in candidates:
        if _is_eligible(current_user, candidate, match_type, mentor_context):
            recommendations.append(_build_recommendation_item(current_user, candidate, match_type))

    recommendations = _apply_profile_filters(
        recommendations,
        subject=subject,
        learning_style=learning_style,
        min_score=min_score,
        district=district,
        medium=medium,
    )
    recommendations = _filter_by_match_type(recommendations, match_type, current_user)
    return _sort_recommendations(recommendations, sort)
