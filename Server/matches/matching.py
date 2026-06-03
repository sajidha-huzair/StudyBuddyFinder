import json

from users.models import User


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


def _get_profile_data(user):
    courses = _parse_json_field(user.courses, {})
    prefs = _parse_json_field(user.study_preferences, {})

    if isinstance(courses, list):
        courses = {'subjects': courses, 'strengths': [], 'weaknesses': []}

    return {
        'subjects': courses.get('subjects', []),
        'strengths': courses.get('strengths', []),
        'weaknesses': courses.get('weaknesses', []),
        'learning_style': prefs.get('learningStyle', ''),
        'study_goals': prefs.get('studyGoals', []),
    }


def calculate_compatibility(user1, user2):
    return calculate_compatibility_detailed(user1, user2)['score']


def calculate_compatibility_detailed(user1, user2):
    profile1 = _get_profile_data(user1)
    profile2 = _get_profile_data(user2)

    subjects1 = set(profile1['subjects'])
    subjects2 = set(profile2['subjects'])
    strengths1 = set(profile1['strengths'])
    weaknesses1 = set(profile1['weaknesses'])
    strengths2 = set(profile2['strengths'])
    weaknesses2 = set(profile2['weaknesses'])
    style1 = profile1['learning_style']
    style2 = profile2['learning_style']

    shared_subjects = sorted(subjects1 & subjects2)
    subject_score = 0.0
    if subjects1 and subjects2:
        subject_score = (len(shared_subjects) / max(len(subjects1), len(subjects2))) * 40

    complement_pairs = []
    for s in strengths1 & weaknesses2:
        complement_pairs.append({'they_need_help_with': s, 'you_are_strong_in': s})
    for s in strengths2 & weaknesses1:
        complement_pairs.append({'you_need_help_with': s, 'they_are_strong_in': s})

    complement = len(complement_pairs)
    denom = max(len(strengths1) + len(strengths2) + len(weaknesses1) + len(weaknesses2), 1)
    complement_score = (complement / denom) * 35

    style_score = 0.0
    if style1 and style2:
        style_score = 15 if style1 == style2 else 7.5

    education_score = 0.0
    same_education = bool(
        user1.education_level and user1.education_level == user2.education_level
    )
    if same_education:
        education_score = 10

    total = round(min(subject_score + complement_score + style_score + education_score, 100), 1)

    reasons = []
    if shared_subjects:
        reasons.append(
            f"You both study {', '.join(shared_subjects)}."
        )
    for pair in complement_pairs[:3]:
        if 'they_are_strong_in' in pair:
            reasons.append(
                f"They're strong in {pair['they_are_strong_in']} where you want to improve."
            )
        else:
            reasons.append(
                f"You're strong in {pair['you_are_strong_in']} where they want to improve."
            )
    if style1 and style2:
        if style1 == style2:
            reasons.append(f"Same learning style ({style1}).")
        else:
            reasons.append(f"Different learning styles ({style1} vs {style2}) — still compatible.")
    if same_education:
        reasons.append(f"Same education level ({user1.education_level}).")
    if user1.university and user2.university and user1.university == user2.university:
        reasons.append(f"Both at {user1.university}.")

    if not reasons:
        reasons.append('Complete your profile to unlock more personalized match insights.')

    return {
        'score': total,
        'breakdown': {
            'sharedSubjects': round(subject_score, 1),
            'complementarity': round(complement_score, 1),
            'learningStyle': round(style_score, 1),
            'educationLevel': round(education_score, 1),
        },
        'sharedSubjects': shared_subjects,
        'complementPairs': complement_pairs,
        'reasons': reasons,
    }


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


def _build_recommendation_item(current_user, candidate):
    profile = _get_profile_data(candidate)
    detail = calculate_compatibility_detailed(current_user, candidate)
    return {
        'user': candidate,
        'compatibility_score': detail['score'],
        'profile': profile,
        'match_detail': detail,
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
    else:
        recommendations.sort(key=lambda item: item['compatibility_score'], reverse=True)
    return recommendations


def _apply_profile_filters(recommendations, subject=None, learning_style=None, min_score=0):
    filtered = []
    for item in recommendations:
        profile = item['profile']
        if subject and subject.lower() not in [s.lower() for s in profile['subjects']]:
            continue
        if learning_style and profile.get('learning_style', '') != learning_style:
            continue
        if item['compatibility_score'] < min_score:
            continue
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

    candidates = User.objects.filter(
        role='STUDENT',
        is_active=True,
    ).exclude(id__in=excluded_ids)

    if education_level:
        candidates = candidates.filter(education_level=education_level)

    if university:
        candidates = candidates.filter(university__icontains=university)

    if search:
        candidates = candidates.filter(
            Q(full_name__icontains=search) | Q(username__icontains=search)
        )

    recommendations = [_build_recommendation_item(current_user, candidate) for candidate in candidates]
    recommendations = _apply_profile_filters(
        recommendations,
        subject=subject,
        learning_style=learning_style,
        min_score=min_score,
    )
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

    recommendations = [_build_recommendation_item(current_user, candidate) for candidate in candidates]
    recommendations = _apply_profile_filters(
        recommendations,
        subject=subject,
        learning_style=learning_style,
        min_score=min_score,
    )
    return _sort_recommendations(recommendations, sort)
