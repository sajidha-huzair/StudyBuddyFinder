import os
import json


def generate_session_summary(session, notes, agenda=None):
    note_texts = []
    weak_topics = []
    for note in notes:
        if note.content:
            note_texts.append(note.content)
        weak_topics.extend(note.weak_topics or [])

    agenda_text = ''
    if agenda:
        parts = []
        if agenda.session_goal:
            parts.append(f"Goal: {agenda.session_goal}")
        if agenda.topics:
            parts.append(f"Topics: {', '.join(agenda.topics)}")
        if agenda.past_paper_ref:
            parts.append(f"Past paper: {agenda.past_paper_ref}")
        agenda_text = '\n'.join(parts)

    combined = '\n'.join(note_texts)
    api_key = os.environ.get('OPENAI_API_KEY', '').strip()

    if api_key and combined.strip():
        try:
            return _ai_summary(session, combined, agenda_text, weak_topics, api_key)
        except Exception:
            pass

    return _rule_based_summary(session, combined, agenda_text, weak_topics)


def _rule_based_summary(session, notes_text, agenda_text, weak_topics):
    lines = [f"Study session: {session.title} ({session.course})"]
    if agenda_text:
        lines.append(agenda_text)
    if notes_text.strip():
        lines.append(f"Notes from participants:\n{notes_text.strip()}")
    else:
        lines.append("No detailed notes were recorded for this session.")

    action_items = []
    if weak_topics:
        unique = list(dict.fromkeys(weak_topics))[:5]
        action_items = [f"Revise: {t}" for t in unique]
    else:
        action_items = [
            f"Review {session.course} topics covered in this session",
            "Attempt related past paper questions before the next session",
        ]

    return {
        'summary_text': '\n\n'.join(lines),
        'action_items': action_items,
        'ai_generated': False,
    }


def _ai_summary(session, notes_text, agenda_text, weak_topics, api_key):
    import urllib.request

    prompt = f"""You are a study assistant for Sri Lankan O/L and A/L students.
Summarize this online study session in 3-5 clear bullet points and suggest 2-4 action items.

Session: {session.title}
Subject: {session.course}
Agenda: {agenda_text or 'Not provided'}
Participant notes: {notes_text}
Topics still unclear: {', '.join(weak_topics) if weak_topics else 'None noted'}

Respond as JSON only: {{"summary": "...", "action_items": ["...", "..."]}}"""

    payload = json.dumps({
        'model': 'gpt-4o-mini',
        'messages': [{'role': 'user', 'content': prompt}],
        'temperature': 0.4,
    }).encode()

    req = urllib.request.Request(
        'https://api.openai.com/v1/chat/completions',
        data=payload,
        headers={
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
        },
        method='POST',
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode())

    content = data['choices'][0]['message']['content']
    parsed = json.loads(content)
    return {
        'summary_text': parsed.get('summary', content),
        'action_items': parsed.get('action_items', []),
        'ai_generated': True,
    }
