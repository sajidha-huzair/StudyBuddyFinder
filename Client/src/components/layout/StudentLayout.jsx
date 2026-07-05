import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  FiHome, FiUsers, FiMessageSquare, FiCalendar, 
  FiBarChart2, FiSettings, FiLogOut, FiMenu, 
  FiBell, FiUser, FiClock, FiEdit3, FiChevronDown,
  FiAlertCircle, FiSun, FiMoon, FiBook
} from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useTheme } from '../../contexts/ThemeContext';
import NotificationDropdown from '../common/NotificationDropdown';
import './StudentLayout.css';

const DRAWER_BREAKPOINT = 1024;

const StudentLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > DRAWER_BREAKPOINT);
  const [isDrawerMode, setIsDrawerMode] = useState(window.innerWidth <= DRAWER_BREAKPOINT);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const { resolvedTheme, setTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const userMenuRef = useRef(null);
  const notificationRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      const drawer = window.innerWidth <= DRAWER_BREAKPOINT;
      setIsDrawerMode(drawer);
      if (drawer) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isDrawerMode) setSidebarOpen(false);
    setNotificationsOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname, isDrawerMode]);

  useEffect(() => {
    if (!userMenuOpen) return undefined;
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen]);

  useEffect(() => {
    if (!notificationsOpen) return undefined;
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notificationsOpen]);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  const menuItems = [
    { path: '/dashboard', icon: <FiHome />, label: 'Dashboard' },
    { path: '/matches', icon: <FiUsers />, label: 'Find Buddies' },
    { path: '/requests', icon: <FiUser />, label: 'Requests' },
    { path: '/chat', icon: <FiMessageSquare />, label: 'Messages' },
    { path: '/sessions', icon: <FiCalendar />, label: 'Sessions' },
    { path: '/vault', icon: <FiBook />, label: 'Subject Vault' },
    { path: '/availability', icon: <FiClock />, label: 'Availability' },
    { path: '/analytics', icon: <FiBarChart2 />, label: 'Analytics' },
    { path: '/report', icon: <FiAlertCircle />, label: 'Report User' },
  ];

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(`${path}/`);

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="layout">
      {isDrawerMode && sidebarOpen && (
        <div className="sidebar-overlay" onClick={closeSidebar} aria-hidden="true" />
      )}

      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <h2>Study Buddy</h2>
          <button
            type="button"
            className="sidebar-toggle"
            onClick={closeSidebar}
            aria-label="Toggle sidebar"
          >
            <FiMenu />
          </button>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
              onClick={() => { if (isDrawerMode) closeSidebar(); }}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user-info">
            <div className="sidebar-avatar">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="sidebar-user-details">
              <span className="sidebar-user-name">{user?.name}</span>
              <span className="sidebar-user-role">Student</span>
            </div>
          </div>
        </div>
      </aside>

      <div className={`main-content ${!sidebarOpen ? 'sidebar-collapsed' : ''}`}>
        <header className="header">
          {!sidebarOpen && (
            <button
              type="button"
              className="menu-toggle sidebar-reopen-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <FiMenu />
            </button>
          )}

          <div className="header-actions">
            <button
              type="button"
              className="theme-toggle-btn"
              onClick={toggleTheme}
              aria-label={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {resolvedTheme === 'dark' ? <FiSun /> : <FiMoon />}
            </button>

            <div className="notification-wrapper" ref={notificationRef}>
              <button 
                className="notification-btn"
                type="button"
                onClick={() => {
                  setUserMenuOpen(false);
                  setNotificationsOpen((open) => !open);
                }}
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
              >
                <FiBell />
                {unreadCount > 0 && (
                  <span className="notification-badge">{unreadCount}</span>
                )}
              </button>
              {notificationsOpen && (
                <NotificationDropdown 
                  onClose={() => setNotificationsOpen(false)} 
                />
              )}
            </div>

            <div className="user-menu" ref={userMenuRef}>
              <button
                type="button"
                className="user-avatar"
                onClick={() => {
                  setNotificationsOpen(false);
                  setUserMenuOpen((open) => !open);
                }}
                aria-label="Account menu"
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
              >
                {user?.name?.charAt(0).toUpperCase()}
                <FiChevronDown className="dropdown-icon" />
              </button>
              {userMenuOpen && (
                <div className="user-dropdown">
                  <div className="user-dropdown-header">
                    <div className="user-info">
                      <span className="user-name">{user?.name}</span>
                      <span className="user-email">{user?.email}</span>
                    </div>
                  </div>
                  <div className="user-dropdown-menu">
                    <button onClick={() => { navigate('/profile/edit'); setUserMenuOpen(false); }}>
                      <FiEdit3 /> Edit Profile
                    </button>
                    <button onClick={() => { navigate('/settings'); setUserMenuOpen(false); }}>
                      <FiSettings /> Settings
                    </button>
                    <button onClick={() => { navigate('/report'); setUserMenuOpen(false); }}>
                      <FiAlertCircle /> Report a User
                    </button>
                    <button onClick={logout} className="logout-option">
                      <FiLogOut /> Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default StudentLayout;
