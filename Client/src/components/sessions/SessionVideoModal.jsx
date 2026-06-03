import DailyIframe from '@daily-co/daily-js';
import React, { useState, useEffect, useRef } from 'react';
import { FiX, FiMessageSquare, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import sessionService from '../../services/sessionService';
import InCallChatPanel from '../chat/InCallChatPanel';

const DAILY_HIDE_CHAT_CSS = `
  button[aria-label*="Chat" i],
  button[aria-label*="chat" i],
  [data-testid*="chat" i],
  .css-1y9oegl, .css-chat-button {
    display: none !important;
    visibility: hidden !important;
    pointer-events: none !important;
  }
`;

const destroyDailyInstance = async () => {
  const existing = DailyIframe.getCallInstance();
  if (!existing) return;
  try {
    await existing.leave();
  } catch {
  }
  try {
    await existing.destroy();
  } catch {
  }
};

const SessionVideoModal = ({ session, videoData, chatBuddy, onClose, onMeetingEnded }) => {
  const [ending, setEnding] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const containerRef = useRef(null);
  const callFrameRef = useRef(null);
  const recordingPollRef = useRef(null);

  const pollRecordingSync = (sessionId) => {
    if (recordingPollRef.current) {
      clearInterval(recordingPollRef.current);
    }
    let attempts = 0;
    const maxAttempts = 24;
    recordingPollRef.current = setInterval(async () => {
      attempts += 1;
      try {
        const result = await sessionService.syncRecording(sessionId);
        if (result?.ready || attempts >= maxAttempts) {
          clearInterval(recordingPollRef.current);
          recordingPollRef.current = null;
        }
      } catch {
        if (attempts >= maxAttempts) {
          clearInterval(recordingPollRef.current);
          recordingPollRef.current = null;
        }
      }
    }, 10000);
  };

  useEffect(() => () => {
    if (recordingPollRef.current) {
      clearInterval(recordingPollRef.current);
    }
  }, []);

  useEffect(() => {
    if (session?.id) {
      sessionService.startMeeting(session.id).catch(() => {});
    }
  }, [session?.id]);

  useEffect(() => {
    if (!session || !videoData?.videoRoomUrl || !containerRef.current) return undefined;
    if (videoData.provider === 'jitsi') return undefined;

    let cancelled = false;

    const startCall = async () => {
      await destroyDailyInstance();
      if (cancelled || !containerRef.current) return;

      try {
        const callFrame = DailyIframe.createFrame(containerRef.current, {
          showLeaveButton: true,
          showFullscreenButton: true,
          iframeStyle: {
            width: '100%',
            height: '100%',
            border: '0',
            borderRadius: '8px',
          },
          cssText: DAILY_HIDE_CHAT_CSS,
        });

        callFrameRef.current = callFrame;

        await callFrame.join({
          url: videoData.videoRoomUrl,
          token: videoData.meetingToken,
        });

        try {
          callFrame.loadCss({ cssText: DAILY_HIDE_CHAT_CSS });
        } catch {
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to start Daily call', err);
        }
      }
    };

    startCall();

    return () => {
      cancelled = true;
      callFrameRef.current = null;
      destroyDailyInstance();
    };
  }, [session?.id, videoData?.videoRoomUrl, videoData?.meetingToken, videoData?.provider]);

  const handleClose = async () => {
    await destroyDailyInstance();
    callFrameRef.current = null;

    if (session?.id && !ending) {
      setEnding(true);
      try {
        await sessionService.endMeeting(session.id);
        pollRecordingSync(session.id);
        onMeetingEnded?.();
      } catch {
        console.error('Failed to record meeting end');
      }
    }
    onClose();
  };

  if (!session || !videoData?.videoRoomUrl) return null;

  const isJitsi = videoData.provider === 'jitsi';
  const iframeSrc = isJitsi
    ? `${videoData.videoRoomUrl}#config.prejoinPageEnabled=false&config.startWithAudioMuted=false`
    : null;

  return (
    <div className="modal-overlay video-modal-overlay" onClick={handleClose}>
      <div
        className={`modal-content video-modal video-modal-split ${chatOpen ? 'chat-open' : 'chat-closed'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header video-modal-top">
          <div>
            <h2>{session.title}</h2>
            <p className="text-muted">
              Live session · {isJitsi ? 'Jitsi Meet' : 'Daily.co'} · Chat on the right uses your Messages history
            </p>
          </div>
          <div className="video-modal-actions">
            {chatBuddy && (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setChatOpen(!chatOpen)}
              >
                <FiMessageSquare />
                {chatOpen ? 'Hide chat' : 'Show chat'}
                {chatOpen ? <FiChevronRight /> : <FiChevronLeft />}
              </button>
            )}
            <button type="button" className="close-btn" onClick={handleClose} aria-label="Close">
              <FiX />
            </button>
          </div>
        </div>

        <div className="video-modal-body">
          <div className="video-pane">
            {isJitsi ? (
              <iframe
                title={`Video session: ${session.title}`}
                src={iframeSrc}
                allow="camera; microphone; fullscreen; display-capture; autoplay"
                className="video-pane-iframe"
              />
            ) : (
              <div ref={containerRef} className="daily-video-container video-pane-daily" />
            )}
          </div>

          {chatBuddy && chatOpen && (
            <div className="video-chat-pane">
              <InCallChatPanel buddy={chatBuddy} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionVideoModal;
