import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

const authService = {
  register: async (userData) => {
    try {
      const backendData = {
        username: userData.name?.toLowerCase().replace(/\s+/g, '') || userData.email.split('@')[0],
        email: userData.email,
        password: userData.password,
        full_name: userData.name
      };
      
      const response = await api.post('/auth/register', backendData);
      if (response.data.access_token) {
        localStorage.setItem('accessToken', response.data.access_token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  login: async (email, password) => {
    try {
      const credentials = typeof email === 'object' ? email : { email, password };
      
      const response = await api.post('/auth/login', credentials);
      if (response.data.access_token) {
        localStorage.setItem('accessToken', response.data.access_token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
    }
  },

  getCurrentUser: async () => {
    try {
      const response = await api.get('/auth/me');
      localStorage.setItem('user', JSON.stringify(response.data));
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  updateProfile: async (profileData) => {
    try {
      const response = await api.put('/auth/profile', profileData);
      localStorage.setItem('user', JSON.stringify(response.data));
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  uploadAvatar: async (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    const response = await api.post('/auth/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    localStorage.setItem('user', JSON.stringify(response.data));
    return response.data;
  },

  forgotPassword: async (email) => {
    try {
      const response = await api.post('/auth/forgot-password', { email });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  resetPassword: async (token, password) => {
    try {
      const response = await api.post('/auth/reset-password', { token, password });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  googleLogin: async (credential) => {
    try {
      const response = await api.post('/auth/google', { credential });
      if (response.data.access_token) {
        localStorage.setItem('accessToken', response.data.access_token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  getStoredUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  getToken: () => {
    return localStorage.getItem('accessToken');
  },

  isAuthenticated: () => {
    return !!authService.getToken();
  },

  isAdmin: () => {
    const user = authService.getStoredUser();
    return user?.role === 'ADMIN' || user?.role === 'admin';
  },

  isStudent: () => {
    const user = authService.getStoredUser();
    return user?.role === 'STUDENT' || user?.role === 'student';
  }
};

export default authService;
export { api };
