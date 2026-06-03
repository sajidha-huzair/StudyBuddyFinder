import api from './api';

const DEMO_MODE = false;

const MOCK_NOTIFICATIONS = [
  {
    id: 1,
    type: 'buddy_request',
    title: 'New Study Buddy Request',
    message: 'Nina Patel sent you a study buddy request',
    read: false,
    createdAt: '2026-01-16T10:30:00',
    link: '/requests'
  },
  {
    id: 2,
    type: 'session_reminder',
    title: 'Upcoming Session',
    message: 'Calculus Study Group starts in 1 hour',
    read: false,
    createdAt: '2026-01-17T13:00:00',
    link: '/sessions'
  },
  {
    id: 3,
    type: 'buddy_accepted',
    title: 'Request Accepted',
    message: 'Tom Wilson accepted your study buddy request',
    read: true,
    createdAt: '2026-01-15T16:45:00',
    link: '/matches'
  },
  {
    id: 4,
    type: 'session_invite',
    title: 'Session Invitation',
    message: 'You\'re invited to Physics Problem Solving session',
    read: true,
    createdAt: '2026-01-14T09:20:00',
    link: '/sessions/2'
  },
  {
    id: 5,
    type: 'feedback_request',
    title: 'Rate Your Session',
    message: 'Please provide feedback for Math Exam Review session',
    read: false,
    createdAt: '2026-01-10T15:30:00',
    link: '/sessions/history'
  }
];

const notificationService = {
  getNotifications: async () => {
    if (DEMO_MODE) {
      await new Promise(resolve => setTimeout(resolve, 300));
      return MOCK_NOTIFICATIONS;
    }
    const response = await api.get('/notifications/');
    return response.data;
  },

  markAsRead: async (notificationId) => {
    if (DEMO_MODE) {
      await new Promise(resolve => setTimeout(resolve, 200));
      const notification = MOCK_NOTIFICATIONS.find(n => n.id === notificationId);
      if (notification) notification.read = true;
      return { success: true };
    }
    const response = await api.put(`/notifications/${notificationId}/read/`);
    return response.data;
  },

  markAllAsRead: async () => {
    if (DEMO_MODE) {
      await new Promise(resolve => setTimeout(resolve, 200));
      MOCK_NOTIFICATIONS.forEach(n => n.read = true);
      return { success: true, message: 'All notifications marked as read' };
    }
    const response = await api.put('/notifications/read-all/');
    return response.data;
  },

  deleteNotification: async (notificationId) => {
    if (DEMO_MODE) {
      await new Promise(resolve => setTimeout(resolve, 200));
      return { success: true, message: 'Notification deleted' };
    }
    const response = await api.delete(`/notifications/${notificationId}/`);
    return response.data;
  }
};

export default notificationService;
