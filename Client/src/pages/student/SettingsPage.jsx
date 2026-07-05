import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSun, FiMoon, FiMonitor } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useLocale } from '../../i18n/LocaleContext';
import settingsService from '../../services/settingsService';
import blockService from '../../services/blockService';
import sessionService from '../../services/sessionService';
import authService from '../../services/authService';
import { toast } from 'react-toastify';

const THEME_OPTIONS = [
  { id: 'light', label: 'Light', desc: 'Warm & bright', icon: FiSun },
  { id: 'dark', label: 'Dark', desc: 'Easy on the eyes', icon: FiMoon },
  { id: 'system', label: 'System', desc: 'Match your device', icon: FiMonitor },
];

const SettingsPage = () => {
  const { user, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const { locale, setLocale } = useLocale();
  const navigate = useNavigate();
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [schoolEmail, setSchoolEmail] = useState('');
  const [parentEmail, setParentEmail] = useState(user?.parentEmail || '');
  const [notifications, setNotifications] = useState({
    email: true,
    sessionReminders: true,
    matchRecommendations: true,
  });

  useEffect(() => {
    if (user?.notificationPreferences) {
      setNotifications(user.notificationPreferences);
    }
    loadBlockedUsers();
  }, [user]);

  const loadBlockedUsers = async () => {
    try {
      const data = await blockService.getBlockedUsers();
      setBlockedUsers(data);
    } catch {
      setBlockedUsers([]);
    }
  };

  const handleUnblock = async (userId) => {
    try {
      await blockService.unblockUser(userId);
      toast.success('User unblocked');
      loadBlockedUsers();
    } catch {
      toast.error('Failed to unblock user');
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    try {
      await settingsService.changePassword(passwords.currentPassword, passwords.newPassword);
      toast.success('Password updated successfully');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update password');
    }
  };

  const savePreferences = async (updatedNotifications) => {
    try {
      await settingsService.updatePreferences({ notifications: updatedNotifications });
      toast.success('Preferences saved');
    } catch {
      toast.error('Failed to save preferences');
    }
  };

  const toggleNotification = (key) => {
    const updated = { ...notifications, [key]: !notifications[key] };
    setNotifications(updated);
    savePreferences(updated);
  };

  const handleThemeChange = async (nextTheme) => {
    await setTheme(nextTheme);
    toast.success(`Theme set to ${nextTheme}`);
  };

  return (
    <div className="settings-page page-container">
      <h1>Settings</h1>
      <p className="page-intro">Manage your account, appearance, and preferences.</p>

      <div className="settings-sections">
        <div className="settings-section card">
          <h3>Appearance</h3>
          <p className="text-muted" style={{ marginBottom: '0.75rem', fontSize: '0.9rem' }}>
            Choose how Study Buddy looks on your device.
          </p>
          <div className="theme-picker">
            {THEME_OPTIONS.map(({ id, label, desc, icon: Icon }) => (
              <button
                key={id}
                type="button"
                className={`theme-option ${theme === id ? 'active' : ''}`}
                onClick={() => handleThemeChange(id)}
              >
                <Icon className="theme-option-icon" />
                <span className="theme-option-label">{label}</span>
                <span className="theme-option-desc">{desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="settings-section card">
          <h3>Language</h3>
          <select className="input-field" value={locale} onChange={async (e) => {
            setLocale(e.target.value);
            try {
              await authService.updateProfile({ locale: e.target.value });
            } catch { /* local only ok */ }
          }}>
            <option value="en">English</option>
            <option value="si">සිංහල</option>
            <option value="ta">தமிழ்</option>
          </select>
        </div>

        <div className="settings-section card">
          <h3>School verification</h3>
          <p className="text-muted">Verify with a school email (.sch.lk, .edu.lk) to get a verified badge.</p>
          {user?.schoolVerified ? (
            <p><strong>Verified</strong> — {user.email}</p>
          ) : (
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                const result = await authService.verifySchoolEmail(schoolEmail);
                updateUser(result.user);
                toast.success(result.message);
              } catch (err) {
                toast.error(err?.error || 'Verification failed');
              }
            }}>
              <input type="email" className="input-field" placeholder="you@school.sch.lk"
                value={schoolEmail} onChange={(e) => setSchoolEmail(e.target.value)} required />
              <button type="submit" className="btn btn-primary btn-sm mt-sm">Verify school email</button>
            </form>
          )}
        </div>

        <div className="settings-section card">
          <h3>Parent / guardian access</h3>
          <p className="text-muted">Send a read-only link to view session summaries.</p>
          <input type="email" className="input-field" placeholder="parent@example.com"
            value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} />
          <button type="button" className="btn btn-outline btn-sm mt-sm" onClick={async () => {
            try {
              const result = await sessionService.sendParentLink(parentEmail);
              toast.success('Parent link sent (check email if configured)');
              if (result.viewUrl) console.info('Parent URL:', result.viewUrl);
            } catch (err) {
              toast.error(err?.response?.data?.error || 'Failed to send link');
            }
          }}>
            Send parent access link
          </button>
        </div>

        <div className="settings-section card">
          <h3>Account Information</h3>
          <div className="info-row"><span>Name:</span><strong>{user?.full_name || user?.name}</strong></div>
          <div className="info-row"><span>Email:</span><strong>{user?.email}</strong></div>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/profile/edit')}>
            Edit Profile
          </button>
        </div>

        <div className="settings-section card">
          <h3>Change Password</h3>
          <form onSubmit={handlePasswordChange}>
            <div className="form-group">
              <input type="password" placeholder="Current password" className="input-field"
                value={passwords.currentPassword}
                onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })} required />
            </div>
            <div className="form-group">
              <input type="password" placeholder="New password (min 8 chars)" className="input-field"
                value={passwords.newPassword}
                onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} required />
            </div>
            <div className="form-group">
              <input type="password" placeholder="Confirm new password" className="input-field"
                value={passwords.confirmPassword}
                onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })} required />
            </div>
            <button type="submit" className="btn btn-primary btn-sm">Update Password</button>
          </form>
        </div>

        <div className="settings-section card">
          <h3>Notifications</h3>
          <label className="checkbox-label">
            <input type="checkbox" checked={notifications.email}
              onChange={() => toggleNotification('email')} />
            <span>Email notifications</span>
          </label>
          <label className="checkbox-label">
            <input type="checkbox" checked={notifications.sessionReminders}
              onChange={() => toggleNotification('sessionReminders')} />
            <span>Session reminders</span>
          </label>
          <label className="checkbox-label">
            <input type="checkbox" checked={notifications.matchRecommendations}
              onChange={() => toggleNotification('matchRecommendations')} />
            <span>Match recommendations</span>
          </label>
        </div>

        <div className="settings-section card">
          <h3>Blocked Users</h3>
          {blockedUsers.length === 0 ? (
            <p className="text-muted">No blocked users</p>
          ) : (
            blockedUsers.map(blocked => (
              <div key={blocked.id} className="info-row blocked-row">
                <strong>{blocked.name}</strong>
                <button className="btn btn-outline btn-sm" onClick={() => handleUnblock(blocked.id)}>
                  Unblock
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
