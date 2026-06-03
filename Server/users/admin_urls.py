from django.urls import path
from . import admin_views

urlpatterns = [
    path('stats', admin_views.admin_stats, name='admin-stats'),
    path('system-stats', admin_views.admin_system_stats, name='admin-system-stats'),
    path('users', admin_views.admin_users, name='admin-users'),
    path('users/<int:user_id>/toggle', admin_views.admin_toggle_user, name='admin-toggle-user'),
    path('users/<int:user_id>/delete', admin_views.admin_delete_user, name='admin-delete-user'),
]
