import json
import urllib.error
import urllib.request


def verify_google_id_token(id_token, client_id):
    if not id_token or not client_id:
        raise ValueError('Google sign-in is not configured')

    url = f'https://oauth2.googleapis.com/tokeninfo?id_token={id_token}'
    try:
        with urllib.request.urlopen(url, timeout=10) as response:
            data = json.loads(response.read().decode())
    except urllib.error.HTTPError as exc:
        raise ValueError('Invalid Google token') from exc

    aud = data.get('aud') or data.get('azp')
    if aud != client_id:
        raise ValueError('Google token audience mismatch')

    email = data.get('email')
    if not email:
        raise ValueError('Google account has no email')

    verified = data.get('email_verified')
    if str(verified).lower() not in ('true', '1'):
        raise ValueError('Google email is not verified')

    return {
        'email': email.lower(),
        'full_name': data.get('name') or email.split('@')[0],
        'google_sub': data.get('sub'),
    }
