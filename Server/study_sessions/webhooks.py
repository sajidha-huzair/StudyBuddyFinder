import json

from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

from .recording_service import upsert_recording_from_webhook


@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def daily_webhook(request):
    try:
        payload = request.data if isinstance(request.data, dict) else json.loads(request.body)
    except (json.JSONDecodeError, TypeError):
        return Response({'error': 'Invalid payload'}, status=status.HTTP_400_BAD_REQUEST)

    event_type = payload.get('type') or payload.get('event')
    if event_type == 'recording.ready-to-download':
        recording = upsert_recording_from_webhook(payload)
        if recording:
            return Response({'success': True, 'recordingId': recording.daily_recording_id})

    return Response({'success': True, 'ignored': True})
