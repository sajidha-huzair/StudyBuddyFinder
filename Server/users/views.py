from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.utils.crypto import get_random_string
from .models import User, BlockedUser, UserRole
from .serializers import UserSerializer, UserRegisterSerializer, UserProfileUpdateSerializer
from django.conf import settings
from .password_reset import (
    create_password_reset_token,
    clear_password_reset_token,
    find_user_by_reset_token,
)
from .google_auth import verify_google_id_token


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    serializer = UserRegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'access_token': str(refresh.access_token),
            'refresh_token': str(refresh),
            'token_type': 'bearer'
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    data = request.data
    if isinstance(data, str):
        import json
        try:
            data = json.loads(data)
        except json.JSONDecodeError:
            return Response({'error': 'Invalid JSON data'}, status=status.HTTP_400_BAD_REQUEST)

    email_or_username = data.get('email') or data.get('username')
    password = data.get('password')

    if not email_or_username or not password:
        return Response({'error': 'Email/username and password are required'}, status=status.HTTP_400_BAD_REQUEST)

    user = None
    if '@' in email_or_username:
        try:
            user_obj = User.objects.get(email=email_or_username)
            user = authenticate(username=user_obj.username, password=password)
        except User.DoesNotExist:
            pass
    else:
        user = authenticate(username=email_or_username, password=password)
    
    if user:
        from django.utils import timezone
        User.objects.filter(pk=user.pk).update(last_active_at=timezone.now())
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'access_token': str(refresh.access_token),
            'refresh_token': str(refresh),
            'token_type': 'bearer'
        })
    return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password(request):
    email = (request.data.get('email') or '').strip().lower()
    if not email:
        return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)

    message = 'If an account exists for that email, reset instructions have been sent.'
    payload = {'success': True, 'message': message}

    try:
        user = User.objects.get(email=email, is_active=True)
    except User.DoesNotExist:
        return Response(payload)

    token = create_password_reset_token(user)
    frontend_base = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
    reset_url = f'{frontend_base}/reset-password?token={token}'

    if settings.DEBUG:
        payload['resetUrl'] = reset_url
        print(f'[password reset] {email}: {reset_url}')

    return Response(payload)


@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password(request):
    token = (request.data.get('token') or '').strip()
    new_password = request.data.get('password') or request.data.get('newPassword')

    if not token or not new_password:
        return Response({'error': 'Token and new password are required'}, status=status.HTTP_400_BAD_REQUEST)
    if len(new_password) < 8:
        return Response({'error': 'Password must be at least 8 characters'}, status=status.HTTP_400_BAD_REQUEST)

    user = find_user_by_reset_token(token)
    if not user:
        return Response({'error': 'Invalid or expired reset link'}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_password)
    user.save()
    clear_password_reset_token(user)
    return Response({'success': True, 'message': 'Password reset successfully. You can sign in now.'})


