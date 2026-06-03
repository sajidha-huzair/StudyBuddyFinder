import json
import os
import time

import requests
from django.conf import settings
from django.utils import timezone


def _jitsi_room_url(session):
    domain = getattr(settings, 'JITSI_DOMAIN', 'meet.jit.si')
    return f'https://{domain}/studybuddy-session-{session.id}'


def _daily_room_name(room_url):
    return room_url.rstrip('/').split('/')[-1]


def session_id_from_room_name(room_name):
    if room_name.startswith('studybuddy-'):
        try:
            return int(room_name.replace('studybuddy-', ''))
        except ValueError:
            return None
    return None


def create_meeting_token(session, user, start_recording=False):
    api_key = getattr(settings, 'DAILY_API_KEY', '')
    if not api_key or not session.video_room_url or 'daily.co' not in session.video_room_url:
        return None

    room_name = _daily_room_name(session.video_room_url)
    exp = int(time.time()) + (session.duration_minutes * 60) + 7200

    properties = {
        'room_name': room_name,
        'user_name': user.full_name or user.username,
        'is_owner': user.id == session.creator_id,
        'exp': exp,
    }
    if start_recording and user.id == session.creator_id:
        properties['start_cloud_recording'] = True

    try:
        response = requests.post(
            'https://api.daily.co/v1/meeting-tokens',
            headers={
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json',
            },
            json={'properties': properties},
            timeout=15,
        )
        if response.status_code in (200, 201):
            return response.json().get('token')
    except requests.RequestException:
        pass
    return None


def create_video_room(session):
    api_key = getattr(settings, 'DAILY_API_KEY', '')
    if not api_key:
        return _jitsi_room_url(session)

    try:
        response = requests.post(
            'https://api.daily.co/v1/rooms',
            headers={
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json',
            },
            json={
                'name': f'studybuddy-{session.id}',
                'privacy': 'private',
                'properties': {
                    'enable_chat': False,
                    'enable_advanced_chat': False,
                    'enable_shared_chat_history': False,
                    'enable_screenshare': True,
                    'enable_recording': 'cloud',
                    'max_participants': session.max_participants,
                    'exp': int(session.scheduled_at.timestamp()) + (session.duration_minutes * 60) + 7200,
                },
            },
            timeout=15,
        )
        if response.status_code in (200, 201):
            return response.json().get('url') or _jitsi_room_url(session)
    except requests.RequestException:
        pass

    return _jitsi_room_url(session)


def start_cloud_recording(session):
    api_key = getattr(settings, 'DAILY_API_KEY', '')
    if not api_key or not session.video_room_url or 'daily.co' not in session.video_room_url:
        return None

    room_name = _daily_room_name(session.video_room_url)
    try:
        response = requests.post(
            f'https://api.daily.co/v1/rooms/{room_name}/recordings/start',
            headers={'Authorization': f'Bearer {api_key}'},
            timeout=15,
        )
        if response.status_code in (200, 201):
            return response.json()
    except requests.RequestException:
        pass
    return None


def stop_cloud_recording(session):
    api_key = getattr(settings, 'DAILY_API_KEY', '')
    if not api_key or not session.video_room_url or 'daily.co' not in session.video_room_url:
        return None

    room_name = _daily_room_name(session.video_room_url)
    try:
        response = requests.post(
            f'https://api.daily.co/v1/rooms/{room_name}/recordings/stop',
            headers={'Authorization': f'Bearer {api_key}'},
            timeout=15,
        )
        if response.status_code in (200, 201):
            return response.json()
    except requests.RequestException:
        pass
    return None


def fetch_recording_download_url(recording_id):
    api_key = getattr(settings, 'DAILY_API_KEY', '')
    if not api_key or not recording_id:
        return None

    try:
        response = requests.get(
            f'https://api.daily.co/v1/recordings/{recording_id}/access-link',
            headers={'Authorization': f'Bearer {api_key}'},
            timeout=15,
        )
        if response.status_code == 200:
            return response.json().get('download_link') or response.json().get('download_url')
    except requests.RequestException:
        pass
    return None


def fetch_latest_room_recording(session):
    api_key = getattr(settings, 'DAILY_API_KEY', '')
    if not api_key or not session.video_room_url or 'daily.co' not in session.video_room_url:
        return None

    room_name = _daily_room_name(session.video_room_url)
    try:
        response = requests.get(
            'https://api.daily.co/v1/recordings',
            headers={'Authorization': f'Bearer {api_key}'},
            params={'room_name': room_name},
            timeout=15,
        )
        if response.status_code != 200:
            return None
        rows = response.json().get('data') or []
        if not rows:
            return None
        finished = [r for r in rows if r.get('status') == 'finished']
        candidates = finished if finished else rows
        candidates.sort(key=lambda r: r.get('start_ts') or 0, reverse=True)
        return candidates[0]
    except requests.RequestException:
        return None


def ensure_room_chat_disabled(session):
    api_key = getattr(settings, 'DAILY_API_KEY', '')
    if not api_key or not session.video_room_url or 'daily.co' not in session.video_room_url:
        return

    room_name = _daily_room_name(session.video_room_url)
    try:
        requests.post(
            f'https://api.daily.co/v1/rooms/{room_name}',
            headers={
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json',
            },
            json={
                'properties': {
                    'enable_chat': False,
                    'enable_advanced_chat': False,
                    'enable_shared_chat_history': False,
                },
            },
            timeout=15,
        )
    except requests.RequestException:
        pass
