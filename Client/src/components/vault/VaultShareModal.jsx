import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiX, FiSend, FiUsers, FiUser } from 'react-icons/fi';
import matchService from '../../services/matchService';
import chatService from '../../services/chatService';
import sessionService from '../../services/sessionService';
import { toast } from 'react-toastify';

const VaultShareModal = ({ file, onClose }) => {
  const navigate = useNavigate();
  const [buddies, setBuddies] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [targetType, setTargetType] = useState('buddy');
  const [targetId, setTargetId] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [buddyList, roomList] = await Promise.all([
          matchService.getStudyBuddies().catch(() => []),
          chatService.getChatRooms().catch(() => []),
        ]);
        if (!cancelled) {
          setBuddies(buddyList);
          setRooms(roomList);
          if (buddyList.length) {
            setTargetType('buddy');
            setTargetId(String(buddyList[0].id));
          } else if (roomList.length) {
            setTargetType('room');
            setTargetId(String(roomList[0].id));
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleShare = async () => {
    if (!targetId) {
      toast.error('Choose someone to share with');
      return;
    }
    setSharing(true);
    try {
      const payload = {
        message: note.trim(),
        ...(targetType === 'buddy' ? { buddyId: Number(targetId) } : { roomId: Number(targetId) }),
      };
      const result = await sessionService.shareVaultFile(file.id, payload);
      toast.success('Shared to chat');
      onClose?.();
      if (result.target === 'room') {
        navigate(`/chat/room/${result.roomId}`);
      } else if (result.target === 'buddy') {
        navigate(`/chat/${result.buddyId}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not share file');
    } finally {
      setSharing(false);
    }
  };

  const hasTargets = buddies.length > 0 || rooms.length > 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content vault-share-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Share to chat</h2>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Close">
            <FiX />
          </button>
        </div>
        <p className="text-muted vault-share-file-name">{file.title}</p>

        {loading ? (
          <div className="flex-center"><div className="spinner" /></div>
        ) : !hasTargets ? (
          <p className="text-muted">Connect with study buddies or join a session group chat first.</p>
        ) : (
          <>
            <div className="vault-share-target-tabs">
              {buddies.length > 0 && (
                <button
                  type="button"
                  className={targetType === 'buddy' ? 'active' : ''}
                  onClick={() => {
                    setTargetType('buddy');
                    setTargetId(String(buddies[0].id));
                  }}
                >
                  <FiUser /> Buddy
                </button>
              )}
              {rooms.length > 0 && (
                <button
                  type="button"
                  className={targetType === 'room' ? 'active' : ''}
                  onClick={() => {
                    setTargetType('room');
                    setTargetId(String(rooms[0].id));
                  }}
                >
                  <FiUsers /> Group chat
                </button>
              )}
            </div>

            <div className="form-group">
              <label>{targetType === 'buddy' ? 'Study buddy' : 'Group chat'}</label>
              <select
                className="input-field"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
              >
                {(targetType === 'buddy' ? buddies : rooms).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name || item.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Message (optional)</label>
              <input
                type="text"
                className="input-field"
                placeholder="Check out this file from my vault…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </>
        )}

        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!hasTargets || sharing}
            onClick={handleShare}
          >
            <FiSend /> {sharing ? 'Sharing…' : 'Share'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VaultShareModal;
