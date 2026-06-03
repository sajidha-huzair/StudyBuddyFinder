from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve

from study_sessions.webhooks import daily_webhook
from studybuddy.views import health_check

urlpatterns = [
    path('api/health/', health_check, name='health-check'),
    path('admin/', admin.site.urls),
    path('api/auth/', include('users.urls')),
    path('api/admin/', include('users.admin_urls')),
    path('api/analytics/', include('users.analytics_urls')),
    path('api/sessions/', include('study_sessions.urls')),
    path('api/matches/', include('matches.urls')),
    path('api/reports/', include('reports.urls')),
    path('api/notifications/', include('notifications.urls')),
    path('api/messages/', include('chat.urls')),
    path('api/webhooks/daily/', daily_webhook, name='daily-webhook'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
else:
    urlpatterns += [
        re_path(
            r'^media/(?P<path>.*)$',
            serve,
            {'document_root': settings.MEDIA_ROOT},
        ),
    ]
