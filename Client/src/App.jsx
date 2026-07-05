import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ROUTER_FUTURE = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
};

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LocaleProvider } from './i18n/LocaleContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';

import LandingPage from './pages/public/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';

import StudentDashboard from './pages/student/Dashboard';
import ProfileSetup from './pages/student/ProfileSetup';
import ProfileEdit from './pages/student/ProfileEdit';
import AvailabilityPage from './pages/student/AvailabilityPage';
import MatchRecommendations from './pages/student/MatchRecommendations';
import RequestsPage from './pages/student/RequestsPage';
import ChatPage from './pages/student/ChatPage';
import GroupChatPage from './pages/student/GroupChatPage';
import StudySessionPage from './pages/student/StudySessionPage';
import SubjectVaultPage from './pages/student/SubjectVaultPage';
import AnalyticsPage from './pages/student/AnalyticsPage';
import ReportUserPage from './pages/student/ReportUserPage';
import SettingsPage from './pages/student/SettingsPage';
import ParentPortalPage from './pages/public/ParentPortalPage';

import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import ReportManagement from './pages/admin/ReportManagement';
import SystemStats from './pages/admin/SystemStats';

import ProtectedRoute from './components/layout/ProtectedRoute';
import AdminRoute from './components/layout/AdminRoute';

const ThemedToast = () => {
  const { resolvedTheme } = useTheme();
  return (
    <ToastContainer
      position="top-right"
      autoClose={3000}
      hideProgressBar={false}
      newestOnTop
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
    />
  );
};

const AppRoutes = () => {
  const { user } = useAuth();
  const userTheme = user?.themePreference || null;

  return (
    <ThemeProvider userTheme={userTheme}>
      <NotificationProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/parent/:token" element={<ParentPortalPage />} />

          <Route path="/dashboard" element={<ProtectedRoute><StudentDashboard /></ProtectedRoute>} />
          <Route path="/profile/setup" element={<ProtectedRoute><ProfileSetup /></ProtectedRoute>} />
          <Route path="/profile/edit" element={<ProtectedRoute><ProfileEdit /></ProtectedRoute>} />
          <Route path="/availability" element={<ProtectedRoute><AvailabilityPage /></ProtectedRoute>} />
          <Route path="/matches" element={<ProtectedRoute><MatchRecommendations /></ProtectedRoute>} />
          <Route path="/requests" element={<ProtectedRoute><RequestsPage /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
          <Route path="/chat/room/:roomId" element={<ProtectedRoute><GroupChatPage /></ProtectedRoute>} />
          <Route path="/chat/:buddyId" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
          <Route path="/sessions" element={<ProtectedRoute><StudySessionPage /></ProtectedRoute>} />
          <Route path="/vault" element={<ProtectedRoute><SubjectVaultPage /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
          <Route path="/report" element={<ProtectedRoute><ReportUserPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/users" element={<AdminRoute><UserManagement /></AdminRoute>} />
          <Route path="/admin/reports" element={<AdminRoute><ReportManagement /></AdminRoute>} />
          <Route path="/admin/stats" element={<AdminRoute><SystemStats /></AdminRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ThemedToast />
      </NotificationProvider>
    </ThemeProvider>
  );
};

function App() {
  const basename = import.meta.env.VITE_BASE_PATH?.replace(/\/$/, '') || undefined;

  return (
    <Router basename={basename} future={ROUTER_FUTURE}>
      <LocaleProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </LocaleProvider>
    </Router>
  );
}

export default App;
