import api from './api';

const adminService = {
  getStats: async () => {
    const response = await api.get('/admin/stats');
    return response.data;
  },

  getUsers: async (search = '') => {
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    const response = await api.get(`/admin/users${params}`);
    return response.data;
  },

  toggleUserStatus: async (userId) => {
    const response = await api.post(`/admin/users/${userId}/toggle/`);
    return response.data;
  },

  getSystemStats: async () => {
    const response = await api.get('/admin/system-stats');
    return response.data;
  },

  deleteUser: async (userId) => {
    const response = await api.delete(`/admin/users/${userId}/delete/`);
    return response.data;
  },
};

export default adminService;
