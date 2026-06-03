from django.contrib import admin
from .models import StudySession


@admin.register(StudySession)
class StudySessionAdmin(admin.ModelAdmin):
    list_display = ['title', 'course', 'creator', 'partner', 'status', 'scheduled_at', 'created_at']
    list_filter = ['status', 'course', 'created_at']
    search_fields = ['title', 'course', 'creator__username', 'partner__username']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Session Info', {
            'fields': ('title', 'description', 'course')
        }),
        ('Participants', {
            'fields': ('creator', 'partner')
        }),
        ('Schedule', {
            'fields': ('scheduled_at', 'duration_minutes', 'location', 'status')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )
