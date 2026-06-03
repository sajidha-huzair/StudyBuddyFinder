import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import {
  FiUsers,
  FiAlertCircle,
  FiCalendar,
  FiActivity,
  FiUserPlus,
  FiHeart,
  FiArrowRight,
  FiRefreshCw,
  FiCheckCircle,
} from 'react-icons/fi';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import adminService from '../../services/adminService';
import { toast } from 'react-toastify';

const EMPTY_STATS = {
  totalUsers: 0,
  activeUsers: 0,
  totalSessions: 0,
  completedSessions: 0,
  pendingReports: 0,
  totalMatches: 0,
  pendingMatchRequests: 0,
  newUsersThisWeek: 0,
  studentUsers: 0,
  matchSuccessRate: 0,
  weeklySessions: [],
  recentUsers: [],
  recentReports: [],
  upcomingSessions: [],
};

const formatDateTime = (value) => {
  if (!value) return '—';
  try {
    return format(parseISO(value), 'MMM d, h:mm a');
  } catch {
    return value;
  }
};

const formatRelative = (value) => {
  if (!value) return '—';
  try {
    return format(parseISO(value), 'MMM d, yyyy');
  } catch {
    return value;
  }
};

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const data = await adminService.getStats();
      setStats({ ...EMPTY_STATS, ...data });
    } catch {
      toast.error('Failed to load admin dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const pendingReports = stats.recentReports.filter((r) => r.status === 'pending');
  const hasWeeklyData = stats.weeklySessions.some((d) => d.sessions > 0);

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="flex-center" style={{ minHeight: 320 }}>
          <div className="spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="page-header flex-between admin-dashboard-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p>
            Welcome back, {user?.name?.split(' ')[0] || 'Admin'}. Platform overview and moderation tools.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => loadStats(true)}
          disabled={refreshing}
        >
          <FiRefreshCw className={refreshing ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="admin-quick-links">
        <Link to="/admin/users" className="admin-quick-link card">
          <FiUsers size={22} />
          <span>Manage users</span>
          <FiArrowRight />
        </Link>
        <Link to="/admin/reports" className="admin-quick-link card">
          <FiAlertCircle size={22} />
          <span>Review reports{stats.pendingReports > 0 ? ` (${stats.pendingReports})` : ''}</span>
          <FiArrowRight />
        </Link>
        <Link to="/admin/stats" className="admin-quick-link card">
          <FiActivity size={22} />
          <span>Full statistics</span>
          <FiArrowRight />
        </Link>
      </div>

      <div className="admin-stats-grid admin-stats-grid-extended">
        <div className="admin-stat-card">
          <div className="stat-icon admin-stat-icon-users">
            <FiUsers size={28} />
          </div>
          <div className="stat-content">
            <h3>{stats.totalUsers}</h3>
            <p>Total users</p>
            <span className="stat-change">{stats.studentUsers} students</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="stat-icon admin-stat-icon-active">
            <FiActivity size={28} />
          </div>
          <div className="stat-content">
            <h3>{stats.activeUsers}</h3>
            <p>Active (7 days)</p>
            <span className="stat-change positive">+{stats.newUsersThisWeek} new this week</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="stat-icon admin-stat-icon-sessions">
            <FiCalendar size={28} />
          </div>
          <div className="stat-content">
            <h3>{stats.totalSessions}</h3>
            <p>Study sessions</p>
            <span className="stat-change">{stats.completedSessions} completed</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="stat-icon admin-stat-icon-matches">
            <FiHeart size={28} />
          </div>
          <div className="stat-content">
            <h3>{stats.totalMatches}</h3>
            <p>Buddy connections</p>
            <span className="stat-change">{stats.matchSuccessRate}% success rate</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="stat-icon admin-stat-icon-requests">
            <FiUserPlus size={28} />
          </div>
          <div className="stat-content">
            <h3>{stats.pendingMatchRequests}</h3>
            <p>Pending requests</p>
            <span className="stat-change">Awaiting response</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="stat-icon admin-stat-icon-reports">
            <FiAlertCircle size={28} />
          </div>
          <div className="stat-content">
            <h3>{stats.pendingReports}</h3>
            <p>Pending reports</p>
            <span className={`stat-change ${stats.pendingReports > 0 ? 'negative' : 'positive'}`}>
              {stats.pendingReports > 0 ? 'Needs review' : 'All clear'}
            </span>
          </div>
        </div>
      </div>

      <div className="admin-grid">
        <section className="card admin-section">
          <div className="admin-section-header">
            <h3>Sessions this week</h3>
            <Link to="/admin/stats" className="view-all-link">View analytics</Link>
          </div>
          {hasWeeklyData ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.weeklySessions}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="sessions" fill="var(--primary-color)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="admin-empty-hint">
              <FiCalendar size={32} />
              <p>No sessions scheduled this week yet.</p>
              <span>Sessions appear here once students plan study meetings.</span>
            </div>
          )}
        </section>

        <section className="card admin-section">
          <div className="admin-section-header">
            <h3>Platform health</h3>
          </div>
          <div className="health-metrics">
            <div className="health-metric">
              <span>Match success rate</span>
              <strong>{stats.matchSuccessRate}%</strong>
            </div>
            <div className="health-metric">
              <span>Session completion</span>
              <strong>
                {stats.totalSessions
                  ? Math.round((stats.completedSessions / stats.totalSessions) * 100)
                  : 0}
                %
              </strong>
            </div>
            <div className="health-metric">
              <span>Weekly sign-ups</span>
              <strong>{stats.newUsersThisWeek}</strong>
            </div>
            <div className="health-metric">
              <span>Moderation queue</span>
              <strong className={stats.pendingReports > 0 ? 'text-warning' : 'text-success'}>
                {stats.pendingReports} pending
              </strong>
            </div>
          </div>
        </section>

        <section className="card admin-section">
          <div className="admin-section-header">
            <h3>Recent users</h3>
            <Link to="/admin/users" className="view-all-link">View all</Link>
          </div>
          {stats.recentUsers.length > 0 ? (
            <div className="activity-list">
              {stats.recentUsers.map((u) => (
                <div key={u.id} className="activity-item admin-activity-row">
                  <div>
                    <strong>{u.name}</strong>
                    <span className="activity-meta">{u.email}</span>
                  </div>
                  <div className="admin-activity-end">
                    <span className={`badge ${u.role === 'ADMIN' ? 'badge-info' : 'badge-neutral'}`}>
                      {u.role}
                    </span>
                    <span className="activity-time">{formatRelative(u.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="admin-empty-hint">
              <FiUsers size={32} />
              <p>No users registered yet.</p>
            </div>
          )}
        </section>

        <section className="card admin-section">
          <div className="admin-section-header">
            <h3>Recent reports</h3>
            <Link to="/admin/reports" className="view-all-link">Manage reports</Link>
          </div>
          {stats.recentReports.length > 0 ? (
            <div className="activity-list">
              {stats.recentReports.map((report) => (
                <div key={report.id} className="activity-item admin-activity-row">
                  <div>
                    <strong>{report.reported}</strong>
                    <span className="activity-meta">{report.reason}</span>
                    <span className="activity-meta">Reported by {report.reporter}</span>
                  </div>
                  <div className="admin-activity-end">
                    <span className={`badge ${
                      report.status === 'pending'
                        ? 'badge-warning'
                        : report.status === 'resolved'
                          ? 'badge-success'
                          : 'badge-neutral'
                    }`}>
                      {report.status}
                    </span>
                    <span className="activity-time">{formatRelative(report.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="admin-empty-hint">
              <FiCheckCircle size={32} />
              <p>No reports submitted.</p>
              <span>User safety reports will appear here for review.</span>
            </div>
          )}
        </section>

        <section className="card admin-section admin-section-wide">
          <div className="admin-section-header">
            <h3>Upcoming sessions</h3>
          </div>
          {stats.upcomingSessions.length > 0 ? (
            <div className="admin-sessions-table-wrap">
              <table className="admin-mini-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Subject</th>
                    <th>Organizer</th>
                    <th>When</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.upcomingSessions.map((session) => (
                    <tr key={session.id}>
                      <td>{session.title}</td>
                      <td>{session.course}</td>
                      <td>{session.creator}</td>
                      <td>{formatDateTime(session.scheduledAt)}</td>
                      <td>
                        <span className="badge badge-info">{session.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="admin-empty-hint">
              <FiCalendar size={32} />
              <p>No upcoming sessions.</p>
              <span>Scheduled study sessions will show in this list.</span>
            </div>
          )}
        </section>
      </div>

      {pendingReports.length > 0 && (
        <div className="admin-alert-banner card">
          <FiAlertCircle size={20} />
          <div>
            <strong>{stats.pendingReports} report{stats.pendingReports !== 1 ? 's' : ''} need review</strong>
            <p>Open Report Management to resolve or dismiss pending cases.</p>
          </div>
          <Link to="/admin/reports" className="btn btn-primary btn-sm">Review now</Link>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
