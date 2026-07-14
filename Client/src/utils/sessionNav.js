export function sessionTabForRecord(session) {
  if (!session) return 'upcoming';
  if (session.status === 'completed' || session.status === 'cancelled') return 'past';
  if (session.myInviteStatus === 'invited') return 'invitations';
  return 'upcoming';
}

export function buildSessionUrl(sessionId, tab = 'upcoming') {
  const params = new URLSearchParams({ tab, session: String(sessionId) });
  return `/sessions?${params.toString()}`;
}

export async function openSessionFromChat(navigate, sessionId, sessionService) {
  try {
    const session = await sessionService.getSessionById(sessionId);
    navigate(buildSessionUrl(sessionId, sessionTabForRecord(session)));
  } catch {
    navigate(buildSessionUrl(sessionId, 'upcoming'));
  }
}
