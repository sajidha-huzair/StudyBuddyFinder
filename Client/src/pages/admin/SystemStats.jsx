import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import adminService from '../../services/adminService';
import { toast } from 'react-toastify';

const SystemStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await adminService.getSystemStats();
      setStats(data);
    } catch (error) {
      toast.error('Failed to load system statistics');
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#4a90e2', '#50c878', '#ffc107', '#ff6b6b', '#9b59b6', '#1abc9c'];

  if (loading) {
    return (
      <div className="system-stats">
        <h1>System Statistics</h1>
        <p>Loading platform analytics...</p>
      </div>
    );
  }

  const userGrowth = stats?.userGrowth || [];
  const sessionData = stats?.weeklySessions || [];
  const subjectDistribution = stats?.subjectDistribution || [];
  const metrics = stats?.keyMetrics || {};

  return (
    <div className="system-stats">
      <h1>System Statistics</h1>
      <p>Comprehensive platform analytics</p>

      <div className="stats-grid">
        <div className="stat-chart card">
          <h3>User Growth</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={userGrowth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="users" stroke="#4a90e2" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="stat-chart card">
          <h3>Weekly Sessions</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sessionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="sessions" fill="#50c878" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="stat-chart card">
          <h3>Subject Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={subjectDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => entry.name}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {subjectDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="stat-metrics card">
          <h3>Key Metrics</h3>
          <div className="metric-list">
            <div className="metric-item">
              <span className="metric-label">Avg. Sessions per User</span>
              <span className="metric-value">{metrics.avgSessionsPerUser ?? 0}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Match Success Rate</span>
              <span className="metric-value">{metrics.matchSuccessRate ?? 0}%</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Avg. Session Duration</span>
              <span className="metric-value">{metrics.avgSessionDuration ?? 0} hours</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Pending Reports</span>
              <span className="metric-value">{metrics.pendingReports ?? 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemStats;
