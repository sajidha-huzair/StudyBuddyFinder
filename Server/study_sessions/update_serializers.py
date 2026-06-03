from datetime import timedelta

from django.utils import timezone
from rest_framework import serializers

from .models import StudySession, SessionStatus


class StudySessionUpdateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200, required=False)
    subject = serializers.CharField(max_length=100, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    location = serializers.CharField(required=False, allow_blank=True)
    date = serializers.DateField(required=False)
    time = serializers.TimeField(required=False)
    duration = serializers.IntegerField(min_value=15, required=False)

    def validate(self, attrs):
        if 'date' in attrs and 'time' in attrs:
            from datetime import datetime
            scheduled_at = datetime.combine(attrs['date'], attrs['time'])
            if timezone.is_naive(scheduled_at):
                scheduled_at = timezone.make_aware(scheduled_at)
            if scheduled_at <= timezone.now():
                raise serializers.ValidationError('Session date and time must be in the future.')
            attrs['scheduled_at'] = scheduled_at
        return attrs

    def update(self, instance, validated_data):
        if 'subject' in validated_data:
            instance.course = validated_data.pop('subject')
        if 'duration' in validated_data:
            instance.duration_minutes = validated_data.pop('duration')
        validated_data.pop('date', None)
        validated_data.pop('time', None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        return instance
