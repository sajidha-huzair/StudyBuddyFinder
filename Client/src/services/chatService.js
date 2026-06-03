import api from './api';

const chatService = {
  getConversations: async () => {
    const response = await api.get('/messages/');
    return response.data;
  },

  getMessages: async (buddyId) => {
    const response = await api.get(`/messages/with/${buddyId}/`);
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
};

export default chatService;
