import React, { useState, useEffect } from 'react';
import { FiPlus, FiX, FiUsers, FiVideo } from 'react-icons/fi';
import sessionService from '../../services/sessionService';
import matchService from '../../services/matchService';
import { flattenSubjects, PAST_PAPER_TEMPLATES } from '../../constants/curriculum/sl';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';

const EMPTY_FORM = {
  title: '',
  subject: '',
  date: '',
  time: '',
  duration: '60',
  description: '',
  invitedBuddies: [],
  recurrence: 'none',
  recurrenceCount: '0',
  templateId: '',
  sessionGoal: '',
  pastPaperRef: '',
  topics: '',
  checklist: '',
};

const CreateSessionModal = ({
  open,
  onClose,
  onCreated,
  initialBuddyIds = [],
  title = 'Plan online study session',
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({ ...EMPTY_FORM, invitedBuddies: initialBuddyIds });
  const [studyBuddies, setStudyBuddies] = useState([]);
  const [availabilityConflicts, setAvailabilityConflicts] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const userSubjects = flattenSubjects(user) || [];

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

  const applyTemplate = (template) => {
    setFormData((prev) => ({
      ...prev,
      templateId: template.id,
      title: template.label,
      subject: template.subject,
      sessionGoal: `Complete ${template.label} together`,
      pastPaperRef: template.label,
    }));
  };

  const toggleBuddySelection = (buddyId) => {
    setFormData((prev) => {
      const already = prev.invitedBuddies.includes(buddyId);
      if (!already && prev.invitedBuddies.length >= 4) {
        toast.info('Maximum 5 participants per session (including you)');
        return prev;
      }
      return {
        ...prev,
        invitedBuddies: already
          ? prev.invitedBuddies.filter((id) => id !== buddyId)
          : [...prev.invitedBuddies, buddyId],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const session = await sessionService.createSession({
        ...formData,
        sessionFormat: 'online',
        agenda: {
          templateId: formData.templateId,
          sessionGoal: formData.sessionGoal,
          pastPaperRef: formData.pastPaperRef,
          topics: formData.topics.split(',').map((t) => t.trim()).filter(Boolean),
          checklist: formData.checklist.split('\n').map((t) => t.trim()).filter(Boolean),
          preReadNotes: formData.description,
        },
      });
      toast.success('Online study session planned!');
      onCreated?.(session);
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.error || error.response?.data?.detail || 'Failed to create session');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const templates = PAST_PAPER_TEMPLATES.filter(
    (t) => !user?.gradeBand || t.gradeBand === user.gradeBand,
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content create-session-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{title}</h2>
            <p className="text-muted"><FiVideo style={{ verticalAlign: 'middle' }} /> Online video session in the app</p>
          </div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close"><FiX /></button>
        </div>

        <form onSubmit={handleSubmit} className="create-session-form">
          {templates.length > 0 && (
            <div className="form-group">
              <label>Quick template (optional)</label>
              <div className="template-chips">
                {templates.map((t) => (
                  <button key={t.id} type="button"
                    className={`chip ${formData.templateId === t.id ? 'active' : ''}`}
                    onClick={() => applyTemplate(t)}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Session title *</label>
            <input type="text" value={formData.title} required className="input-field"
              placeholder="e.g., O/L Maths Past Paper 2023"
              onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Subject *</label>
              <select value={formData.subject} required className="input-field"
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}>
                <option value="">Select subject</option>
                {(userSubjects.length ? userSubjects : ['Mathematics', 'Science', 'English']).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
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
            <label>Session goal</label>
            <input type="text" className="input-field" value={formData.sessionGoal}
              placeholder="e.g., Finish Paper I MCQs and discuss Q5"
              onChange={(e) => setFormData({ ...formData, sessionGoal: e.target.value })} />
          </div>

          <div className="form-group">
            <label>Past paper reference</label>
            <input type="text" className="input-field" value={formData.pastPaperRef}
              placeholder="e.g., 2022 O/L Mathematics Paper I"
              onChange={(e) => setFormData({ ...formData, pastPaperRef: e.target.value })} />
          </div>

          <div className="form-group">
            <label>Topics (comma-separated)</label>
            <input type="text" className="input-field" value={formData.topics}
              placeholder="Algebra, Quadratic equations"
              onChange={(e) => setFormData({ ...formData, topics: e.target.value })} />
          </div>

          <div className="form-group">
            <label>Pre-session checklist (one per line)</label>
            <textarea className="input-field" rows={2} value={formData.checklist}
              placeholder={'Bring calculator\nDownload past paper PDF'}
              onChange={(e) => setFormData({ ...formData, checklist: e.target.value })} />
          </div>

          <div className="form-group">
            <label>Notes for buddies</label>
            <textarea value={formData.description} rows={2} className="input-field"
              placeholder="What should buddies prepare?"
              onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
          </div>

          <div className="form-group">
            <label><FiUsers style={{ marginRight: '8px' }} />Invite buddies ({formData.invitedBuddies.length})</label>
            <p className="text-muted" style={{ marginBottom: '0.5rem', fontSize: '0.85rem' }}>
              Up to 5 people total per session (including you). You have selected {formData.invitedBuddies.length + 1}.
            </p>
            {formData.invitedBuddies.length >= 4 && (
              <p className="text-muted" style={{ marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--warning, #b45309)' }}>
                Maximum reached — remove a buddy to invite someone else.
              </p>
            )}
            {studyBuddies.length === 0 ? (
              <p className="text-muted">Connect with study buddies first to invite them.</p>
            ) : (
              <div className="buddy-selection-grid">
                {studyBuddies.map((buddy) => (
                  <div key={buddy.id} role="button" tabIndex={0}
                    className={`buddy-selection-card ${formData.invitedBuddies.includes(buddy.id) ? 'selected' : ''}`}
                    onClick={() => toggleBuddySelection(buddy.id)}
                    onKeyDown={(ev) => ev.key === 'Enter' && toggleBuddySelection(buddy.id)}>
                    <div className="buddy-avatar">{buddy.name.charAt(0)}</div>
                    <div className="buddy-info"><div className="buddy-name">{buddy.name}</div></div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {availabilityConflicts.length > 0 && (
            <div className="availability-warning">
              ⚠️ {availabilityConflicts.map((c) => c.name).join(', ')} may not be available at this time.
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
