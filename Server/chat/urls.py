from django.urls import path
from .views import MessageViewSet

message_list = MessageViewSet.as_view({'get': 'conversations', 'post': 'create'})
message_with_buddy = MessageViewSet.as_view({'get': 'with_buddy'})

urlpatterns = [
    path('', message_list, name='messages'),
    path('mark-read/', MessageViewSet.as_view({'post': 'mark_read'}), name='messages-mark-read'),
    path('<int:pk>/pin/', MessageViewSet.as_view({'post': 'pin'}), name='messages-pin'),
    path('with/<int:buddy_id>/', MessageViewSet.as_view({'get': 'with_buddy'}), name='messages-with-buddy'),
]
