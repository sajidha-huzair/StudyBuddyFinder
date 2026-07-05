import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FiSend, FiSlash, FiAlertCircle, FiUserCheck, FiMoreVertical,
  FiCalendar, FiPaperclip, FiInfo,
} from 'react-icons/fi';
import matchService from '../../services/matchService';
import chatService from '../../services/chatService';
import blockService from '../../services/blockService';
import useChatSocket from '../../hooks/useChatSocket';
import ChatMessage from '../../components/chat/ChatMessage';
import ChatSidebar from '../../components/chat/ChatSidebar';
import ChatInfoDrawer from '../../components/chat/ChatInfoDrawer';
import UserAvatar from '../../components/common/UserAvatar';
import VerifiedBadge from '../../components/common/VerifiedBadge';
import CreateSessionModal from '../../components/sessions/CreateSessionModal';
import { CHAT_TEMPLATES } from '../../constants/messageTemplates';
import { toast } from 'react-toastify';

const ChatPage = () => {
  const { buddyId } = useParams();
  const navigate = useNavigate();
  const [buddies, setBuddies] = useState([]);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [blockedIds, setBlockedIds] = useState(new Set());
  const [selectedBuddy, setSelectedBuddy] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [blockedLoaded, setBlockedLoaded] = useState(false);
  const [buddyTyping, setBuddyTyping] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [sessionRooms, setSessionRooms] = useState([]);
  const [showInfo, setShowInfo] = useState(false);
  const messagesEndRef = useRef(null);
  const menuRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimerRef = useRef(null);

  const isBlocked = selectedBuddy && blockedIds.has(selectedBuddy.id);

  const loadBlocked = useCallback(async () => {
    try {
      const data = await blockService.getBlockedUsers();
      setBlockedUsers(data);
      setBlockedIds(new Set(data.map(u => u.id)));
    } catch {
      setBlockedUsers([]);
      setBlockedIds(new Set());
    } finally {
      setBlockedLoaded(true);
    }
  }, []);

  const loadBuddies = useCallback(async () => {
    try {
      const [conversations, studyBuddies, rooms] = await Promise.all([
        chatService.getConversations().catch(() => []),
        matchService.getStudyBuddies().catch(() => []),
        chatService.getChatRooms().catch(() => []),
      ]);
      setSessionRooms(rooms);
      const conversationMap = new Map(conversations.map(c => [c.id, c]));
      const merged = studyBuddies.map(buddy => ({
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
    } catch {
      toast.error('Failed to load conversations');
    }
  }, []);

  const handleRealtimeMessage = useCallback((message) => {
    if (!selectedBuddy) {
      loadBuddies();
      return;
    }
    const buddyId = Number(selectedBuddy.id);
    const senderId = Number(message.senderId);
    const recipientId = Number(message.recipientId);
    if (senderId !== buddyId && recipientId !== buddyId) {
      loadBuddies();
      return;
    }
    const sender = senderId === buddyId ? 'buddy' : 'me';
    setMessages(prev => {
      if (prev.some(m => m.id === message.id)) {
        return prev.map(m => (m.id === message.id ? { ...m, ...message, sender } : m));
      }
      return [...prev, { ...message, sender }];
    });
    loadBuddies();
  }, [selectedBuddy, loadBuddies]);

  const handleTyping = useCallback((data) => {
    if (selectedBuddy && Number(data.senderId) === Number(selectedBuddy.id)) {
      setBuddyTyping(data.isTyping);
    }
  }, [selectedBuddy]);

  const handleReadReceipt = useCallback((data) => {
    setMessages(prev => prev.map(m => (
      data.messageIds?.includes(m.id) ? { ...m, read: true, readAt: new Date().toISOString() } : m
    )));
  }, []);

  const { sendTyping } = useChatSocket({
    onMessage: handleRealtimeMessage,
    onTyping: handleTyping,
    onReadReceipt: handleReadReceipt,
  });

  useEffect(() => {
    loadBuddies();
    loadBlocked();
  }, [loadBuddies, loadBlocked]);

  useEffect(() => {
    if (buddyId && (buddies.length > 0 || blockedUsers.length > 0)) {
      const buddy = buddies.find(b => String(b.id) === String(buddyId))
        || blockedUsers.find(b => String(b.id) === String(buddyId));
      if (buddy) setSelectedBuddy({ ...buddy, name: buddy.name });
    }
  }, [buddyId, buddies, blockedUsers]);

  useEffect(() => {
    if (!selectedBuddy || isBlocked || !blockedLoaded) {
      if (!selectedBuddy || isBlocked) setMessages([]);
      return undefined;
    }
    loadMessages(selectedBuddy.id);
    return undefined;
  }, [selectedBuddy, isBlocked, blockedLoaded]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, buddyTyping]);

  useEffect(() => {
    setMenuOpen(false);
    setBuddyTyping(false);
  }, [selectedBuddy?.id]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const loadMessages = async (id) => {
    if (blockedIds.has(id)) return;
    try {
      const data = await chatService.getMessages(id);
      setMessages(data);
    } catch (error) {
      const message = error.response?.data?.error;
      if (error.response?.status === 403 && message === 'You cannot chat with this user') {
        setBlockedIds(prev => new Set([...prev, id]));
        setMessages([]);
      }
    }
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    if (!selectedBuddy) return;
    sendTyping(selectedBuddy.id, true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => sendTyping(selectedBuddy.id, false), 1500);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedBuddy || isBlocked) return;
    try {
      sendTyping(selectedBuddy.id, false);
      const msg = await chatService.sendMessage(selectedBuddy.id, newMessage.trim());
      setMessages(prev => [...prev, { ...msg, sender: 'me' }]);
      setNewMessage('');
      loadBuddies();
    } catch {
      toast.error('Failed to send message');
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !selectedBuddy || isBlocked) return;
    setUploading(true);
    try {
      const msg = await chatService.sendFile(selectedBuddy.id, file);
      setMessages(prev => [...prev, { ...msg, sender: 'me' }]);
      loadBuddies();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handlePin = async (messageId) => {
    try {
      const updated = await chatService.togglePin(messageId);
      setMessages(prev => prev.map(m => (m.id === messageId ? { ...m, ...updated, sender: m.sender } : m)));
    } catch {
      toast.error('Could not pin message');
    }
  };

  const handleSessionPlanned = async () => {
    if (!selectedBuddy) return;
    await loadMessages(selectedBuddy.id);
    loadBuddies();
  };

  const handleBlockToggle = async () => {
    if (!selectedBuddy) return;
    setMenuOpen(false);
    if (isBlocked) {
      try {
        await blockService.unblockUser(selectedBuddy.id);
        toast.success(`${selectedBuddy.name} unblocked`);
        await loadBlocked();
        await loadBuddies();
      } catch {
        toast.error('Failed to unblock user');
      }
      return;
    }
    if (!window.confirm(`Block ${selectedBuddy.name}? You won't be able to message each other.`)) return;
    try {
      await blockService.blockUser(selectedBuddy.id);
      toast.success('User blocked');
      setMessages([]);
      await loadBlocked();
      await loadBuddies();
    } catch {
      toast.error('Failed to block user');
    }
  };

  const selectBuddy = (buddy) => {
    setSelectedBuddy(buddy);
    navigate(`/chat/${buddy.id}`);
  };

  const handleReport = () => {
    setMenuOpen(false);
    navigate(`/report?userId=${selectedBuddy.id}&name=${encodeURIComponent(selectedBuddy.name)}`);
  };

  const pinnedMessages = messages.filter(m => m.isPinned);
  const regularMessages = messages.filter(m => !m.isPinned);
  const buddyIsVerified = selectedBuddy?.isVerified ?? selectedBuddy?.is_verified;

  return (
    <div className={`chat-page ${buddyId || selectedBuddy ? 'show-conversation' : ''}`}>
      <ChatSidebar
        buddies={buddies}
        sessionRooms={sessionRooms}
        blockedUsers={blockedUsers}
        activeBuddyId={selectedBuddy?.id}
        onSelectBuddy={selectBuddy}
      />

      <div className="chat-main card">
        {selectedBuddy ? (
          <>
            <div className="chat-header flex-between">
              <button type="button" className="chat-header-profile chat-header-clickable" onClick={() => setShowInfo(true)}>
                <UserAvatar user={selectedBuddy} name={selectedBuddy.name} size={36} />
                <div className="chat-header-title-wrap">
                  <span className="chat-conversation-title">
                    {selectedBuddy.name}
                    <VerifiedBadge show={buddyIsVerified} />
                  </span>
                  <span className="chat-status">
                    {isBlocked ? 'Blocked' : buddyTyping ? 'Typing…' : 'Study buddy'}
                  </span>
                </div>
              </button>
              <div className="chat-header-right">
                <div className="chat-header-actions">
                  {!isBlocked && (
                    <button type="button" className="btn btn-outline btn-sm chat-schedule-btn" onClick={() => setShowPlanModal(true)}>
                      <FiCalendar /> Plan session
                    </button>
                  )}
                  <button type="button" className="chat-menu-btn" onClick={() => setShowInfo(true)} aria-label="Chat info">
                    <FiInfo />
                  </button>
                </div>
                <div className="chat-menu-wrapper" ref={menuRef}>
                  <button type="button" className="chat-menu-btn" onClick={() => setMenuOpen(!menuOpen)} aria-label="Chat options" aria-expanded={menuOpen}>
                    <FiMoreVertical />
                  </button>
                  {menuOpen && (
                    <div className="chat-dropdown-menu">
                      {!isBlocked && (
                        <button type="button" onClick={handleReport}>
                          <FiAlertCircle /> Report user
                        </button>
                      )}
                      <button type="button" className={isBlocked ? 'menu-positive' : 'menu-danger'} onClick={handleBlockToggle}>
                        {isBlocked ? <><FiUserCheck /> Unblock user</> : <><FiSlash /> Block user</>}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {isBlocked ? (
              <div className="blocked-notice">
                <FiSlash size={20} />
                <p>You blocked this user. Open the menu above to unblock and message again.</p>
              </div>
            ) : (
              <>
                <div className="chat-messages">
                  {pinnedMessages.length > 0 && (
                    <div className="pinned-messages">
                      {pinnedMessages.map((msg, idx) => (
                        <ChatMessage key={msg.id || `pin-${idx}`} msg={msg} onPin={handlePin} />
                      ))}
                    </div>
                  )}
                  {regularMessages.map((msg, idx) => (
                    <ChatMessage key={msg.id || idx} msg={msg} onPin={handlePin} />
                  ))}
                  {buddyTyping && <div className="typing-indicator">Typing…</div>}
                  <div ref={messagesEndRef} />
                </div>
                <div className="chat-input">
                  <div className="chat-templates">
                    {CHAT_TEMPLATES.map((tpl) => (
                      <button key={tpl} type="button" className="template-chip" onClick={() => setNewMessage(tpl)}>
                        {tpl.length > 36 ? `${tpl.slice(0, 36)}…` : tpl}
                      </button>
                    ))}
                  </div>
                  <div className="chat-input-row">
                    <input ref={fileInputRef} type="file" hidden accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.txt" onChange={handleFileSelect} />
                    <button type="button" className="btn btn-outline chat-attach-btn" onClick={() => fileInputRef.current?.click()} disabled={uploading} aria-label="Attach file">
                      <FiPaperclip />
                    </button>
                    <input
                      type="text"
                      placeholder={`Message ${selectedBuddy.name.split(' ')[0]}...`}
                      value={newMessage}
                      onChange={handleInputChange}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      className="input-field"
                    />
                    <button type="button" onClick={sendMessage} className="btn btn-primary" disabled={uploading}>
                      <FiSend />
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="empty-chat">
            <div className="empty-chat-icon">💬</div>
            <h3>Your conversations</h3>
            <p>Select a study buddy from the list to start chatting</p>
          </div>
        )}
      </div>

      <CreateSessionModal
        open={showPlanModal && Boolean(selectedBuddy)}
        onClose={() => setShowPlanModal(false)}
        onCreated={handleSessionPlanned}
        initialBuddyIds={selectedBuddy ? [selectedBuddy.id] : []}
        title="Plan session"
      />

      <ChatInfoDrawer
        open={showInfo && Boolean(selectedBuddy)}
        onClose={() => setShowInfo(false)}
        mode="buddy"
        buddy={selectedBuddy}
      />
    </div>
  );
};

export default ChatPage;
