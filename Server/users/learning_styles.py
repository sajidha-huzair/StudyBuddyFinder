"""Normalize learning style prefs (supports legacy single string or array)."""


def learning_styles_from_prefs(prefs):
    if not prefs:
        return []
    styles = prefs.get('learningStyles')
    if isinstance(styles, list):
        return [s for s in styles if s]
    legacy = prefs.get('learningStyle', '')
    if isinstance(legacy, list):
        return [s for s in legacy if s]
    if legacy:
        return [legacy]
    return []
