import api from './api';

const reportService = {
  submitReport: async (reportData) => {
    const payload = {
      reported_user: reportData.reportedUserId,
      reason: reportData.reason,
      description: reportData.description
    };
    const response = await api.post('/reports/', payload);
    return response.data;
  },

  getReports: async (status = '') => {
    const response = await api.get('/reports/', {
      params: status ? { status } : {},
    });
    return response.data;
  },

  getReportById: async (reportId) => {
    const response = await api.get(`/reports/${reportId}/`);
    return response.data;
  },

  resolveReport: async (reportId, resolution, adminNotes = '') => {
    const response = await api.post(`/reports/${reportId}/resolve/`, {
      resolution,
      admin_notes: adminNotes,
    });
    return response.data;
  },
};

export default reportService;
