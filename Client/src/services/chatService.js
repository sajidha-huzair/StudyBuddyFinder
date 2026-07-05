import api from './api';

const chatService = {
  getConversations: async () => {
    const response = await api.get('/messages/');
    return response.data;
  },

  getMessages: async (buddyId, q = '') => {
    const response = await api.get(`/messages/with/${buddyId}/`, {
      params: q ? { q } : {},
    });
    return response.data;
  },

  sendMessage: async (recipientId, content) => {
    const response = await api.post('/messages/', {
      recipient_id: recipientId,
      content,
    });
    return response.data;
  },

  sendFile: async (recipientId, file, content = '') => {
    const formData = new FormData();
    formData.append('recipient_id', recipientId);
    formData.append('file', file);
    if (content) formData.append('content', content);
    const response = await api.post('/messages/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  sendSessionProposal: async (recipientId, proposal) => {
    const response = await api.post('/messages/', {
      recipient_id: recipientId,
      message_type: 'SESSION_PROPOSAL',
      content: proposal.content || `Session invite: ${proposal.title}`,
      metadata: proposal,
    });
    return response.data;
  },

  togglePin: async (messageId) => {
    const response = await api.post(`/messages/${messageId}/pin/`);
    return response.data;
  },

  markRead: async (buddyId, messageIds = []) => {
    const response = await api.post('/messages/mark-read/', {
      buddyId,
      messageIds,
    });
    return response.data;
  },

  getChatRooms: async () => {
    const response = await api.get('/messages/rooms/');
    return response.data;
  },

  getChatRoomForSession: async (sessionId) => {
    const response = await api.get(`/messages/rooms/for-session/${sessionId}/`);
    return response.data;
  },

  getRoomMessages: async (roomId, q = '') => {
    const response = await api.get(`/messages/rooms/${roomId}/messages/`, {
      params: q ? { q } : {},
    });
    return response.data;
  },

  sendRoomMessage: async (roomId, content) => {
    const response = await api.post(`/messages/rooms/${roomId}/send/`, { content });
    return response.data;
  },

  sendRoomFile: async (roomId, file, content = '') => {
    const formData = new FormData();
    formData.append('file', file);
    if (content) formData.append('content', content);
    const response = await api.post(`/messages/rooms/${roomId}/send/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getChatRoomDetail: async (roomId) => {
    const response = await api.get(`/messages/rooms/${roomId}/`);
    return response.data;
  },

  updateChatRoom: async (roomId, { title, description, icon } = {}) => {
    const formData = new FormData();
    if (title !== undefined) formData.append('title', title);
    if (description !== undefined) formData.append('description', description);
    if (icon) formData.append('icon', icon);
    const response = await api.patch(`/messages/rooms/${roomId}/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getRoomMedia: async (roomId) => {
    const response = await api.get(`/messages/rooms/${roomId}/media/`);
    return response.data;
  },

  getBuddyMedia: async (buddyId) => {
    const response = await api.get(`/messages/with/${buddyId}/media/`);
    return response.data;
  },
};

export default chatService;
