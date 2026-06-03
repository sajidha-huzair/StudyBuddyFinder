from rest_framework import serializers
from .models import User, UserRole
import json


class UserSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    subjects = serializers.SerializerMethodField()
    strengths = serializers.SerializerMethodField()
    weaknesses = serializers.SerializerMethodField()
    studyGoals = serializers.SerializerMethodField()
    learningStyle = serializers.SerializerMethodField()
    availability = serializers.SerializerMethodField()
    profileCompleted = serializers.SerializerMethodField()
    themePreference = serializers.SerializerMethodField()
    notificationPreferences = serializers.SerializerMethodField()
    avatarUrl = serializers.SerializerMethodField()
    educationLevel = serializers.CharField(source='education_level', required=False, allow_blank=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'full_name', 'name', 'role', 'bio',
            'educationLevel', 'university', 'major', 'year', 'grade',
            'subjects', 'strengths', 'weaknesses', 'studyGoals', 'learningStyle',
            'availability', 'profileCompleted', 'notificationPreferences', 'themePreference',
            'avatarUrl', 'is_active', 'is_verified', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_avatarUrl(self, obj):
        if not obj.avatar:
            return None
        request = self.context.get('request')
        url = obj.avatar.url
        if request:
            return request.build_absolute_uri(url)
        return url

    def get_themePreference(self, obj):
        if isinstance(obj.study_preferences, str) and obj.study_preferences:
            prefs = json.loads(obj.study_preferences)
            return prefs.get('appearance', {}).get('theme', 'light')
        return 'light'

    def get_name(self, obj):
        return obj.full_name or obj.username

    def get_subjects(self, obj):
        if isinstance(obj.courses, str):
            courses_data = json.loads(obj.courses)
            if isinstance(courses_data, dict):
                return courses_data.get('subjects', [])
            return courses_data if isinstance(courses_data, list) else []
        return []

    def get_strengths(self, obj):
        if isinstance(obj.courses, str):
            courses_data = json.loads(obj.courses)
            if isinstance(courses_data, dict):
                return courses_data.get('strengths', [])
        return []
    
    def get_weaknesses(self, obj):
        if isinstance(obj.courses, str):
            courses_data = json.loads(obj.courses)
            if isinstance(courses_data, dict):
                return courses_data.get('weaknesses', [])
        return []
    
    def get_studyGoals(self, obj):
        if isinstance(obj.study_preferences, str):
            prefs = json.loads(obj.study_preferences)
            return prefs.get('studyGoals', [])
        return []
    
    def get_learningStyle(self, obj):
        if isinstance(obj.study_preferences, str):
            prefs = json.loads(obj.study_preferences)
            return prefs.get('learningStyle', '')
        return ''
    
    def get_availability(self, obj):
        if isinstance(obj.availability, str) and obj.availability:
            return json.loads(obj.availability)
        if isinstance(obj.availability, dict):
            return obj.availability
        return {}

    def get_profileCompleted(self, obj):
        if isinstance(obj.study_preferences, str) and obj.study_preferences:
            prefs = json.loads(obj.study_preferences)
            return prefs.get('profileCompleted', False)
        return False

    def get_notificationPreferences(self, obj):
        defaults = {
            'email': True,
            'sessionReminders': True,
            'matchRecommendations': True,
        }
        if isinstance(obj.study_preferences, str) and obj.study_preferences:
            prefs = json.loads(obj.study_preferences)
            return {**defaults, **prefs.get('notifications', {})}
        return defaults


class UserPublicSerializer(serializers.ModelSerializer):
    subjects = serializers.SerializerMethodField()
    educationLevel = serializers.CharField(source='education_level', required=False, allow_blank=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'full_name', 'bio', 'educationLevel', 'university', 'major', 'year', 'subjects']
    
    def get_subjects(self, obj):
        if isinstance(obj.courses, str):
            courses_data = json.loads(obj.courses)
            if isinstance(courses_data, dict):
                return courses_data.get('subjects', [])
            return courses_data if isinstance(courses_data, list) else []
        return []


class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'full_name']
    
    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    educationLevel = serializers.CharField(source='education_level', required=False, allow_blank=True)
    subjects = serializers.ListField(child=serializers.CharField(), required=False, write_only=True)
    strengths = serializers.ListField(child=serializers.CharField(), required=False, write_only=True)
    weaknesses = serializers.ListField(child=serializers.CharField(), required=False, write_only=True)
    studyGoals = serializers.ListField(child=serializers.CharField(), required=False, write_only=True)
    learningStyle = serializers.CharField(required=False, allow_blank=True, write_only=True)
    profileCompleted = serializers.BooleanField(required=False, write_only=True)
    availability = serializers.JSONField(required=False)
    
    class Meta:
        model = User
        fields = [
            'bio', 'educationLevel', 'university', 'major', 'year', 'grade',
            'subjects', 'strengths', 'weaknesses', 'studyGoals', 'learningStyle',
            'availability', 'profileCompleted'
        ]
    
    def update(self, instance, validated_data):
        subjects = validated_data.pop('subjects', None)
        strengths = validated_data.pop('strengths', None)
        weaknesses = validated_data.pop('weaknesses', None)
        study_goals = validated_data.pop('studyGoals', None)
        learning_style = validated_data.pop('learningStyle', None)
        profile_completed = validated_data.pop('profileCompleted', None)
        availability = validated_data.pop('availability', None)
        
        if subjects is not None or strengths is not None or weaknesses is not None:
            courses_data = {
                'subjects': subjects or [],
                'strengths': strengths or [],
                'weaknesses': weaknesses or []
            }
            instance.courses = json.dumps(courses_data)
        
        if any(v is not None for v in [learning_style, study_goals, profile_completed]):
            prefs_data = json.loads(instance.study_preferences or '{}')
            if learning_style is not None:
                prefs_data['learningStyle'] = learning_style
            if study_goals is not None:
                prefs_data['studyGoals'] = study_goals
            if profile_completed is not None:
                prefs_data['profileCompleted'] = profile_completed
            instance.study_preferences = json.dumps(prefs_data)
        
        if availability is not None:
            if isinstance(availability, dict):
                instance.availability = json.dumps(availability)
            elif isinstance(availability, str):
                json.loads(availability)
                instance.availability = availability
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        return instance
