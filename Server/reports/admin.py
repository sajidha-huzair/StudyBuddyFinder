from django.contrib import admin
from .models import Report


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ['reporter', 'reported_user', 'reason', 'status', 'created_at']
    list_filter = ['status', 'reason', 'created_at']
    search_fields = ['reporter__username', 'reported_user__username', 'description']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Report Info', {
            'fields': ('reporter', 'reported_user', 'reason', 'description')
        }),
        ('Resolution', {
            'fields': ('status', 'admin_notes', 'resolved_by')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )
