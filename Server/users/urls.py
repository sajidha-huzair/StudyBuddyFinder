from django.urls import path
from . import views

urlpatterns = [
    path('register', views.register, name='register'),
    path('login', views.login, name='login'),
    path('google', views.google_login, name='google-login'),
    path('forgot-password', views.forgot_password, name='forgot-password'),
    path('reset-password', views.reset_password, name='reset-password'),
    path('me', views.get_current_user, name='current-user'),
    path('profile', views.update_profile, name='update-profile'),
    path('avatar', views.upload_avatar, name='upload-avatar'),
    path('change-password', views.change_password, name='change-password'),
    path('preferences', views.update_preferences, name='update-preferences'),
    path('blocked', views.list_blocked_users, name='list-blocked'),
    path('block/<int:user_id>', views.block_user, name='block-user'),
    path('block/<int:user_id>/unblock', views.unblock_user, name='unblock-user'),
]