@api_view(['POST'])
@permission_classes([AllowAny])
def google_login(request):
    id_token = request.data.get('credential') or request.data.get('id_token')
    client_id = getattr(settings, 'GOOGLE_CLIENT_ID', '')

    try:
        profile = verify_google_id_token(id_token, client_id)
    except ValueError as exc:
        return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    email = profile['email']
    user = User.objects.filter(email=email).first()

    if not user:
        base_username = email.split('@')[0].replace('.', '_')[:20]
        username = base_username
        suffix = 1
        while User.objects.filter(username=username).exists():
            username = f'{base_username}{suffix}'
            suffix += 1

        user = User.objects.create_user(
            email=email,
            username=username,
            password=get_random_string(32),
            full_name=profile['full_name'],
            role=UserRole.STUDENT,
            is_verified=True,
        )
    elif not user.is_active:
        return Response({'error': 'Account is disabled'}, status=status.HTTP_403_FORBIDDEN)

    refresh = RefreshToken.for_user(user)
    return Response({
        'user': UserSerializer(user).data,
        'access_token': str(refresh.access_token),
        'refresh_token': str(refresh),
        'token_type': 'bearer',
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_user(request):
    return Response(UserSerializer(request.user, context={'request': request}).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_avatar(request):
    import os
    upload = request.FILES.get('avatar') or request.FILES.get('file')
    if not upload:
        return Response({'error': 'No file uploaded'}, status=status.HTTP_400_BAD_REQUEST)

    max_bytes = getattr(settings, 'AVATAR_UPLOAD_MAX_BYTES', 2 * 1024 * 1024)
    if upload.size > max_bytes:
        return Response({'error': 'Image too large (max 2 MB)'}, status=status.HTTP_400_BAD_REQUEST)

    allowed = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
    ext = os.path.splitext(upload.name)[1].lower()
    if ext not in allowed:
        return Response({'error': 'Only JPG, PNG, GIF, or WebP images allowed'}, status=status.HTTP_400_BAD_REQUEST)

    user = request.user
    if user.avatar:
        user.avatar.delete(save=False)
    user.avatar = upload
    user.save(update_fields=['avatar'])
    return Response(UserSerializer(user, context={'request': request}).data)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_profile(request):
    serializer = UserProfileUpdateSerializer(request.user, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        request.user.refresh_from_db()
        return Response(UserSerializer(request.user, context={'request': request}).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    current_password = request.data.get('currentPassword') or request.data.get('current_password')
    new_password = request.data.get('newPassword') or request.data.get('new_password')

    if not current_password or not new_password:
        return Response({'error': 'Current and new password are required'}, status=status.HTTP_400_BAD_REQUEST)
    if len(new_password) < 8:
        return Response({'error': 'New password must be at least 8 characters'}, status=status.HTTP_400_BAD_REQUEST)
    if not request.user.check_password(current_password):
        return Response({'error': 'Current password is incorrect'}, status=status.HTTP_400_BAD_REQUEST)

    request.user.set_password(new_password)
    request.user.save()
    return Response({'success': True, 'message': 'Password updated successfully'})


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_preferences(request):
    import json
    user = request.user
    prefs = json.loads(user.study_preferences or '{}')

    notifications = request.data.get('notifications')
    privacy = request.data.get('privacy')
    appearance = request.data.get('appearance')
    if notifications is not None:
        prefs['notifications'] = notifications
    if privacy is not None:
        prefs['privacy'] = privacy
    if appearance is not None:
        prefs['appearance'] = {**prefs.get('appearance', {}), **appearance}

    user.study_preferences = json.dumps(prefs)
    user.save(update_fields=['study_preferences'])
    return Response({'success': True, 'preferences': prefs})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_blocked_users(request):
    blocks = BlockedUser.objects.filter(blocker=request.user).select_related('blocked')
    data = [
        {
            'id': block.blocked.id,
            'name': block.blocked.full_name or block.blocked.username,
            'blockedAt': block.created_at.isoformat(),
        }
        for block in blocks
    ]
    return Response(data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def block_user(request, user_id):
    if request.user.id == user_id:
        return Response({'error': 'You cannot block yourself'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        target = User.objects.get(id=user_id, is_active=True)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    BlockedUser.objects.get_or_create(blocker=request.user, blocked=target)
    return Response({'success': True, 'message': f'Blocked {target.full_name or target.username}'})


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def unblock_user(request, user_id):
    deleted, _ = BlockedUser.objects.filter(blocker=request.user, blocked_id=user_id).delete()
    if not deleted:
        return Response({'error': 'User is not blocked'}, status=status.HTTP_404_NOT_FOUND)
    return Response({'success': True, 'message': 'User unblocked'})


@api_view(['GET'])
@permission_classes([AllowAny])
def curriculum_config(request):
    from . import curriculum
    return Response({
        'gradeBands': curriculum.GRADE_BANDS,
        'juniorSubjects': curriculum.JUNIOR_SUBJECTS,
        'olCompulsory': curriculum.OL_COMPULSORY,
        'olOptionalBaskets': curriculum.OL_OPTIONAL_BASKETS,
        'alStreams': curriculum.AL_STREAMS,
        'alCommon': curriculum.AL_COMMON,
        'mediums': curriculum.MEDIUMS,
        'districts': curriculum.DISTRICTS,
        'studyGoals': curriculum.STUDY_GOALS,
        'learningStyles': curriculum.LEARNING_STYLES,
        'pastPaperTemplates': curriculum.PAST_PAPER_TEMPLATES,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_school_email(request):
    from .school_verify import verify_school_email as do_verify
    school_email = request.data.get('schoolEmail') or request.data.get('email')
    ok, message = do_verify(request.user, school_email)
    if not ok:
        return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)
    return Response({
        'success': True,
        'message': message,
        'user': UserSerializer(request.user, context={'request': request}).data,
    })
