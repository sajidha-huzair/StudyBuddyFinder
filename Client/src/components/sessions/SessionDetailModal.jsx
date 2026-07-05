import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiX, FiVideo, FiCheck, FiEdit2, FiSave, FiClock, FiUsers, FiSlash, FiMessageCircle } from 'react-icons/fi';
import sessionService from '../../services/sessionService';
import chatService from '../../services/chatService';
import SessionLifecyclePanel from './SessionLifecyclePanel';
import { toast } from 'react-toastify';

const SessionDetailModal = ({ session, filter, onClose, onUpdated, onJoinVideo }) => {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [chatRoomId, setChatRoomId] = useState(session?.chatRoomId || null);

  const isOnline = true;

  useEffect(() => {
    if (session) {
      setForm({
        title: session.title,
        subject: session.subject,
        date: session.date,
        time: session.time,
        duration: String(session.duration || 60),
        description: session.description || '',
      });
      setEditing(false);
      setChatRoomId(session.chatRoomId || null);
      if (!session.chatRoomId) {
        chatService.getChatRoomForSession(session.id)
          .then((room) => setChatRoomId(room.id))
          .catch(() => {});
      }
    }
  }, [session]);

  if (!session) return null;

  const canEdit = session.isOrganizer && filter === 'upcoming' && session.status === 'upcoming';
  const canLeave = !session.isOrganizer && filter === 'upcoming' && session.status === 'upcoming';
  const recurrenceLabel = {
    none: 'One-time',
    weekly: 'Weekly series',
    biweekly: 'Every 2 weeks',
  }[session.recurrence] || 'One-time';

  const handleSave = async () => {
    try {
      await sessionService.updateSession(session.id, form);
      toast.success('Session updated');
      setEditing(false);
      onUpdated?.();
    } catch (error) {
      toast.error('Failed to update session');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content session-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="session-badge">{session.subject}</span>
            <h2>{session.title}</h2>
          </div>
          <button className="close-btn" onClick={onClose}><FiX /></button>
        </div>

        <div className="session-detail-body">
          {editing ? (
            <div className="session-edit-form">
              <div className="form-group">
                <label>Title</label>
                <input className="input-field" value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Date</label>
                  <input type="date" className="input-field" value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Time</label>
                  <input type="time" className="input-field" value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label>Duration (minutes)</label>
                <select className="input-field" value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: e.target.value })}>
                  <option value="30">30 min</option>
                  <option value="60">1 hour</option>
                  <option value="90">1.5 hours</option>
                  <option value="120">2 hours</option>
                </select>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea className="input-field" rows={3} value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>
          ) : (
            <>
              <div className="session-detail-grid">
                <div className="detail-item"><FiClock /> {session.date} at {session.time}</div>
                <div className="detail-item"><FiClock /> {session.duration} min planned</div>
                <div className="detail-item"><FiVideo /> Online video session</div>
                <div className="detail-item"><FiUsers /> {session.participantCount} / {session.maxParticipants || session.max_participants || 5} max</div>
              </div>
              {session.organizer && (
                <p className="text-muted">Organized by <strong>{session.organizer.name}</strong></p>
              )}
              {session.description && <p className="session-description">{session.description}</p>}
              <p className="text-muted">Schedule: {recurrenceLabel}
                {session.recurrenceCount > 0 && ` (+${session.recurrenceCount} more sessions)`}
              </p>
              {session.startedAt && (
                <p className="text-muted">Started: {new Date(session.startedAt).toLocaleString()}</p>
              )}
              {session.endedAt && (
                <p className="text-muted">
                  Ended: {new Date(session.endedAt).toLocaleString()}
                  {session.actualDuration && ` · ${session.actualDuration} min recorded`}
                </p>
              )}
              {session.participants?.length > 0 && (
                <div className="participant-chips">
                  {session.participants.map(p => (
                    <span key={p.id} className="chip">{p.name}</span>
                  ))}
                </div>
              )}
              <SessionLifecyclePanel session={session} filter={filter} />
            </>
          )}
        </div>

        <div className="modal-actions session-detail-actions">
          {canEdit && !editing && (
            <button className="btn btn-outline btn-sm" onClick={() => setEditing(true)}>
              <FiEdit2 /> Reschedule
            </button>
          )}
          {editing && (
            <button className="btn btn-primary btn-sm" onClick={handleSave}>
              <FiSave /> Save Changes
            </button>
          )}
          {filter === 'upcoming' && session.status === 'upcoming' && isOnline && (
            <button className="btn btn-primary btn-sm" onClick={() => onJoinVideo(session)}>
              <FiVideo /> Join Video
            </button>
          )}
          {chatRoomId && (
            <button className="btn btn-outline btn-sm" onClick={() => {
              onClose();
              navigate(`/chat/room/${chatRoomId}`);
            }}>
              <FiMessageCircle /> Group chat
            </button>
          )}
          {canEdit && !editing && (
            <button className="btn btn-outline btn-sm" onClick={async () => {
              try {
                await sessionService.completeSession(session.id);
                toast.success('Session completed');
                onUpdated?.();
                onClose();
              } catch { toast.error('Failed to complete'); }
            }}>
              <FiCheck /> Mark Complete
            </button>
          )}
          {canEdit && !editing && (
            <button className="btn btn-outline btn-sm" onClick={async () => {
              if (!window.confirm('Cancel this session for all participants?')) return;
              try {
                await sessionService.cancelSession(session.id);
                toast.success('Session cancelled');
                onUpdated?.();
                onClose();
              } catch { toast.error('Failed to cancel session'); }
            }}>
              <FiSlash /> Cancel Session
            </button>
          )}
          {canLeave && (
            <button className="btn btn-outline btn-sm" onClick={async () => {
              if (!window.confirm('Leave this session?')) return;
              try {
                await sessionService.leaveSession(session.id);
                toast.info('You left the session');
                onUpdated?.();
                onClose();
              } catch { toast.error('Failed to leave session'); }
            }}>
              <FiSlash /> Leave Session
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionDetailModal;
