import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import sessionService from '../../services/sessionService';

const ParentPortalPage = () => {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    sessionService.getParentView(token)
      .then(setData)
      .catch(() => setError('This link is invalid or has expired.'));
  }, [token]);

  if (error) {
    return (
      <div className="page-container">
        <div className="card empty-state"><p>{error}</p></div>
      </div>
    );
  }

  if (!data) {
    return <div className="flex-center"><div className="spinner" /></div>;
  }

  return (
    <div className="page-container parent-portal">
      <h1>Parent / Guardian View</h1>
      <p className="text-muted">Read-only overview for {data.studentName}</p>

      <div className="stats-grid">
        <div className="stat-card card">
          <h3>{data.grade ? `Grade ${data.grade}` : '—'}</h3>
          <p>Current grade</p>
        </div>
        <div className="stat-card card">
          <h3>{data.completedSessions}</h3>
          <p>Completed online sessions</p>
        </div>
        <div className="stat-card card">
          <h3>{data.examYear || '—'}</h3>
          <p>Target exam year</p>
        </div>
      </div>

      <div className="card">
        <h2>Recent session summaries</h2>
        {data.recentSummaries?.length === 0 ? (
          <p className="text-muted">No summaries yet.</p>
        ) : (
          data.recentSummaries.map((s, i) => (
            <div key={i} className="parent-summary-item">
              <strong>{s.title}</strong> — {s.subject} ({s.date})
              <p>{s.summary}</p>
              {s.actionItems?.length > 0 && (
                <ul>{s.actionItems.map((a) => <li key={a}>{a}</li>)}</ul>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ParentPortalPage;
