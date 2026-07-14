import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiSend, FiUsers, FiInfo, FiPaperclip } from 'react-icons/fi';
import chatService from '../../services/chatService';
import matchService from '../../services/matchService';
import blockService from '../../services/blockService';
import ChatMessage from '../../components/chat/ChatMessage';
import ChatSidebar from '../../components/chat/ChatSidebar';
import ChatInfoDrawer from '../../components/chat/ChatInfoDrawer';
import { toast } from 'react-toastify';

const GroupChatPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [buddies, setBuddies] = useState([]);
  const [sessionRooms, setSessionRooms] = useState([]);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const loadSidebar = useCallback(async () => {
    try {
      const [conversations, studyBuddies, rooms, blocked] = await Promise.all([
        chatService.getConversations().catch(() => []),
        matchService.getStudyBuddies().catch(() => []),
        chatService.getChatRooms().catch(() => []),
        blockService.getBlockedUsers().catch(() => []),
      ]);
      const conversationMap = new Map(conversations.map((c) => [c.id, c]));
      const merged = studyBuddies.map((buddy) => ({
        ...buddy,
        lastMessage: conversationMap.get(buddy.id)?.lastMessage || 'No messages yet',
        lastMessageTime: conversationMap.get(buddy.id)?.lastMessageTime,
        unreadCount: conversationMap.get(buddy.id)?.unreadCount || 0,
      }));
      merged.sort((a, b) => {
        const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
        const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
        return timeB - timeA;
      });
      setBuddies(merged);
      setSessionRooms(rooms);
      setBlockedUsers(blocked);
    } catch {
      void 0;
    }
  }, []);

  const loadRoom = useCallback(async () => {
    try {
      const detail = await chatService.getChatRoomDetail(roomId);
      setRoom(detail);
      const rooms = await chatService.getChatRooms();
      setSessionRooms(rooms);
    } catch {
      setRoom({ id: Number(roomId), title: 'Session group chat' });
    }
  }, [roomId]);

  const loadMessages = useCallback(async () => {
    try {
      const data = await chatService.getRoomMessages(roomId);
      setMessages(data);
    } catch (error) {
      if (error.response?.status === 404) {
        toast.error('Group chat not found');
        navigate('/chat');
      } else {
        toast.error('Failed to load messages');
      }
    } finally {
      setLoading(false);
    }
  }, [roomId, navigate]);

  useEffect(() => {
    setLoading(true);
    loadSidebar();
    loadRoom();
    loadMessages();
  }, [loadSidebar, loadRoom, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;
    setSending(true);
    try {
      const msg = await chatService.sendRoomMessage(roomId, newMessage.trim());
      setMessages((prev) => [...prev, { ...msg, sender: 'me' }]);
      setNewMessage('');
      loadSidebar();
    } catch {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || uploading) return;
    setUploading(true);
    try {
      const msg = await chatService.sendRoomFile(roomId, file);
      setMessages((prev) => [...prev, { ...msg, sender: 'me' }]);
      loadSidebar();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleRoomUpdated = (updated) => {
    setRoom(updated);
    loadSidebar();
  };

  return (
    <div className="chat-page show-conversation">
      <ChatSidebar
        buddies={buddies}
        sessionRooms={sessionRooms}
        blockedUsers={blockedUsers}
        activeRoomId={roomId}
      />

      <div className="chat-main card">
        {loading ? (
          <p className="text-muted chat-loading">Loading group chat…</p>
        ) : (
          <>
            <div className="chat-header flex-between">
              <button type="button" className="chat-header-profile chat-header-clickable" onClick={() => setShowInfo(true)}>
                {room?.iconUrl ? (
                  <img src={room.iconUrl} alt="" className="chat-header-icon" />
                ) : (
                  <div className="group-chat-avatar"><FiUsers /></div>
                )}
                <div className="chat-header-title-wrap">
                  <span className="chat-conversation-title" title={room?.title}>
                    {room?.title || 'Session group chat'}
                  </span>
                  <span className="chat-status">
                    {room?.memberCount ? `${room.memberCount} members` : 'Session group'}
                    {room?.subject ? ` · ${room.subject}` : ''}
                  </span>
                </div>
              </button>
              <button type="button" className="chat-menu-btn" onClick={() => setShowInfo(true)} aria-label="Group info">
                <FiInfo />
              </button>
            </div>

            <div className="chat-messages">
              {messages.map((msg, idx) => (
                <div key={msg.id || idx}>
                  {msg.messageType === 'SYSTEM' ? (
                    <div className="system-message text-muted">{msg.content}</div>
                  ) : (
                    <div>
                      {msg.sender !== 'me' && msg.senderName && (
                        <p className="chat-sender-label">{msg.senderName}</p>
                      )}
                      <ChatMessage msg={msg} />
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="chat-input">
              <div className="chat-input-row">
                <input ref={fileInputRef} type="file" hidden accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.txt" onChange={handleFileSelect} />
                <button type="button" className="btn btn-outline chat-attach-btn" onClick={() => fileInputRef.current?.click()} disabled={uploading} aria-label="Attach file">
                  <FiPaperclip />
                </button>
                <input
                  type="text"
                  placeholder="Message the group…"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  className="input-field"
                />
                <button type="button" onClick={sendMessage} className="btn btn-primary" disabled={sending || uploading}>
                  <FiSend />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <ChatInfoDrawer
        open={showInfo}
        onClose={() => setShowInfo(false)}
        mode="room"
        roomId={roomId}
        onRoomUpdated={handleRoomUpdated}
      />
    </div>
  );
};

export default GroupChatPage;
