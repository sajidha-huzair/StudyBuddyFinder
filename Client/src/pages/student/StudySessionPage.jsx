import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiPlus, FiCalendar, FiCheck, FiVideo } from 'react-icons/fi';
import sessionService from '../../services/sessionService';
import SessionVideoModal from '../../components/sessions/SessionVideoModal';
import SessionDetailModal from '../../components/sessions/SessionDetailModal';
import CreateSessionModal from '../../components/sessions/CreateSessionModal';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';

const StudySessionPage = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [initialBuddyIds, setInitialBuddyIds] = useState([]);
  const [filter, setFilter] = useState(searchParams.get('tab') || 'upcoming');
  const [videoSession, setVideoSession] = useState(null);
  const [videoData, setVideoData] = useState(null);
  const [detailSession, setDetailSession] = useState(null);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['upcoming', 'invitations', 'past'].includes(tab)) {
      setFilter(tab);
    }

    const shouldCreate = searchParams.get('create') === 'true';
    const buddyId = searchParams.get('buddyId');
    if (shouldCreate) {
      setShowCreateModal(true);
      if (buddyId) {
        setInitialBuddyIds([Number(buddyId)]);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    loadSessions();
  }, [filter]);

  const loadSessions = async () => {
    try {
      setSessions(await sessionService.getSessions(filter));
    } catch {
      toast.error('Failed to load sessions');
    }
  };

  const handleJoinVideo = async (session, e) => {
    e?.stopPropagation();
    try {
      const data = await sessionService.getVideoRoom(session.id);
      setDetailSession(null);
      setVideoSession(session);
      setVideoData(data);
    } catch {
      toast.error('Failed to open video session');
    }
  };

  const handleAcceptInvite = async (e, sessionId) => {
    e.stopPropagation();
    try {
      await sessionService.acceptInvite(sessionId);
      toast.success('Invitation accepted!');
      loadSessions();
    } catch {
      toast.error('Failed to accept invitation');
    }
  };

  const handleDeclineInvite = async (e, sessionId) => {
    e.stopPropagation();
    try {
      await sessionService.declineInvite(sessionId);
      toast.info('Invitation declined');
      loadSessions();
    } catch {
      toast.error('Failed to decline invitation');
    }
  };

  const isOnlineSession = (session) => (session.sessionFormat || (session.location ? 'in_person' : 'online')) === 'online';

  return (
    <div className="sessions-page page-container">
      <div className="page-header flex-between">
        <div>
          <h1>Study Sessions</h1>
          <p>Plan sessions, join video calls, and track your study time</p>
        </div>
        <button onClick={() => { setInitialBuddyIds([]); setShowCreateModal(true); }} className="btn btn-primary">
          <FiPlus /> New Session
        </button>
      </div>

      <div className="filter-tabs">
        {['upcoming', 'invitations', 'past'].map(tab => (
          <button key={tab} className={filter === tab ? 'active' : ''} onClick={() => setFilter(tab)}>
            {tab === 'invitations' ? 'Invitations' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="sessions-grid">
        {sessions.length === 0 ? (
          <div className="empty-state card" style={{ gridColumn: '1 / -1' }}>
            <FiCalendar size={48} />
            <p>No {filter === 'invitations' ? 'pending invitations' : filter} sessions</p>
            {filter === 'upcoming' && (
              <button className="btn btn-primary btn-sm" onClick={() => { setInitialBuddyIds([]); setShowCreateModal(true); }}>
                Schedule your first session
              </button>
            )}
          </div>
        ) : (
          sessions.map(session => (
            <div key={session.id} className="session-card card" onClick={() => setDetailSession(session)}>
              <span className="session-badge">{session.subject}</span>
              <h3>{session.title}</h3>
              {session.organizer && (
                <p className="text-muted" style={{ fontSize: '0.85rem' }}>with {session.organizer.name}</p>
              )}
              <div className="session-meta">
                <span>{session.date}</span>
                <span>{session.time}</span>
                <span>{isOnlineSession(session) ? 'Online' : 'In person'}</span>
                <span>{session.participantCount || 0} people</span>
              </div>

              {filter === 'invitations' && session.myInviteStatus === 'invited' && (
                <div className="session-actions" style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={(e) => handleAcceptInvite(e, session.id)} className="btn btn-primary btn-sm">
                    <FiCheck /> Accept
                  </button>
                  <button onClick={(e) => handleDeclineInvite(e, session.id)} className="btn btn-outline btn-sm">
                    Decline
                  </button>
                </div>
              )}

              {filter === 'upcoming' && isOnlineSession(session) && (
                <div className="session-actions" style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={(e) => handleJoinVideo(session, e)} className="btn btn-primary btn-sm">
                    <FiVideo /> Join Video
                  </button>
                </div>
              )}

              {session.actualDuration && (
                <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
                  Recorded: {session.actualDuration} min
                </p>
              )}
            </div>
          ))
        )}
      </div>

      {detailSession && (
        <SessionDetailModal
          session={detailSession}
          filter={filter}
          onClose={() => setDetailSession(null)}
          onUpdated={loadSessions}
          onJoinVideo={(s) => handleJoinVideo(s)}
        />
      )}

      {videoSession && (
        <SessionVideoModal
          session={videoSession}
          videoData={videoData}
          chatBuddy={(() => {
            const buddy = videoSession.participants?.find(p => p.id !== user?.id);
            return buddy ? { id: buddy.id, name: buddy.name } : null;
          })()}
          onClose={() => { setVideoSession(null); setVideoData(null); }}
          onMeetingEnded={loadSessions}
        />
      )}

      <CreateSessionModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={loadSessions}
        initialBuddyIds={initialBuddyIds}
      />
    </div>
  );
};

export default StudySessionPage;
