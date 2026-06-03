import api from './api';

const blockService = {
  getBlockedUsers: async () => {
    const response = await api.get('/auth/blocked');
    return response.data;
  },

  blockUser: async (userId) => {
    const response = await api.post(`/auth/block/${userId}`);
    return response.data;
  },

  unblockUser: async (userId) => {
    const response = await api.delete(`/auth/block/${userId}/unblock`);
    return response.data;
  },
};

export default blockService;
