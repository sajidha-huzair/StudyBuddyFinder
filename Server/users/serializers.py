from rest_framework import serializers
from .models import User, UserRole
import json
from .learning_styles import learning_styles_from_prefs


def _parse_courses(user):
    raw = user.courses
    if isinstance(raw, str):
        try:
            raw = json.loads(raw or '{}')
        except json.JSONDecodeError:
            raw = {}
    if isinstance(raw, list):
        return {'subjects': raw, 'strengths': [], 'weaknesses': []}
    if isinstance(raw, dict):
        return raw
    return {'subjects': [], 'strengths': [], 'weaknesses': []}


def _parse_prefs(user):
    if isinstance(user.study_preferences, str):
        try:
            return json.loads(user.study_preferences or '{}')
        except json.JSONDecodeError:
            return {}
    return user.study_preferences if isinstance(user.study_preferences, dict) else {}


class UserSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    subjects = serializers.SerializerMethodField()
    strengths = serializers.SerializerMethodField()
    weaknesses = serializers.SerializerMethodField()
    studyGoals = serializers.SerializerMethodField()
    learningStyle = serializers.SerializerMethodField()
    learningStyles = serializers.SerializerMethodField()
    availability = serializers.SerializerMethodField()
    profileCompleted = serializers.SerializerMethodField()
    themePreference = serializers.SerializerMethodField()
    notificationPreferences = serializers.SerializerMethodField()
    avatarUrl = serializers.SerializerMethodField()
    educationLevel = serializers.CharField(source='education_level', required=False, allow_blank=True)
    gradeBand = serializers.CharField(source='grade_band', required=False, allow_blank=True)
    examYear = serializers.IntegerField(source='exam_year', required=False, allow_null=True)
    mentorMode = serializers.BooleanField(source='mentor_mode', required=False)
    parentEmail = serializers.EmailField(source='parent_email', required=False, allow_blank=True)
    schoolVerified = serializers.BooleanField(source='school_verified', read_only=True)
    school = serializers.CharField(source='university', required=False, allow_blank=True)
    studyLanguage = serializers.SerializerMethodField()
    groupSizePreference = serializers.SerializerMethodField()
    olOptional = serializers.SerializerMethodField()
    alSubjects = serializers.SerializerMethodField()
    technologyOption = serializers.SerializerMethodField()
    sitsGit = serializers.SerializerMethodField()
    pastPaperFocus = serializers.SerializerMethodField()
    explainPreference = serializers.SerializerMethodField()
    locale = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'full_name', 'name', 'role', 'bio',
            'educationLevel', 'school', 'university', 'major', 'year', 'grade',
            'gradeBand', 'stream', 'medium', 'examYear', 'district',
            'mentorMode', 'parentEmail', 'schoolVerified',
            'subjects', 'olOptional', 'alSubjects', 'technologyOption', 'sitsGit',
            'strengths', 'weaknesses', 'studyGoals', 'learningStyle', 'learningStyles',
            'studyLanguage', 'groupSizePreference', 'pastPaperFocus', 'explainPreference',
            'availability', 'profileCompleted', 'notificationPreferences', 'themePreference',
            'avatarUrl', 'locale', 'is_active', 'is_verified', 'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'schoolVerified']

    def get_avatarUrl(self, obj):
        if not obj.avatar:
            return None
        request = self.context.get('request')
        url = obj.avatar.url
        if request:
            return request.build_absolute_uri(url)
        return url

    def get_themePreference(self, obj):
        prefs = _parse_prefs(obj)
        return prefs.get('appearance', {}).get('theme', 'light')

    def get_name(self, obj):
        return obj.full_name or obj.username

    def get_subjects(self, obj):
        courses = _parse_courses(obj)
        if obj.grade_band == 'OL':
            return list(courses.get('compulsory', [])) + list(courses.get('optional', []))
        if obj.grade_band == 'AL':
            al = courses.get('alSubjects', [])
            return al if al else courses.get('subjects', [])
        return courses.get('subjects', [])

    def get_olOptional(self, obj):
        courses = _parse_courses(obj)
        return courses.get('optional', [])

    def get_alSubjects(self, obj):
        courses = _parse_courses(obj)
        return courses.get('alSubjects', [])

    def get_technologyOption(self, obj):
        courses = _parse_courses(obj)
        return courses.get('technologyOption', '')

    def get_sitsGit(self, obj):
        courses = _parse_courses(obj)
        return courses.get('sitsGit', False)

    def get_strengths(self, obj):
        courses = _parse_courses(obj)
        return courses.get('strengths', [])

    def get_weaknesses(self, obj):
        courses = _parse_courses(obj)
        return courses.get('weaknesses', [])

    def get_studyGoals(self, obj):
        return _parse_prefs(obj).get('studyGoals', [])

    def get_learningStyles(self, obj):
        return learning_styles_from_prefs(_parse_prefs(obj))

    def get_learningStyle(self, obj):
        styles = self.get_learningStyles(obj)
        return ', '.join(styles) if styles else ''

    def get_studyLanguage(self, obj):
        return _parse_prefs(obj).get('studyLanguage', '')

    def get_groupSizePreference(self, obj):
        return _parse_prefs(obj).get('groupSizePreference', '')

    def get_pastPaperFocus(self, obj):
        return _parse_prefs(obj).get('pastPaperFocus', False)

    def get_explainPreference(self, obj):
        return _parse_prefs(obj).get('explainPreference', '')

    def get_locale(self, obj):
        return _parse_prefs(obj).get('locale', 'en')

    def get_availability(self, obj):
        if isinstance(obj.availability, str) and obj.availability:
            return json.loads(obj.availability)
        if isinstance(obj.availability, dict):
            return obj.availability
        return {}

    def get_profileCompleted(self, obj):
        return _parse_prefs(obj).get('profileCompleted', False)

    def get_notificationPreferences(self, obj):
        defaults = {
            'email': True,
            'sessionReminders': True,
            'matchRecommendations': True,
        }
        prefs = _parse_prefs(obj)
        return {**defaults, **prefs.get('notifications', {})}


