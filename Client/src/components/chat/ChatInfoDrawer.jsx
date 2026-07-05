import React, { useState, useEffect, useRef } from 'react';
import {
  FiX, FiUsers, FiImage, FiFile, FiLink, FiVideo, FiSearch, FiEdit2, FiSave, FiCamera,
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import chatService from '../../services/chatService';
import sessionService from '../../services/sessionService';
import { openSessionFromChat } from '../../utils/sessionNav';
import UserAvatar from '../common/UserAvatar';
import { toast } from 'react-toastify';

const MEDIA_TABS = [
  { id: 'media', label: 'Photos', icon: FiImage },
  { id: 'docs', label: 'Docs', icon: FiFile },
  { id: 'links', label: 'Links', icon: FiLink },
  { id: 'recordings', label: 'Recordings', icon: FiVideo },
];

const ChatInfoDrawer = ({
  open,
  onClose,
  mode = 'room',
  roomId = null,
  buddy = null,
  onRoomUpdated,
}) => {
  const navigate = useNavigate();
  const iconInputRef = useRef(null);
  const [tab, setTab] = useState('info');
  const [mediaTab, setMediaTab] = useState('media');
  const [room, setRoom] = useState(null);
  const [media, setMedia] = useState({ media: [], docs: [], links: [], recordings: [] });
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setTab('info');
      setSearchResults(null);
      setSearchQ('');
      setEditing(false);
      return;
    }
    const load = async () => {
      setLoading(true);
      try {
        if (mode === 'room' && roomId) {
          const [detail, mediaData] = await Promise.all([
            chatService.getChatRoomDetail(roomId),
            chatService.getRoomMedia(roomId),
          ]);
          setRoom(detail);
          setEditTitle(detail.title || '');
          setEditDescription(detail.description || '');
          setMedia(mediaData);
        } else if (mode === 'buddy' && buddy?.id) {
          const mediaData = await chatService.getBuddyMedia(buddy.id);
          setMedia(mediaData);
        }
      } catch {
        toast.error('Failed to load chat info');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open, mode, roomId, buddy?.id]);

  const runSearch = async () => {
    const q = searchQ.trim();
    if (!q) {
      setSearchResults(null);
      return;
    }
    try {
      if (mode === 'room' && roomId) {
        setSearchResults(await chatService.getRoomMessages(roomId, q));
      } else if (buddy?.id) {
        setSearchResults(await chatService.getMessages(buddy.id, q));
      }
      setTab('search');
    } catch {
      toast.error('Search failed');
    }
  };

  const saveRoom = async () => {
    if (!roomId) return;
    setSaving(true);
    try {
      const updated = await chatService.updateChatRoom(roomId, {
        title: editTitle.trim(),
        description: editDescription.trim(),
      });
      setRoom(updated);
      setEditing(false);
      onRoomUpdated?.(updated);
      toast.success('Group updated');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const uploadIcon = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !roomId) return;
    setSaving(true);
    try {
      const updated = await chatService.updateChatRoom(roomId, { icon: file });
      setRoom(updated);
      onRoomUpdated?.(updated);
      toast.success('Group icon updated');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to upload icon');
    } finally {
      setSaving(false);
    }
  };

  const openItem = (item) => {
    const sessionId = item.meta?.sessionId
      || (item.url && item.url.match(/session=(\d+)/)?.[1]);
    if (sessionId) {
      openSessionFromChat(navigate, sessionId, sessionService).then(onClose);
      return;
    }
    if (!item.url) return;
    if (item.url.startsWith('/')) {
      navigate(item.url);
      onClose();
    } else {
      window.open(item.url, '_blank', 'noreferrer');
    }
  };

  if (!open) return null;

  const items = media[mediaTab] || [];
  const displayTitle = mode === 'room' ? room?.title : buddy?.name;
  const canEdit = mode === 'room' && room?.canEdit;

  return (
    <div className="chat-info-overlay" onClick={onClose}>
      <div className="chat-info-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="chat-info-header">
          <h2>{tab === 'search' ? 'Search messages' : 'Chat info'}</h2>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close"><FiX /></button>
        </div>

        <div className="chat-info-tabs">
          <button type="button" className={tab === 'info' ? 'active' : ''} onClick={() => setTab('info')}>Info</button>
          <button type="button" className={tab === 'media' ? 'active' : ''} onClick={() => setTab('media')}>Media</button>
          <button type="button" className={tab === 'search' ? 'active' : ''} onClick={() => setTab('search')}>Search</button>
        </div>

        <div className="chat-info-body">
          {loading ? (
            <p className="text-muted chat-loading">Loading…</p>
          ) : tab === 'info' && (
            <div className="chat-info-section">
              <div className="chat-info-hero">
                {mode === 'room' ? (
                  <div className="chat-info-icon-wrap">
                    {room?.iconUrl ? (
                      <img src={room.iconUrl} alt="" className="chat-info-icon-img" />
                    ) : (
                      <div className="group-chat-avatar chat-info-icon-fallback"><FiUsers /></div>
                    )}
                    {canEdit && (
                      <>
                        <input ref={iconInputRef} type="file" hidden accept="image/*" onChange={uploadIcon} />
                        <button type="button" className="chat-info-icon-edit" onClick={() => iconInputRef.current?.click()} aria-label="Change icon">
                          <FiCamera />
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <UserAvatar user={buddy} name={buddy?.name} size={72} />
                )}
                {!editing ? (
                  <>
                    <h3 className="chat-info-title">{displayTitle}</h3>
                    {mode === 'room' && room?.subject && (
                      <p className="text-muted">{room.subject}{room.sessionTitle ? ` · ${room.sessionTitle}` : ''}</p>
                    )}
                    {mode === 'room' && room?.description && (
                      <p className="chat-info-description">{room.description}</p>
                    )}
                    {canEdit && (
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditing(true)}>
                        <FiEdit2 /> Edit name & description
                      </button>
                    )}
                  </>
                ) : (
                  <div className="chat-info-edit-form">
                    <label>Group name</label>
                    <input className="input-field" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                    <label>Description</label>
                    <textarea className="input-field" rows={3} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="What is this group for?" />
                    <div className="chat-info-edit-actions">
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditing(false)}>Cancel</button>
                      <button type="button" className="btn btn-primary btn-sm" disabled={saving} onClick={saveRoom}>
                        <FiSave /> {saving ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {mode === 'room' && room?.members?.length > 0 && (
                <div className="chat-info-members">
                  <h4>{room.members.length} members</h4>
                  <ul>
                    {room.members.map((m) => (
                      <li key={m.id}>{m.name}</li>
                    ))}
                  </ul>
                </div>
              )}

              {mode === 'room' && room?.sessionId && (
                <button type="button" className="btn btn-outline btn-sm" onClick={() => {
                  openSessionFromChat(navigate, room.sessionId, sessionService).then(onClose);
                }}>
                  View study session
                </button>
              )}

              {!canEdit && mode === 'room' && (
                <p className="text-muted chat-info-hint">Only the session organizer can edit the group name, icon, and description.</p>
              )}
            </div>
          )}

          {tab === 'media' && (
            <div className="chat-info-section">
              <div className="chat-media-tabs">
                {MEDIA_TABS.map(({ id, label, icon: Icon }) => (
                  <button key={id} type="button" className={mediaTab === id ? 'active' : ''} onClick={() => setMediaTab(id)}>
                    <Icon /> {label} ({media[id]?.length || 0})
                  </button>
                ))}
              </div>
              {items.length === 0 ? (
                <p className="text-muted chat-info-empty">No {mediaTab} shared yet. Send photos, PDFs, or session links in the chat.</p>
              ) : mediaTab === 'media' ? (
                <div className="chat-media-grid">
                  {items.map((item) => (
                    <button key={item.id} type="button" className="chat-media-thumb" onClick={() => openItem(item)}>
                      <img src={item.url} alt={item.fileName || item.title} />
                    </button>
                  ))}
                </div>
              ) : (
                <ul className="chat-media-list">
                  {items.map((item) => (
                    <li key={item.id}>
                      <button type="button" onClick={() => openItem(item)}>
                        <strong>{item.fileName || item.title}</strong>
                        <span className="text-muted">{item.senderName} · {new Date(item.timestamp).toLocaleDateString()}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {tab === 'search' && (
            <div className="chat-info-section">
              <div className="chat-search-row">
                <input
                  className="input-field"
                  placeholder="Search messages…"
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && runSearch()}
                />
                <button type="button" className="btn btn-primary btn-sm" onClick={runSearch}><FiSearch /></button>
              </div>
              {searchResults && (
                searchResults.length === 0 ? (
                  <p className="text-muted">No messages found.</p>
                ) : (
                  <ul className="chat-search-results">
                    {searchResults.map((msg) => (
                      <li key={msg.id}>
                        <span className="text-muted">{msg.senderName || (msg.sender === 'me' ? 'You' : 'Buddy')}</span>
                        <p>{msg.content}</p>
                      </li>
                    ))}
                  </ul>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatInfoDrawer;
