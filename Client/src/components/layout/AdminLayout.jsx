import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  FiHome, FiUsers, FiAlertCircle, FiBarChart2, 
  FiLogOut, FiMenu, FiSun, FiMoon
} from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import './AdminLayout.css';

const DRAWER_BREAKPOINT = 1024;

const AdminLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > DRAWER_BREAKPOINT);
  const [isDrawerMode, setIsDrawerMode] = useState(window.innerWidth <= DRAWER_BREAKPOINT);
  const { user, logout } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const location = useLocation();

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
  }, [location.pathname, isDrawerMode]);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  const menuItems = [
    { path: '/admin', icon: <FiHome />, label: 'Dashboard' },
    { path: '/admin/users', icon: <FiUsers />, label: 'User Management' },
    { path: '/admin/reports', icon: <FiAlertCircle />, label: 'Reports' },
    { path: '/admin/stats', icon: <FiBarChart2 />, label: 'Statistics' },
  ];

  const isActive = (path) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="admin-layout">
      {isDrawerMode && sidebarOpen && (
        <div className="sidebar-overlay" onClick={closeSidebar} aria-hidden="true" />
      )}

      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <h2>Admin Panel</h2>
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
          <button onClick={logout} className="logout-btn">
            <FiLogOut />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <div className={`admin-main-content ${!sidebarOpen ? 'sidebar-collapsed' : ''}`}>
        <header className="admin-header">
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

          <button
            type="button"
            className="theme-toggle-btn"
            onClick={toggleTheme}
            aria-label={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {resolvedTheme === 'dark' ? <FiSun /> : <FiMoon />}
          </button>

          <div className="admin-user">
            <div className="user-avatar admin-avatar">A</div>
            <div className="user-info">
              <span className="user-name">{user?.name}</span>
              <span className="user-role">Administrator</span>
            </div>
          </div>
        </header>

        <main className="admin-page-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