class UserPublicSerializer(serializers.ModelSerializer):
    subjects = serializers.SerializerMethodField()
    educationLevel = serializers.CharField(source='education_level', required=False, allow_blank=True)
    gradeBand = serializers.CharField(source='grade_band', read_only=True)
    school = serializers.CharField(source='university', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'full_name', 'bio', 'educationLevel', 'gradeBand',
            'school', 'university', 'grade', 'stream', 'medium', 'exam_year', 'district', 'subjects',
        ]

    def get_subjects(self, obj):
        courses = _parse_courses(obj)
        if isinstance(courses, list):
            return courses
        if obj.grade_band == 'OL':
            return list(courses.get('compulsory', [])) + list(courses.get('optional', []))
        if obj.grade_band == 'AL':
            return courses.get('alSubjects', [])
        return courses.get('subjects', [])


class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'full_name']
        extra_kwargs = {
            'email': {'validators': []},
            'username': {'validators': []},
        }

    def validate_email(self, value):
        email = (value or '').strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError(
                'An account with this email already exists. Try signing in instead.'
            )
        return email

    def validate(self, attrs):
        username = (attrs.get('username') or '').strip()
        email = attrs.get('email') or ''
        if not username:
            username = email.split('@')[0] if email else 'user'
        base = username[:140]
        candidate = base
        n = 1
        while User.objects.filter(username=candidate).exists():
            candidate = f'{base}{n}'
            n += 1
        attrs['username'] = candidate
        return attrs

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    educationLevel = serializers.CharField(source='education_level', required=False, allow_blank=True)
    gradeBand = serializers.CharField(source='grade_band', required=False, allow_blank=True)
    examYear = serializers.IntegerField(source='exam_year', required=False, allow_null=True)
    mentorMode = serializers.BooleanField(source='mentor_mode', required=False)
    parentEmail = serializers.EmailField(source='parent_email', required=False, allow_blank=True, allow_null=True)
    school = serializers.CharField(source='university', required=False, allow_blank=True)
    subjects = serializers.ListField(child=serializers.CharField(), required=False, write_only=True)
    olOptional = serializers.ListField(child=serializers.CharField(), required=False, write_only=True)
    alSubjects = serializers.ListField(child=serializers.CharField(), required=False, write_only=True)
    technologyOption = serializers.CharField(required=False, allow_blank=True, write_only=True)
    sitsGit = serializers.BooleanField(required=False, write_only=True)
    strengths = serializers.ListField(child=serializers.CharField(), required=False, write_only=True)
    weaknesses = serializers.ListField(child=serializers.CharField(), required=False, write_only=True)
    studyGoals = serializers.ListField(child=serializers.CharField(), required=False, write_only=True)
    learningStyles = serializers.ListField(child=serializers.CharField(), required=False, write_only=True)
    learningStyle = serializers.CharField(required=False, allow_blank=True, write_only=True)
    studyLanguage = serializers.CharField(required=False, allow_blank=True, write_only=True)
    groupSizePreference = serializers.CharField(required=False, allow_blank=True, write_only=True)
    pastPaperFocus = serializers.BooleanField(required=False, write_only=True)
    explainPreference = serializers.CharField(required=False, allow_blank=True, write_only=True)
    locale = serializers.CharField(required=False, allow_blank=True, write_only=True)
    profileCompleted = serializers.BooleanField(required=False, write_only=True)
    availability = serializers.JSONField(required=False)

    class Meta:
        model = User
        fields = [
            'bio', 'educationLevel', 'school', 'university', 'major', 'year', 'grade',
            'gradeBand', 'stream', 'medium', 'examYear', 'district',
            'mentorMode', 'parentEmail',
            'subjects', 'olOptional', 'alSubjects', 'technologyOption', 'sitsGit',
            'strengths', 'weaknesses', 'studyGoals', 'learningStyles', 'learningStyle',
            'studyLanguage', 'groupSizePreference', 'pastPaperFocus', 'explainPreference',
            'locale', 'availability', 'profileCompleted',
        ]

    def update(self, instance, validated_data):
        course_keys = {
            'subjects': validated_data.pop('subjects', None),
            'olOptional': validated_data.pop('olOptional', None),
            'alSubjects': validated_data.pop('alSubjects', None),
            'technologyOption': validated_data.pop('technologyOption', None),
            'sitsGit': validated_data.pop('sitsGit', None),
            'strengths': validated_data.pop('strengths', None),
            'weaknesses': validated_data.pop('weaknesses', None),
        }
        pref_keys = {
            'studyGoals': validated_data.pop('studyGoals', None),
            'learningStyles': validated_data.pop('learningStyles', None),
            'learningStyle': validated_data.pop('learningStyle', None),
            'studyLanguage': validated_data.pop('studyLanguage', None),
            'groupSizePreference': validated_data.pop('groupSizePreference', None),
            'pastPaperFocus': validated_data.pop('pastPaperFocus', None),
            'explainPreference': validated_data.pop('explainPreference', None),
            'locale': validated_data.pop('locale', None),
            'profileCompleted': validated_data.pop('profileCompleted', None),
        }
        availability = validated_data.pop('availability', None)

        if any(v is not None for v in course_keys.values()):
            courses_data = _parse_courses(instance)
            if course_keys['subjects'] is not None:
                courses_data['subjects'] = course_keys['subjects']
            if course_keys['olOptional'] is not None:
                courses_data['optional'] = course_keys['olOptional']
                courses_data['compulsory'] = course_keys['subjects'] or courses_data.get('compulsory', [])
            if course_keys['alSubjects'] is not None:
                courses_data['alSubjects'] = course_keys['alSubjects']
            if course_keys['technologyOption'] is not None:
                courses_data['technologyOption'] = course_keys['technologyOption']
            if course_keys['sitsGit'] is not None:
                courses_data['sitsGit'] = course_keys['sitsGit']
            if course_keys['strengths'] is not None:
                courses_data['strengths'] = course_keys['strengths']
            if course_keys['weaknesses'] is not None:
                courses_data['weaknesses'] = course_keys['weaknesses']
            instance.courses = json.dumps(courses_data)

        if any(v is not None for v in pref_keys.values()):
            prefs_data = _parse_prefs(instance)
            if pref_keys['learningStyles'] is not None:
                prefs_data['learningStyles'] = pref_keys['learningStyles']
                prefs_data.pop('learningStyle', None)
            elif pref_keys['learningStyle'] is not None:
                prefs_data['learningStyles'] = [pref_keys['learningStyle']] if pref_keys['learningStyle'] else []
                prefs_data.pop('learningStyle', None)
            for key in ('studyGoals', 'studyLanguage', 'groupSizePreference', 'pastPaperFocus',
                        'explainPreference', 'locale', 'profileCompleted'):
                val = pref_keys[key]
                if val is not None:
                    prefs_data[key] = val
            instance.study_preferences = json.dumps(prefs_data)

        if availability is not None:
            instance.availability = json.dumps(availability) if isinstance(availability, dict) else availability

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()
        return instance
