import React from 'react';
import { FiPaperclip, FiVideo, FiCalendar, FiCheck, FiBookmark, FiMapPin } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { openSessionFromChat } from '../../utils/sessionNav';
import sessionService from '../../services/sessionService';

const formatRange = (meta) => {
  if (!meta?.startedAt) return null;
  const start = new Date(meta.startedAt);
  const end = meta.endedAt ? new Date(meta.endedAt) : null;
  const opts = { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' };
  const startStr = start.toLocaleString(undefined, opts);
  if (!end) return startStr;
  const endStr = end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${startStr} – ${endStr}`;
};

const ChatMessage = ({ msg, onPin }) => {
  const navigate = useNavigate();
  const type = msg.messageType || 'TEXT';
  const meta = msg.metadata || {};
  const isSent = msg.sender === 'me';
  const time = new Date(msg.timestamp || msg.createdAt).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });

  const renderBody = () => {
    if (type === 'FILE') {
      const fileUrl = msg.attachmentUrl || meta.downloadUrl;
      const isImage = (meta.mimeType || '').startsWith('image/');
      return (
        <div className="message-file">
          {isImage && fileUrl ? (
            <a href={fileUrl} target="_blank" rel="noreferrer">
              <img src={fileUrl} alt={meta.fileName || 'Attachment'} className="message-image" />
            </a>
          ) : (
            <a href={fileUrl || '#'} target="_blank" rel="noreferrer" className="message-file-link">
              <FiPaperclip /> {meta.fileName || msg.content}
            </a>
          )}
        </div>
      );
    }

    if (type === 'RECORDING') {
      const watchUrl = meta.recordingUrl || meta.downloadUrl;
      return (
        <div className="message-recording card">
          <div className="message-recording-head">
            <FiVideo />
            <strong>{meta.sessionTitle || 'Session recording'}</strong>
          </div>
          {formatRange(meta) && <p className="message-recording-time">{formatRange(meta)}</p>}
          {watchUrl ? (
            <>
              <video
                src={watchUrl}
                controls
                playsInline
                preload="metadata"
                className="message-recording-video"
              />
              <a href={watchUrl} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
                Open in new tab
              </a>
            </>
          ) : (
            <p className="text-muted">Recording is processing — check back in a minute…</p>
          )}
        </div>
      );
    }

    if (type === 'SESSION_PROPOSAL') {
      const format = meta.sessionFormat || (meta.location ? 'in_person' : 'online');
      return (
        <div className="message-proposal card">
          <div className="message-proposal-head">
            <FiCalendar />
            <strong>{meta.title || 'Study session planned'}</strong>
          </div>
          <p>{meta.subject || meta.course || ''}</p>
          {(meta.date || meta.time) && (
            <p className="text-muted">{[meta.date, meta.time].filter(Boolean).join(' · ')}</p>
          )}
          <p className="text-muted proposal-format">
            {format === 'online' ? (
              <><FiVideo /> Online — join video from Sessions</>
            ) : (
              <><FiMapPin /> In person{meta.location ? `: ${meta.location}` : ''}</>
            )}
          </p>
          {meta.sessionId && (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => openSessionFromChat(navigate, meta.sessionId, sessionService)}>
              View session
            </button>
          )}
        </div>
      );
    }

    return <p>{msg.content || msg.text}</p>;
  };

  return (
    <div className={`message ${isSent ? 'sent' : 'received'} ${msg.isPinned ? 'pinned' : ''}`}>
      {msg.isPinned && <span className="message-pin-label"><FiBookmark /> Pinned</span>}
      {renderBody()}
      <div className="message-footer">
        <span className="message-time">{time}</span>
        {isSent && msg.read && <FiCheck className="read-receipt read" title="Read" />}
        {isSent && !msg.read && <FiCheck className="read-receipt" title="Sent" />}
        {onPin && (
          <button type="button" className="message-pin-btn" onClick={() => onPin(msg.id)} aria-label="Pin message">
            <FiBookmark />
          </button>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
