import json



from rest_framework import serializers

from .models import ChatRoom, ChatRoomMessage, ChatRoomMember





def _parse_metadata(value):

    if not value:

        return {}

    if isinstance(value, dict):

        return value

    try:

        return json.loads(value)

    except (json.JSONDecodeError, TypeError):

        return {}





class ChatRoomMessageSerializer(serializers.ModelSerializer):

    senderId = serializers.IntegerField(source='sender_id', read_only=True)

    senderName = serializers.SerializerMethodField()

    messageType = serializers.CharField(source='message_type', read_only=True)

    metadata = serializers.SerializerMethodField()

    attachmentUrl = serializers.SerializerMethodField()

    timestamp = serializers.DateTimeField(source='created_at', read_only=True)



    class Meta:

        model = ChatRoomMessage

        fields = [

            'id', 'senderId', 'senderName', 'messageType', 'content',

            'metadata', 'attachmentUrl', 'timestamp',

        ]



    def get_senderName(self, obj):

        if not obj.sender:

            return 'System'

        return obj.sender.full_name or obj.sender.username



    def get_metadata(self, obj):

        return _parse_metadata(obj.metadata)



    def get_attachmentUrl(self, obj):

        if not obj.attachment:

            return None

        request = self.context.get('request')

        url = obj.attachment.url

        return request.build_absolute_uri(url) if request else url





class ChatRoomMemberSerializer(serializers.ModelSerializer):

    id = serializers.IntegerField(source='user_id', read_only=True)

    name = serializers.SerializerMethodField()



    class Meta:

        model = ChatRoomMember

        fields = ['id', 'name', 'joined_at']



    def get_name(self, obj):

        return obj.user.full_name or obj.user.username





class ChatRoomSerializer(serializers.ModelSerializer):

    sessionId = serializers.IntegerField(source='session_id', read_only=True)

    memberCount = serializers.SerializerMethodField()

    lastMessage = serializers.SerializerMethodField()

    lastMessageTime = serializers.SerializerMethodField()

    iconUrl = serializers.SerializerMethodField()



    class Meta:

        model = ChatRoom

        fields = [

            'id', 'title', 'description', 'iconUrl', 'room_type', 'sessionId',

            'memberCount', 'lastMessage', 'lastMessageTime', 'created_at', 'updated_at',

        ]



    def get_iconUrl(self, obj):

        if not obj.icon:

            return None

        request = self.context.get('request')

        url = obj.icon.url

        return request.build_absolute_uri(url) if request else url



    def get_memberCount(self, obj):

        return obj.members.count()



    def get_lastMessage(self, obj):

        last = obj.messages.order_by('-created_at').first()

        if not last:

            return 'No messages yet'

        if last.message_type == 'RECORDING':

            return 'Session recording'

        if last.message_type == 'FILE':

            meta = _parse_metadata(last.metadata)

            return meta.get('fileName') or last.content[:80]

        if last.message_type == 'SYSTEM':

            return last.content[:80]

        return last.content[:120]



    def get_lastMessageTime(self, obj):

        last = obj.messages.order_by('-created_at').first()

        return last.created_at.isoformat() if last else None





class ChatRoomDetailSerializer(ChatRoomSerializer):

    members = serializers.SerializerMethodField()

    canEdit = serializers.SerializerMethodField()

    sessionTitle = serializers.SerializerMethodField()

    subject = serializers.SerializerMethodField()



    class Meta(ChatRoomSerializer.Meta):

        fields = ChatRoomSerializer.Meta.fields + [

            'members', 'canEdit', 'sessionTitle', 'subject',

        ]



    def get_members(self, obj):

        return ChatRoomMemberSerializer(

            obj.members.select_related('user'), many=True,

        ).data



    def get_canEdit(self, obj):

        request = self.context.get('request')

        if not request or not request.user.is_authenticated:

            return False

        if obj.session_id and hasattr(obj, 'session') and obj.session:

            return obj.session.creator_id == request.user.id

        return obj.members.filter(user=request.user).exists()



    def get_sessionTitle(self, obj):

        if obj.session_id and hasattr(obj, 'session') and obj.session:

            return obj.session.title

        return None



    def get_subject(self, obj):

        if obj.session_id and hasattr(obj, 'session') and obj.session:

            return obj.session.course

        return None


