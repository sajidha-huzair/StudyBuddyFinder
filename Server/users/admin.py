from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.forms import UserCreationForm, UserChangeForm
from .models import User


class CustomUserCreationForm(UserCreationForm):
    class Meta:
        model = User
        fields = ('username', 'email')


class CustomUserChangeForm(UserChangeForm):
    class Meta:
        model = User
        fields = '__all__'


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    form = CustomUserChangeForm
    add_form = CustomUserCreationForm
    
    list_display = ['username', 'email', 'full_name', 'role', 'is_active', 'created_at']
    list_filter = ['role', 'is_active', 'is_verified']
    search_fields = ['username', 'email', 'full_name']
    readonly_fields = ['created_at', 'last_login']
    ordering = ['-created_at']
    
    fieldsets = (
        (None, {
            'fields': ('username', 'email', 'password')
        }),
        ('Personal Info', {
            'fields': ('full_name', 'bio', 'major', 'year')
        }),
        ('Academic Info', {
            'fields': ('courses', 'study_preferences', 'availability')
        }),
        ('Permissions', {
            'fields': ('role', 'is_active', 'is_verified', 'is_staff', 'is_superuser')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'last_login')
        }),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'password1', 'password2', 'role', 'full_name'),
        }),
    )
