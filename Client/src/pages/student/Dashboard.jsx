import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiUsers, FiCalendar, FiMessageSquare, FiTrendingUp, FiClock, FiEdit3, FiBook, FiX } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import sessionService from '../../services/sessionService';
import matchService from '../../services/matchService';
import analyticsService from '../../services/analyticsService';
import VerifiedBadge from '../../components/common/VerifiedBadge';
import UserAvatar from '../../components/common/UserAvatar';
import { getProfileCompleteness, shouldShowSemesterRefresh } from '../../utils/profileCompleteness';
import './Dashboard.css';

const SEMESTER_DISMISS_KEY = 'semesterRefreshDismissed';

const Dashboard = () => {
  const { user } = useAuth();
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [studyBuddies, setStudyBuddies] = useState([]);
  const [showSemesterBanner, setShowSemesterBanner] = useState(false);
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalBuddies: 0,
    hoursStudied: 0,
    streak: 0
  });
  const [loading, setLoading] = useState(true);

  const profileCompleteness = getProfileCompleteness(user);

  useEffect(() => {
    const dismissed = localStorage.getItem(SEMESTER_DISMISS_KEY);
    const userWithDismiss = dismissed ? { ...user, semesterRefreshDismissed: dismissed } : user;
    setShowSemesterBanner(shouldShowSemesterRefresh(userWithDismiss));
  }, [user]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [sessions, buddies, analytics] = await Promise.all([
        sessionService.getSessions('upcoming').catch(() => []),
        matchService.getStudyBuddies().catch(() => []),
        analyticsService.getMyAnalytics().catch(() => null),
      ]);

      setUpcomingSessions(sessions.slice(0, 3));
      setStudyBuddies(buddies.slice(0, 4));

      setStats({
        totalSessions: analytics?.totalSessions ?? sessions.length ?? 0,
        totalBuddies: analytics?.buddyCount ?? buddies.length ?? 0,
        hoursStudied: analytics?.totalHours ?? 0,
        streak: analytics?.studyStreak ?? 0,
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setUpcomingSessions([]);
      setStudyBuddies([]);
    } finally {
      setLoading(false);
    }
  };

  const dismissSemesterBanner = () => {
    localStorage.setItem(SEMESTER_DISMISS_KEY, new Date().toISOString());
    setShowSemesterBanner(false);
  };

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '400px' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>
            Welcome back, {user?.name?.split(' ')[0]}! 👋
            <VerifiedBadge show={user?.isVerified ?? user?.is_verified} />
          </h1>
          <p>Here's your study overview for today</p>
        </div>
      </div>

      {showSemesterBanner && (
        <div className="semester-refresh-banner card">
          <div>
            <strong>New semester?</strong>
            <p>Update your year, subjects, and availability so matches stay accurate.</p>
          </div>
          <div className="semester-banner-actions">
            <Link to="/profile/edit" className="btn btn-primary btn-sm">Update profile</Link>
            <button type="button" className="btn btn-outline btn-sm" onClick={dismissSemesterBanner} aria-label="Dismiss">
              <FiX />
            </button>
          </div>
        </div>
      )}

      {profileCompleteness.percent < 100 && (
        <div className="profile-completeness-card card">
          <div className="profile-completeness-header">
            <span>Profile completeness</span>
            <strong>{profileCompleteness.percent}%</strong>
          </div>
          <div className="profile-completeness-bar">
            <div className="profile-completeness-fill" style={{ width: `${profileCompleteness.percent}%` }} />
          </div>
          <p className="text-muted">
            Missing: {profileCompleteness.missing.join(', ')}
          </p>
          <Link to="/profile/edit" className="btn btn-outline btn-sm">Complete profile</Link>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--primary-tint)' }}>
            <FiCalendar color="var(--primary-color)" />
          </div>
          <div className="stat-content">
            <h3>{stats.totalSessions}</h3>
            <p>Total Sessions</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(80, 200, 120, 0.1)' }}>
            <FiUsers color="var(--secondary-color)" />
          </div>
          <div className="stat-content">
            <h3>{stats.totalBuddies}</h3>
            <p>Study Buddies</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(255, 193, 7, 0.1)' }}>
            <FiClock color="var(--warning)" />
          </div>
          <div className="stat-content">
            <h3>{stats.hoursStudied}h</h3>
            <p>Hours Studied</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(255, 107, 107, 0.1)' }}>
            <FiTrendingUp color="var(--accent-color)" />
          </div>
          <div className="stat-content">
            <h3>{stats.streak} days</h3>
            <p>Study Streak</p>
          </div>
        </div>
      </div>

      <div className="dashboard-section profile-summary-card">
        <div className="section-header">
          <h2><FiBook /> My Profile</h2>
          <Link to="/profile/edit" className="view-all-link"><FiEdit3 /> Edit</Link>
        </div>
        <div className="profile-summary-grid">
          <div className="profile-summary-item">
            <span className="profile-label">Education</span>
            <span>{user?.educationLevel || 'Not set'}</span>
          </div>
          <div className="profile-summary-item">
            <span className="profile-label">Institution</span>
            <span>{user?.university || '—'}</span>
          </div>
          <div className="profile-summary-item">
            <span className="profile-label">Learning style</span>
            <span>{user?.learningStyle || '—'}</span>
          </div>
          <div className="profile-summary-item full-width">
            <span className="profile-label">Subjects</span>
            <div className="tag-list">
              {(user?.subjects?.length > 0 ? user.subjects : ['None selected']).map(s => (
                <span key={s} className="badge badge-primary">{s}</span>
              ))}
            </div>
          </div>
          {user?.strengths?.length > 0 && (
            <div className="profile-summary-item full-width">
              <span className="profile-label">Strengths</span>
              <div className="tag-list">
                {user.strengths.map(s => <span key={s} className="badge badge-success">{s}</span>)}
              </div>
            </div>
          )}
          {user?.bio && (
            <div className="profile-summary-item full-width">
              <span className="profile-label">Bio</span>
              <p className="profile-bio">{user.bio}</p>
            </div>
          )}
        </div>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-section">
          <div className="section-header">
            <h2>Upcoming Sessions</h2>
            <Link to="/sessions" className="view-all-link">View All</Link>
          </div>
          
          {upcomingSessions.length === 0 ? (
            <div className="empty-state">
              <FiCalendar size={48} />
              <p>No upcoming sessions</p>
              <Link to="/sessions" className="btn btn-primary btn-sm">
                Schedule a Session
              </Link>
            </div>
          ) : (
            <div className="session-list">
              {upcomingSessions.map((session) => (
                <div key={session.id} className="session-item">
                  <div className="session-date">
                    <span className="date-day">{new Date(session.date).getDate()}</span>
                    <span className="date-month">
                      {new Date(session.date).toLocaleString('default', { month: 'short' })}
                    </span>
                  </div>
                  <div className="session-details">
                    <h4>{session.title}</h4>
                    <p>{session.subject} • {session.time}</p>
                  </div>
                  <span className="badge badge-primary">{session.participants.length} participants</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="dashboard-section">
          <div className="section-header">
            <h2>Your Study Buddies</h2>
            <Link to="/matches" className="view-all-link">Find More</Link>
          </div>

          {studyBuddies.length === 0 ? (
            <div className="empty-state">
              <FiUsers size={48} />
              <p>No study buddies yet</p>
              <Link to="/matches" className="btn btn-primary btn-sm">
                Find Study Partners
              </Link>
            </div>
          ) : (
            <div className="buddy-grid">
              {studyBuddies.map((buddy) => (
                <div key={buddy.id} className="buddy-card">
                  <UserAvatar user={buddy} name={buddy.name} size={48} className="buddy-avatar-wrap" />
                  <h4>
                    {buddy.name}
                    <VerifiedBadge show={buddy.isVerified ?? buddy.is_verified} />
                  </h4>
                  <p className="buddy-subjects">
                    {Array.isArray(buddy.subjects) ? buddy.subjects.join(', ') : buddy.subjects || 'No subjects'}
                  </p>
                  <Link to={`/chat/${buddy.id}`} className="btn btn-outline btn-sm">
                    <FiMessageSquare /> Message
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="quick-actions">
        <Link to="/matches" className="action-card">
          <FiUsers size={32} />
          <h3>Find Buddies</h3>
          <p>Discover compatible study partners</p>
        </Link>

        <Link to="/sessions" className="action-card">
          <FiCalendar size={32} />
          <h3>Schedule Session</h3>
          <p>Plan your next study session</p>
        </Link>

        <Link to="/analytics" className="action-card">
          <FiTrendingUp size={32} />
          <h3>View Progress</h3>
          <p>Track your study analytics</p>
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;
