import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts';
import analyticsService from '../../services/analyticsService';
import { toast } from 'react-toastify';

const PIE_COLORS = ['#4a90e2', '#50c878', '#ffc107', '#ff6b6b', '#667eea', '#17a2b8'];

const AnalyticsPage = () => {
  const [stats, setStats] = useState(null);
  const [period, setPeriod] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const data = await analyticsService.getMyAnalytics(period);
      setStats(data);
    } catch {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !stats) {
    return <div className="analytics-page"><p>Loading analytics...</p></div>;
  }

  if (!stats) {
    return <div className="analytics-page"><p>No analytics data yet.</p></div>;
  }

  return (
    <div className="analytics-page page-container">
      <div className="page-header flex-between">
        <div>
          <h1>Your Analytics</h1>
          <p>Track your study progress and collaboration metrics</p>
        </div>
        <select
          className="input-field analytics-period-select"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          <option value="all">All time</option>
          <option value="week">Last 7 days</option>
          <option value="month">Last 30 days</option>
          <option value="year">Last year</option>
        </select>
      </div>

      <div className="analytics-stats-row">
        <div className="card"><h3>{stats.totalSessions}</h3><p>Completed Sessions</p></div>
        <div className="card"><h3>{stats.totalHours}h</h3><p>Total Study Hours</p></div>
        <div className="card"><h3>{stats.buddyCount}</h3><p>Study Buddies</p></div>
        <div className="card"><h3>{stats.studyStreak}</h3><p>Day Streak</p></div>
        <div className="card"><h3>{stats.averageSessionDuration}m</h3><p>Avg Session Length</p></div>
      </div>

      <div className="analytics-grid">
        <div className="analytics-card card">
          <h3>Sessions Over Time</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={stats.sessionsOverTime}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="sessions" stroke="var(--primary-color)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="analytics-card card">
          <h3>Study Hours by Subject</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={stats.hoursBySubject}
                dataKey="hours"
                nameKey="subject"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={({ subject, hours }) => `${subject}: ${hours}h`}
              >
                {stats.hoursBySubject.map((entry, index) => (
                  <Cell key={entry.subject} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="analytics-card card">
          <h3>Weekly Study Hours</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.weeklyStudyHours}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="hours" fill="var(--primary-color)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
