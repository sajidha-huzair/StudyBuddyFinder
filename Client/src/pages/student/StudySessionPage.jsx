import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiPlus, FiCalendar, FiCheck, FiVideo } from 'react-icons/fi';
import sessionService from '../../services/sessionService';
import SessionVideoModal from '../../components/sessions/SessionVideoModal';
import SessionDetailModal from '../../components/sessions/SessionDetailModal';
import CreateSessionModal from '../../components/sessions/CreateSessionModal';
import { useAuth } from '../../contexts/AuthContext';
import { sessionTabForRecord } from '../../utils/sessionNav';
import { toast } from 'react-toastify';

const StudySessionPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [initialBuddyIds, setInitialBuddyIds] = useState([]);
  const [filter, setFilter] = useState(searchParams.get('tab') || 'upcoming');
  const [videoSession, setVideoSession] = useState(null);
  const [videoData, setVideoData] = useState(null);
  const [detailSession, setDetailSession] = useState(null);
  const [highlightSessionId, setHighlightSessionId] = useState(null);

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

  const loadSessions = useCallback(async (tab = filter) => {
    try {
      return await sessionService.getSessions(tab);
    } catch {
      toast.error('Failed to load sessions');
      return [];
    }
  }, [filter]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await loadSessions(filter);
      if (!cancelled) setSessions(data);
    })();
    return () => { cancelled = true; };
  }, [filter, loadSessions]);

  useEffect(() => {
    const sessionId = searchParams.get('session');
    if (!sessionId) return undefined;

    let cancelled = false;
    (async () => {
      try {
        const session = await sessionService.getSessionById(sessionId);
        if (cancelled) return;
        const tab = sessionTabForRecord(session);
        setFilter(tab);
        const list = await sessionService.getSessions(tab);
        if (cancelled) return;
        setSessions(list);
        const found = list.find((s) => String(s.id) === String(sessionId)) || session;
        setDetailSession(found);
        setHighlightSessionId(String(sessionId));
        window.setTimeout(() => {
          document.getElementById(`session-card-${sessionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);
      } catch {
        if (!cancelled) toast.error('Session not found');
      }
    })();

    return () => { cancelled = true; };
  }, [searchParams]);

  const changeTab = (tab) => {
    setFilter(tab);
    setDetailSession(null);
    setHighlightSessionId(null);
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    next.delete('session');
    setSearchParams(next, { replace: true });
  };

  const refreshSessions = async () => {
    setSessions(await loadSessions(filter));
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
      refreshSessions();
    } catch {
      toast.error('Failed to accept invitation');
    }
  };

  const handleDeclineInvite = async (e, sessionId) => {
    e.stopPropagation();
    try {
      await sessionService.declineInvite(sessionId);
      toast.info('Invitation declined');
      refreshSessions();
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
          <button key={tab} className={filter === tab ? 'active' : ''} onClick={() => changeTab(tab)}>
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
            <div
              key={session.id}
              id={`session-card-${session.id}`}
              className={`session-card card ${highlightSessionId === String(session.id) ? 'session-card-highlight' : ''}`}
              onClick={() => setDetailSession(session)}
            >
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
          onClose={() => {
            setDetailSession(null);
            setHighlightSessionId(null);
            const next = new URLSearchParams(searchParams);
            next.delete('session');
            setSearchParams(next, { replace: true });
          }}
          onUpdated={refreshSessions}
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
          onMeetingEnded={refreshSessions}
        />
      )}

      <CreateSessionModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={refreshSessions}
        initialBuddyIds={initialBuddyIds}
      />
    </div>
  );
};

export default StudySessionPage;
