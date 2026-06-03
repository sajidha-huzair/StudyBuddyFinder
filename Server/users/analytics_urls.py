from django.urls import path
from . import analytics_views

urlpatterns = [
    path('me', analytics_views.my_analytics, name='my-analytics'),
]
