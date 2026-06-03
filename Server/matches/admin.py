from django.contrib import admin
from .models import Match


@admin.register(Match)
class MatchAdmin(admin.ModelAdmin):
    list_display = ['user1', 'user2', 'compatibility_score', 'status', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['user1__username', 'user2__username']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Match Info', {
            'fields': ('user1', 'user2', 'compatibility_score', 'status')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )
