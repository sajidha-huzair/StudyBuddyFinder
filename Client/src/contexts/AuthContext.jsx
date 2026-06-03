import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import { toast } from 'react-toastify';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (token) {
        const userData = await authService.getCurrentUser();
        setUser(userData);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await authService.login(email, password);
      setUser(response.user);
      localStorage.setItem('accessToken', response.access_token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      const userRole = response.user.role?.toUpperCase();
      if (userRole === 'ADMIN') {
        navigate('/admin');
      } else if (!response.user.profileCompleted) {
        navigate('/profile/setup');
      } else {
        navigate('/dashboard');
      }
      
      toast.success('Welcome back!');
      return response;
    } catch (error) {
      const msg = error?.error || error?.message || error?.detail;
      toast.error(msg || 'Login failed. Check your email and password.');
      throw error;
    }
  };

  const loginWithGoogle = async (credential) => {
    try {
      const response = await authService.googleLogin(credential);
      setUser(response.user);
      localStorage.setItem('accessToken', response.access_token);
      localStorage.setItem('user', JSON.stringify(response.user));

      const userRole = response.user.role?.toUpperCase();
      if (userRole === 'ADMIN') {
        navigate('/admin');
      } else if (!response.user.profileCompleted) {
        navigate('/profile/setup');
      } else {
        navigate('/dashboard');
      }

      const isNewUser = !response.user.profileCompleted;
      toast.success(isNewUser ? 'Account created! Complete your profile.' : 'Welcome back!');
      return response;
    } catch (error) {
      const msg = error?.error || error?.message || 'Google sign-in failed';
      toast.error(msg);
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      const response = await authService.register(userData);
      setUser(response.user);
      
      toast.success('Account created! Complete your profile.');
      navigate('/profile/setup');
      return response;
    } catch (error) {
      const msg = error?.error || error?.message || 'Registration failed';
      toast.error(msg);
      throw error;
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    navigate('/');
    toast.info('Logged out successfully');
  };

  const updateUser = (userData) => {
    setUser(prev => ({ ...prev, ...userData }));
  };

  const value = {
    user,
    loading,
    login,
    loginWithGoogle,
    register,
    logout,
    updateUser,
    isAuthenticated: !!user,
    isAdmin: user?.role?.toUpperCase() === 'ADMIN'
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
