import React, { useState, useEffect } from 'react';
import { FiAlertCircle, FiCheck, FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';
import reportService from '../../services/reportService';

const daysSince = (dateStr) => {
  if (!dateStr) return 0;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
};

const ReportManagement = () => {
  const [reports, setReports] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [notesFor, setNotesFor] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    loadReports();
  }, [filter]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const data = await reportService.getReports(filter);
      setReports(data);
    } catch {
      toast.error('Failed to load reports');
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const openAction = (reportId, action) => {
    setNotesFor({ reportId, action });
    setAdminNotes('');
  };

  const submitAction = async () => {
    if (!notesFor) return;
    try {
      await reportService.resolveReport(notesFor.reportId, notesFor.action, adminNotes);
      toast.success(`Report ${notesFor.action}`);
      setNotesFor(null);
      setAdminNotes('');
      loadReports();
    } catch {
      toast.error(`Failed to ${notesFor.action} report`);
    }
  };

  return (
    <div className="report-management page-container">
      <h1>Report Management</h1>
      <p>Review and moderate user reports</p>

      <div className="filter-tabs">
        <button className={filter === 'pending' ? 'active' : ''} onClick={() => setFilter('pending')}>
          Pending
        </button>
        <button className={filter === 'resolved' ? 'active' : ''} onClick={() => setFilter('resolved')}>
          Resolved
        </button>
        <button className={filter === 'dismissed' ? 'active' : ''} onClick={() => setFilter('dismissed')}>
          Dismissed
        </button>
      </div>

      <div className="reports-list">
        {loading ? (
          <div className="empty-state card"><p>Loading reports...</p></div>
        ) : reports.length === 0 ? (
          <div className="empty-state card">
            <FiAlertCircle size={48} />
            <p>No {filter} reports</p>
          </div>
        ) : (
          reports.map(report => {
            const created = report.date || report.created_at;
            const days = daysSince(created);
            return (
              <div key={report.id} className="report-card card">
                <div className="report-header">
                  <FiAlertCircle color="var(--error)" />
                  <h3>{report.reason}</h3>
                  <span className="report-date">
                    {new Date(created).toLocaleDateString()}
                    {' · '}{days === 0 ? 'Today' : `${days} day${days !== 1 ? 's' : ''} ago`}
                  </span>
                </div>
                <div className="report-details">
                  <p><strong>Reporter:</strong> {report.reporter}</p>
                  <p><strong>Reported User:</strong> {report.reported}</p>
                  <p><strong>Description:</strong> {report.description}</p>
                  {report.admin_notes && (
                    <p><strong>Admin notes:</strong> {report.admin_notes}</p>
                  )}
                </div>
                {filter === 'pending' && (
                  <div className="report-actions">
                    <button
                      onClick={() => openAction(report.id, 'resolved')}
                      className="btn btn-primary btn-sm"
                    >
                      <FiCheck /> Resolve
                    </button>
                    <button
                      onClick={() => openAction(report.id, 'dismissed')}
                      className="btn btn-outline btn-sm"
                    >
                      <FiX /> Dismiss
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {notesFor && (
        <div className="modal-overlay" onClick={() => setNotesFor(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h2>{notesFor.action === 'resolved' ? 'Resolve' : 'Dismiss'} Report</h2>
              <button className="close-btn" onClick={() => setNotesFor(null)}><FiX /></button>
            </div>
            <div style={{ padding: '1.25rem 1.5rem' }}>
              <label className="input-label">Resolution notes (optional)</label>
              <textarea
                className="input-field"
                rows={4}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Describe the action taken..."
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setNotesFor(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={submitAction}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportManagement;
