import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiX, FiStar, FiUserPlus, FiClock, FiCalendar, FiBookmark, FiFlag } from 'react-icons/fi';
import { REQUEST_TEMPLATES, DAY_LABELS } from '../../constants/messageTemplates';
import VerifiedBadge from '../common/VerifiedBadge';

const ACTIVITY_LABELS = {
  today: 'Active today',
  week: 'Active this week',
  inactive: 'Not recently active',
};

const BuddyDetailModal = ({ buddy, onClose, onSendRequest, onToggleBookmark, sending }) => {
  const [requestMessage, setRequestMessage] = useState(REQUEST_TEMPLATES[0]);
  const [suggestDate, setSuggestDate] = useState('');
  const [suggestTime, setSuggestTime] = useState('');

  useEffect(() => {
    if (!buddy) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [buddy, onClose]);

  useEffect(() => {
    if (buddy) {
      setRequestMessage(REQUEST_TEMPLATES[0]);
      setSuggestDate('');
      setSuggestTime('');
    }
  }, [buddy]);

  if (!buddy) return null;

  const renderTags = (items, badgeClass) => {
    if (!items?.length) {
      return <span className="text-muted">None listed</span>;
    }
    return (
      <div className="tag-list">
        {items.map((item) => (
          <span key={item} className={`badge ${badgeClass}`}>{item}</span>
        ))}
      </div>
    );
  };

  const buildRequestMessage = () => {
    let msg = requestMessage.trim();
    if (suggestDate && suggestTime) {
      msg += ` I'd suggest studying on ${suggestDate} at ${suggestTime}.`;
    } else if (suggestDate) {
      msg += ` I'd suggest studying on ${suggestDate}.`;
    }
    return msg;
  };

  const handleSendRequest = () => {
    onSendRequest(buddy.id, buildRequestMessage());
  };

  const shared = buddy.sharedAvailability?.slots || {};
  const overlapCount = buddy.overlapCount ?? buddy.sharedAvailability?.overlapCount ?? 0;
  const breakdown = buddy.matchBreakdown || {};

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content buddy-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header buddy-detail-header">
          <div className="buddy-detail-title">
            <div className="match-avatar">{buddy.name.charAt(0)}</div>
            <div>
              <h2>
                {buddy.name}
                <VerifiedBadge show={buddy.isVerified ?? buddy.is_verified} />
              </h2>
              <p className="match-meta">
                {[buddy.educationLevel, buddy.university, buddy.major, buddy.year]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              {buddy.activityStatus && (
                <span className={`activity-badge activity-${buddy.activityStatus}`}>
                  {ACTIVITY_LABELS[buddy.activityStatus]}
                </span>
              )}
            </div>
          </div>
          <div className="buddy-detail-header-actions">
            <div className="compatibility-score">
              <FiStar />
              <span>{buddy.compatibilityScore}% match</span>
            </div>
            <button type="button" className="close-btn" onClick={onClose} aria-label="Close">
              <FiX />
            </button>
          </div>
        </div>

        <div className="buddy-detail-body">
          {buddy.matchReasons?.length > 0 && (
            <section className="detail-section match-reasons-section">
              <strong>Why you match</strong>
              <ul className="match-reasons-list">
                {buddy.matchReasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
              {(breakdown.sharedSubjects != null) && (
                <div className="match-breakdown">
                  <span>Subjects {breakdown.sharedSubjects}%</span>
                  <span>Skills {breakdown.complementarity}%</span>
                  <span>Style {breakdown.learningStyle}%</span>
                  <span>Level {breakdown.educationLevel}%</span>
                </div>
              )}
            </section>
          )}

          <section className="detail-section">
            <strong><FiClock /> Shared availability</strong>
            {overlapCount > 0 ? (
              <>
                <p className="availability-summary">
                  {overlapCount} overlapping time slot{overlapCount !== 1 ? 's' : ''}
                  {buddy.sharedAvailability?.summaryDays?.length > 0 && (
                    <> on {buddy.sharedAvailability.summaryDays.join(', ')}</>
                  )}
                </p>
                <div className="shared-slots-grid">
                  {Object.entries(shared).map(([day, slots]) => (
                    <div key={day} className="shared-day-row">
                      <span className="shared-day-label">{DAY_LABELS[day] || day}</span>
                      <div className="shared-day-slots">
                        {slots.map((slot) => (
                          <span key={slot} className="badge badge-primary">{slot}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-muted availability-summary">
                No overlapping slots yet — one of you may not have set availability, or try coordinating via chat.
              </p>
            )}
          </section>

          {buddy.bio && (
            <section className="detail-section">
              <strong>About</strong>
              <p className="buddy-bio">{buddy.bio}</p>
            </section>
          )}

          <section className="detail-section">
            <strong>Subjects</strong>
            {renderTags(buddy.subjects, 'badge-primary')}
          </section>

          <section className="detail-section">
            <strong>Strengths</strong>
            {renderTags(buddy.strengths, 'badge-success')}
          </section>

          {buddy.weaknesses?.length > 0 && (
            <section className="detail-section">
              <strong>Areas to improve</strong>
              {renderTags(buddy.weaknesses, 'badge-warning')}
            </section>
          )}

          {buddy.learningStyle && (
            <section className="detail-section">
              <strong>Learning style</strong>
              <p>{buddy.learningStyle}</p>
            </section>
          )}

          {buddy.studyGoals?.length > 0 && (
            <section className="detail-section">
              <strong>Study goals</strong>
              {renderTags(buddy.studyGoals, 'badge-primary')}
            </section>
          )}

          <section className="detail-section request-message-section">
            <strong>Your request message</strong>
            <div className="template-chips">
              {REQUEST_TEMPLATES.map((tpl) => (
                <button
                  key={tpl}
                  type="button"
                  className={`template-chip ${requestMessage === tpl ? 'active' : ''}`}
                  onClick={() => setRequestMessage(tpl)}
                >
                  {tpl.length > 48 ? `${tpl.slice(0, 48)}…` : tpl}
                </button>
              ))}
            </div>
            <textarea
              className="input-field request-message-input"
              rows={3}
              value={requestMessage}
              onChange={(e) => setRequestMessage(e.target.value)}
              placeholder="Write a friendly intro..."
            />
            <div className="suggest-session-row">
              <FiCalendar />
              <span>Suggest a first session (optional)</span>
              <input
                type="date"
                className="input-field"
                value={suggestDate}
                onChange={(e) => setSuggestDate(e.target.value)}
              />
              <input
                type="time"
                className="input-field"
                value={suggestTime}
                onChange={(e) => setSuggestTime(e.target.value)}
              />
            </div>
          </section>
        </div>

        <div className="modal-actions buddy-detail-actions">
          <Link
            to={`/report?userId=${buddy.id}&name=${encodeURIComponent(buddy.name)}`}
            className="btn btn-outline btn-report-link"
            onClick={onClose}
          >
            <FiFlag /> Report
          </Link>
          {onToggleBookmark && (
            <button
              type="button"
              className={`btn btn-outline ${buddy.isBookmarked ? 'bookmarked' : ''}`}
              onClick={(e) => onToggleBookmark(buddy.id, e)}
            >
              <FiBookmark /> {buddy.isBookmarked ? 'Saved' : 'Save profile'}
            </button>
          )}
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={sending || !requestMessage.trim()}
            onClick={handleSendRequest}
          >
            <FiUserPlus /> {sending ? 'Sending…' : 'Send Request'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BuddyDetailModal;
