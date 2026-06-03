import api from './api';

const sessionService = {
  getSessions: async (filter = 'upcoming') => {
    const response = await api.get(`/sessions/?status=${filter}`);
    return response.data;
  },

  getSessionById: async (sessionId) => {
    const response = await api.get(`/sessions/${sessionId}/`);
    return response.data;
  },

  createSession: async (sessionData) => {
    const isOnline = sessionData.sessionFormat !== 'in_person';
    const payload = {
      title: sessionData.title,
      subject: sessionData.subject,
      date: sessionData.date,
      time: sessionData.time,
      duration: parseInt(sessionData.duration, 10),
      sessionFormat: sessionData.sessionFormat || (isOnline ? 'online' : 'in_person'),
      location: isOnline ? '' : (sessionData.location || ''),
      description: sessionData.description || '',
      maxParticipants: sessionData.maxParticipants || 5,
      invitedBuddies: sessionData.invitedBuddies || [],
      recurrence: sessionData.recurrence || 'none',
      recurrenceCount: parseInt(sessionData.recurrenceCount || 0, 10),
    };
    const response = await api.post('/sessions/', payload);
    return response.data;
  },

  updateSession: async (sessionId, sessionData) => {
    const response = await api.patch(`/sessions/${sessionId}/`, {
      title: sessionData.title,
      subject: sessionData.subject,
      date: sessionData.date,
      time: sessionData.time,
      duration: parseInt(sessionData.duration, 10),
      location: sessionData.location || '',
      description: sessionData.description || '',
    });
    return response.data;
  },

  startMeeting: async (sessionId) => {
    const response = await api.post(`/sessions/${sessionId}/start_meeting/`);
    return response.data;
  },

  endMeeting: async (sessionId) => {
    const response = await api.post(`/sessions/${sessionId}/end_meeting/`);
    return response.data;
  },

  syncRecording: async (sessionId) => {
    const response = await api.post(`/sessions/${sessionId}/sync_recording/`);
    return response.data;
  },

  getVideoRoom: async (sessionId) => {
    const response = await api.get(`/sessions/${sessionId}/video/`);
    return response.data;
  },

  acceptInvite: async (sessionId) => {
    const response = await api.post(`/sessions/${sessionId}/accept_invite/`);
    return response.data;
  },

  declineInvite: async (sessionId) => {
    const response = await api.post(`/sessions/${sessionId}/decline_invite/`);
    return response.data;
  },

  joinSession: async (sessionId) => {
    const response = await api.post(`/sessions/${sessionId}/join/`);
    return response.data;
  },

  completeSession: async (sessionId) => {
    const response = await api.post(`/sessions/${sessionId}/complete/`);
    return response.data;
  },

  leaveSession: async (sessionId) => {
    const response = await api.post(`/sessions/${sessionId}/cancel/`);
    return response.data;
  },

  cancelSession: async (sessionId) => {
    const response = await api.post(`/sessions/${sessionId}/cancel/`);
    return response.data;
  },

  deleteSession: async (sessionId) => {
    const response = await api.delete(`/sessions/${sessionId}/`);
    return response.data;
  },

  checkAvailability: async (date, time, invitedBuddies) => {
    const response = await api.post('/sessions/check_availability/', {
      date,
      time,
      invitedBuddies,
    });
    return response.data;
  },
};

export default sessionService;
