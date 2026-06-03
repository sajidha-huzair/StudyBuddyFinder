import React, { useState, useEffect } from 'react';
import { FiPlus, FiX, FiUsers, FiVideo, FiMapPin } from 'react-icons/fi';
import sessionService from '../../services/sessionService';
import matchService from '../../services/matchService';
import { SUBJECTS } from '../../constants/subjects';
import { toast } from 'react-toastify';

const EMPTY_FORM = {
  title: '',
  subject: '',
  date: '',
  time: '',
  duration: '60',
  sessionFormat: 'online',
  location: '',
  description: '',
  invitedBuddies: [],
  recurrence: 'none',
  recurrenceCount: '0',
};

const CreateSessionModal = ({
  open,
  onClose,
  onCreated,
  initialBuddyIds = [],
  title = 'Plan study session',
}) => {
  const [formData, setFormData] = useState({ ...EMPTY_FORM, invitedBuddies: initialBuddyIds });
  const [studyBuddies, setStudyBuddies] = useState([]);
  const [availabilityConflicts, setAvailabilityConflicts] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFormData({ ...EMPTY_FORM, invitedBuddies: initialBuddyIds.map(Number) });
    matchService.getStudyBuddies().then(setStudyBuddies).catch(() => setStudyBuddies([]));
  }, [open, initialBuddyIds.join(',')]);

  useEffect(() => {
    const check = async () => {
      if (!open || !formData.date || !formData.time || formData.invitedBuddies.length === 0) {
        setAvailabilityConflicts([]);
        return;
      }
      try {
        const result = await sessionService.checkAvailability(
          formData.date,
          formData.time,
          formData.invitedBuddies,
        );
        setAvailabilityConflicts(result.conflicts || []);
      } catch {
        setAvailabilityConflicts([]);
      }
    };
    check();
  }, [formData.date, formData.time, formData.invitedBuddies, open]);

  const toggleBuddySelection = (buddyId) => {
    setFormData(prev => ({
      ...prev,
      invitedBuddies: prev.invitedBuddies.includes(buddyId)
        ? prev.invitedBuddies.filter(id => id !== buddyId)
        : [...prev.invitedBuddies, buddyId],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const session = await sessionService.createSession(formData);
      toast.success('Study session planned!');
      onCreated?.(session);
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.error || error.response?.data?.detail || 'Failed to create session');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content create-session-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{title}</h2>
            <p className="text-muted">Invited buddies get a session invite in chat and under Study Sessions</p>
          </div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close"><FiX /></button>
        </div>

        <form onSubmit={handleSubmit} className="create-session-form">
          <div className="form-group">
            <label>Session title *</label>
            <input type="text" value={formData.title} required className="input-field"
              placeholder="e.g., Calculus Problem Solving"
              onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Subject *</label>
              <select value={formData.subject} required className="input-field"
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}>
                <option value="">Select subject</option>
                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Duration *</label>
              <select value={formData.duration} className="input-field"
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}>
                <option value="30">30 min</option>
                <option value="60">1 hour</option>
                <option value="90">1.5 hours</option>
                <option value="120">2 hours</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Date *</label>
              <input type="date" value={formData.date} required className="input-field"
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Time *</label>
              <input type="time" value={formData.time} required className="input-field"
                onChange={(e) => setFormData({ ...formData, time: e.target.value })} />
            </div>
          </div>

          <div className="form-group">
            <label>How you&apos;ll meet</label>
            <div className="session-format-toggle">
              <button
                type="button"
                className={`format-option ${formData.sessionFormat === 'online' ? 'active' : ''}`}
                onClick={() => setFormData({ ...formData, sessionFormat: 'online', location: '' })}
              >
                <FiVideo /> Online (video in app)
              </button>
              <button
                type="button"
                className={`format-option ${formData.sessionFormat === 'in_person' ? 'active' : ''}`}
                onClick={() => setFormData({ ...formData, sessionFormat: 'in_person' })}
              >
                <FiMapPin /> In person
              </button>
            </div>
            {formData.sessionFormat === 'online' ? (
              <p className="field-hint">Join video from the session page when it&apos;s time — no link needed.</p>
            ) : (
              <input
                type="text"
                className="input-field"
                placeholder="e.g., Main library, 2nd floor"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Repeat</label>
              <select value={formData.recurrence} className="input-field"
                onChange={(e) => setFormData({ ...formData, recurrence: e.target.value })}>
                <option value="none">One-time</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Every 2 weeks</option>
              </select>
            </div>
            {formData.recurrence !== 'none' && (
              <div className="form-group">
                <label>Extra sessions</label>
                <select value={formData.recurrenceCount} className="input-field"
                  onChange={(e) => setFormData({ ...formData, recurrenceCount: e.target.value })}>
                  {[1, 2, 3, 4, 5, 6, 8, 10, 12].map(n => (
                    <option key={n} value={n}>{n} more</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea value={formData.description} rows={2} className="input-field"
              placeholder="What will you cover?"
              onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
          </div>

          <div className="form-group">
            <label><FiUsers style={{ marginRight: '8px' }} />Invite buddies ({formData.invitedBuddies.length})</label>
            {studyBuddies.length === 0 ? (
              <p className="text-muted">Connect with study buddies first to invite them.</p>
            ) : (
              <div className="buddy-selection-grid">
                {studyBuddies.map(buddy => (
                  <div
                    key={buddy.id}
                    type="button"
                    role="button"
                    tabIndex={0}
                    className={`buddy-selection-card ${formData.invitedBuddies.includes(buddy.id) ? 'selected' : ''}`}
                    onClick={() => toggleBuddySelection(buddy.id)}
                    onKeyDown={(e) => e.key === 'Enter' && toggleBuddySelection(buddy.id)}
                  >
                    <div className="buddy-avatar">{buddy.name.charAt(0)}</div>
                    <div className="buddy-info"><div className="buddy-name">{buddy.name}</div></div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {availabilityConflicts.length > 0 && (
            <div className="availability-warning">
              ⚠️ {availabilityConflicts.map(c => c.name).join(', ')} may not be available at this time.
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              <FiPlus /> {submitting ? 'Planning…' : 'Plan session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateSessionModal;
