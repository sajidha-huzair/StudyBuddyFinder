import api from './api';

const analyticsService = {
  getMyAnalytics: async (period = 'all') => {
    const response = await api.get('/analytics/me', { params: { period } });
    return response.data;
  },
};

export default analyticsService;
