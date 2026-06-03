export const resolveNotificationRoute = (notification) => {
  const { link, type } = notification;

  if (link) {
    if (link.startsWith('/admin/')) {
      return link;
    }
    if (link.startsWith('/sessions')) {
      const query = link.includes('?') ? link.split('?')[1] : '';
      const params = new URLSearchParams(query);
      if (params.get('tab') === 'invitations') {
        return '/sessions?tab=invitations';
      }
      return '/sessions';
    }
    if (link.startsWith('/chat/')) {
      return link;
    }
    if (link.startsWith('/chat')) {
      return '/chat';
    }
    return link;
  }

  const defaults = {
    buddy_request: '/requests',
    buddy_accepted: '/matches',
    buddy_rejected: '/requests',
    session_invite: '/sessions?tab=invitations',
    session_reminder: '/sessions',
    new_message: '/chat',
    system: '/admin/reports',
  };

  return defaults[type] || '/dashboard';
};
