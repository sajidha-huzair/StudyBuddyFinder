from django.urls import path
from .views import MessageViewSet
from .room_views import ChatRoomViewSet

message_list = MessageViewSet.as_view({'get': 'conversations', 'post': 'create'})
message_with_buddy = MessageViewSet.as_view({'get': 'with_buddy'})

urlpatterns = [
    path('', message_list, name='messages'),
    path('mark-read/', MessageViewSet.as_view({'post': 'mark_read'}), name='messages-mark-read'),
    path('<int:pk>/pin/', MessageViewSet.as_view({'post': 'pin'}), name='messages-pin'),
    path('with/<int:buddy_id>/media/', MessageViewSet.as_view({'get': 'buddy_media'}), name='messages-buddy-media'),
    path('with/<int:buddy_id>/', MessageViewSet.as_view({'get': 'with_buddy'}), name='messages-with-buddy'),
    path('rooms/', ChatRoomViewSet.as_view({'get': 'list'}), name='chat-rooms'),
    path('rooms/for-session/<int:session_id>/', ChatRoomViewSet.as_view({'get': 'for_session'}), name='chat-room-for-session'),
    path('rooms/<int:pk>/', ChatRoomViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update'}), name='chat-room-detail'),
    path('rooms/<int:pk>/media/', ChatRoomViewSet.as_view({'get': 'media'}), name='chat-room-media'),
    path('rooms/<int:pk>/messages/', ChatRoomViewSet.as_view({'get': 'messages'}), name='chat-room-messages'),
    path('rooms/<int:pk>/send/', ChatRoomViewSet.as_view({'post': 'send'}), name='chat-room-send'),
]
