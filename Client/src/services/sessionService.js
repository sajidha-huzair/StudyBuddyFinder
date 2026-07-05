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

  getTemplates: async () => {
    const response = await api.get('/sessions/templates/');
    return response.data;
  },

  createSession: async (sessionData) => {
    const payload = {
      title: sessionData.title,
      subject: sessionData.subject,
      date: sessionData.date,
      time: sessionData.time,
      duration: parseInt(sessionData.duration, 10),
      sessionFormat: 'online',
      location: '',
      description: sessionData.description || '',
      maxParticipants: sessionData.maxParticipants || 5,
      invitedBuddies: sessionData.invitedBuddies || [],
      recurrence: sessionData.recurrence || 'none',
      recurrenceCount: parseInt(sessionData.recurrenceCount || 0, 10),
      agenda: sessionData.agenda || undefined,
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
      location: '',
      description: sessionData.description || '',
    });
    return response.data;
  },

  getAgenda: async (sessionId) => {
    const response = await api.get(`/sessions/${sessionId}/agenda/`);
    return response.data;
  },

  saveAgenda: async (sessionId, agenda) => {
    const response = await api.put(`/sessions/${sessionId}/agenda/`, agenda);
    return response.data;
  },

  getNotes: async (sessionId) => {
    const response = await api.get(`/sessions/${sessionId}/notes/`);
    return response.data;
  },

  saveNote: async (sessionId, note) => {
    const response = await api.post(`/sessions/${sessionId}/notes/`, note);
    return response.data;
  },

  getSummary: async (sessionId) => {
    const response = await api.get(`/sessions/${sessionId}/summary/`);
    return response.data;
  },

  generateSummary: async (sessionId) => {
    const response = await api.post(`/sessions/${sessionId}/summary/`);
    return response.data;
  },

  getVaultFiles: async (subject = '') => {
    const response = await api.get('/sessions/vault_all/', {
      params: subject ? { subject } : {},
    });
    return response.data;
  },

  uploadVaultFile: async (sessionId, file, title) => {
    const form = new FormData();
    form.append('file', file);
    if (title) form.append('title', title);
    const response = await api.post(`/sessions/${sessionId}/vault/`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  uploadVaultFileStandalone: async (file, { subject, title, sessionId } = {}) => {
    const form = new FormData();
    form.append('file', file);
    form.append('subject', subject);
    if (title) form.append('title', title);
    if (sessionId) form.append('sessionId', sessionId);
    const response = await api.post('/sessions/vault_all/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  renameVaultFile: async (fileId, title) => {
    const response = await api.patch(`/sessions/vault_files/${fileId}/`, { title });
    return response.data;
  },

  deleteVaultFile: async (fileId) => {
    await api.delete(`/sessions/vault_files/${fileId}/`);
  },

  shareVaultFile: async (fileId, { buddyId, roomId, message } = {}) => {
    const response = await api.post(`/sessions/vault_files/${fileId}/share/`, {
      buddyId,
      roomId,
      message,
    });
    return response.data;
  },

  fetchVaultFilePreview: async (fileId) => {
    const response = await api.get(`/sessions/vault_files/${fileId}/preview/`, {
      responseType: 'blob',
    });
    return response.data;
  },

  sendParentLink: async (parentEmail) => {
    const response = await api.post('/sessions/parent_link/', { parentEmail });
    return response.data;
  },

  getParentView: async (token) => {
    const response = await api.get(`/sessions/parent_view/?token=${encodeURIComponent(token)}`);
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
