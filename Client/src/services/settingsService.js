import api from './api';

const settingsService = {
  changePassword: async (currentPassword, newPassword) => {
    const response = await api.post('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },

  updatePreferences: async (preferences) => {
    const response = await api.put('/auth/preferences', preferences);
    return response.data;
  },
};

export default settingsService;
