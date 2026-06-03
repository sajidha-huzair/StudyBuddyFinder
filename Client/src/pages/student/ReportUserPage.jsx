import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { FiAlertCircle, FiShield } from 'react-icons/fi';
import { toast } from 'react-toastify';
import reportService from '../../services/reportService';
import matchService from '../../services/matchService';

const ReportUserPage = () => {
  const [searchParams] = useSearchParams();
  const [studyBuddies, setStudyBuddies] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const prefillId = searchParams.get('userId') || '';
  const prefillName = searchParams.get('name') || '';

  useEffect(() => {
    loadStudyBuddies();
  }, []);

  const loadStudyBuddies = async () => {
    try {
      const data = await matchService.getStudyBuddies();
      setStudyBuddies(data);
    } catch (error) {
      setStudyBuddies([]);
    }
  };

  const formik = useFormik({
    initialValues: {
      reportedUserId: prefillId,
      reason: '',
      description: ''
    },
    enableReinitialize: true,
    validationSchema: Yup.object({
      reportedUserId: Yup.string().required('Select a user'),
      reason: Yup.string().required('Select a reason'),
      description: Yup.string().required('Provide details')
    }),
    onSubmit: async (values) => {
      setSubmitting(true);
      try {
        await reportService.submitReport(values);
        toast.success('Report submitted successfully');
        formik.resetForm();
      } catch (error) {
        toast.error(error.response?.data?.error || 'Failed to submit report');
      } finally {
        setSubmitting(false);
      }
    }
  });

  const canSubmit = prefillId || studyBuddies.length > 0;

  return (
    <div className="report-page page-container">
      <div className="page-header">
        <h1><FiShield style={{ verticalAlign: 'middle', marginRight: '8px' }} />Report a User</h1>
        <p>Help us keep Study Buddy safe. Reports are reviewed by admins.</p>
      </div>

      {prefillName && (
        <div className="card" style={{ marginBottom: '1rem', padding: '1rem', background: 'rgba(255,193,7,0.08)' }}>
          <FiAlertCircle style={{ marginRight: '8px' }} />
          Reporting: <strong>{decodeURIComponent(prefillName)}</strong>
        </div>
      )}

      <form onSubmit={formik.handleSubmit} className="card report-form-page">
        <div className="input-group">
          <label className="input-label">User to Report</label>
          {prefillId ? (
            <>
              <input type="hidden" name="reportedUserId" value={prefillId} />
              <div className="input-field" style={{ background: 'var(--background-secondary)' }}>
                {decodeURIComponent(prefillName) || `User #${prefillId}`}
              </div>
            </>
          ) : (
            <>
              <select className="input-field" {...formik.getFieldProps('reportedUserId')}>
                <option value="">Select a study buddy</option>
                {studyBuddies.map(buddy => (
                  <option key={buddy.id} value={buddy.id}>{buddy.name}</option>
                ))}
              </select>
              {formik.touched.reportedUserId && formik.errors.reportedUserId && (
                <span className="error-text">{formik.errors.reportedUserId}</span>
              )}
              {studyBuddies.length === 0 && (
                <p className="text-muted">Select a connected study buddy, or report someone from their match profile.</p>
              )}
            </>
          )}
        </div>

        <div className="input-group">
          <label className="input-label">Reason</label>
          <select className="input-field" {...formik.getFieldProps('reason')}>
            <option value="">Select a reason</option>
            <option value="Inappropriate behavior">Inappropriate behavior</option>
            <option value="Spam">Spam</option>
            <option value="Harassment">Harassment</option>
            <option value="Fake profile">Fake profile</option>
            <option value="Other">Other</option>
          </select>
          {formik.touched.reason && formik.errors.reason && (
            <span className="error-text">{formik.errors.reason}</span>
          )}
        </div>

        <div className="input-group">
          <label className="input-label">Description</label>
          <textarea className="input-field" rows="5" {...formik.getFieldProps('description')} />
          {formik.touched.description && formik.errors.description && (
            <span className="error-text">{formik.errors.description}</span>
          )}
        </div>

        <button type="submit" className="btn btn-primary" disabled={submitting || !canSubmit}>
          {submitting ? 'Submitting...' : 'Submit Report'}
        </button>
      </form>
    </div>
  );
};

export default ReportUserPage;
