from rest_framework import serializers
from .models import Report


class ReportSerializer(serializers.ModelSerializer):
    reporter = serializers.SerializerMethodField()
    reported = serializers.SerializerMethodField()
    date = serializers.DateTimeField(source='created_at', read_only=True)
    status = serializers.SerializerMethodField()

    class Meta:
        model = Report
        fields = [
            'id', 'reporter', 'reported', 'reported_user', 'reason', 'description',
            'status', 'admin_notes', 'resolved_by', 'date', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_reporter(self, obj):
        return obj.reporter.full_name or obj.reporter.username

    def get_reported(self, obj):
        return obj.reported_user.full_name or obj.reported_user.username

    def get_status(self, obj):
        return (obj.status or 'PENDING').lower()


class ReportCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = ['reported_user', 'reason', 'description']
