from rest_framework import serializers

from .models import SessionAgenda, SessionNote, SessionSummary, SubjectVaultFile


class SessionAgendaSerializer(serializers.ModelSerializer):
    pastPaperRef = serializers.CharField(source='past_paper_ref', required=False, allow_blank=True)
    preReadNotes = serializers.CharField(source='pre_read_notes', required=False, allow_blank=True)
    sessionGoal = serializers.CharField(source='session_goal', required=False, allow_blank=True)
    templateId = serializers.CharField(source='template_id', required=False, allow_blank=True)

    class Meta:
        model = SessionAgenda
        fields = [
            'topics', 'pastPaperRef', 'checklist', 'preReadNotes',
            'sessionGoal', 'templateId',
        ]


class SessionNoteSerializer(serializers.ModelSerializer):
    noteType = serializers.CharField(source='note_type')
    weakTopics = serializers.ListField(source='weak_topics', child=serializers.CharField(), required=False)

    class Meta:
        model = SessionNote
        fields = ['id', 'noteType', 'content', 'weakTopics', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class SessionSummarySerializer(serializers.ModelSerializer):
    actionItems = serializers.ListField(source='action_items', child=serializers.CharField(), read_only=True)
    aiGenerated = serializers.BooleanField(source='ai_generated', read_only=True)

    class Meta:
        model = SessionSummary
        fields = ['summary_text', 'actionItems', 'aiGenerated', 'created_at', 'updated_at']


class SubjectVaultFileSerializer(serializers.ModelSerializer):
    fileUrl = serializers.SerializerMethodField()
    fileName = serializers.SerializerMethodField()
    sessionTitle = serializers.SerializerMethodField()

    class Meta:
        model = SubjectVaultFile
        fields = [
            'id', 'subject', 'title', 'fileUrl', 'fileName', 'file_size',
            'session_id', 'sessionTitle', 'created_at',
        ]
        read_only_fields = ['id', 'file_size', 'created_at']

    def get_sessionTitle(self, obj):
        return obj.session.title if obj.session_id else None

    def get_fileUrl(self, obj):
        if not obj.file:
            return None
        request = self.context.get('request')
        url = obj.file.url
        return request.build_absolute_uri(url) if request else url

    def get_fileName(self, obj):
        return obj.file.name.split('/')[-1] if obj.file else ''
