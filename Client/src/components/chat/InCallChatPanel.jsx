import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FiSend, FiPaperclip } from 'react-icons/fi';
import chatService from '../../services/chatService';
import useChatSocket from '../../hooks/useChatSocket';
import ChatMessage from './ChatMessage';
import UserAvatar from '../common/UserAvatar';
import { toast } from 'react-toastify';

const InCallChatPanel = ({ buddy }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [buddyTyping, setBuddyTyping] = useState(false);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimerRef = useRef(null);

  const loadMessages = useCallback(async () => {
    if (!buddy?.id) return;
    try {
      const data = await chatService.getMessages(buddy.id);
      setMessages(data);
    } catch {
      setMessages([]);
    }
  }, [buddy?.id]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const handleRealtimeMessage = useCallback((message) => {
    if (!buddy?.id) return;
    const buddyId = Number(buddy.id);
    const senderId = Number(message.senderId);
    const recipientId = Number(message.recipientId);
    if (senderId !== buddyId && recipientId !== buddyId) return;

    const sender = senderId === buddyId ? 'buddy' : 'me';
    setMessages(prev => {
      if (prev.some(m => m.id === message.id)) {
        return prev.map(m => (m.id === message.id ? { ...m, ...message, sender } : m));
      }
      return [...prev, { ...message, sender }];
    });
  }, [buddy]);

  const handleTyping = useCallback((data) => {
    if (buddy && Number(data.senderId) === Number(buddy.id)) {
      setBuddyTyping(data.isTyping);
    }
  }, [buddy]);

  const { sendTyping } = useChatSocket({
    onMessage: handleRealtimeMessage,
    onTyping: handleTyping,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, buddyTyping]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !buddy?.id) return;
    try {
      sendTyping(buddy.id, false);
      const msg = await chatService.sendMessage(buddy.id, newMessage.trim());
      setMessages(prev => [...prev, { ...msg, sender: 'me' }]);
      setNewMessage('');
    } catch {
      toast.error('Failed to send message');
    }
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    if (!buddy?.id) return;
    sendTyping(buddy.id, true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => sendTyping(buddy.id, false), 1500);
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !buddy?.id) return;
    setUploading(true);
    try {
      const msg = await chatService.sendFile(buddy.id, file);
      setMessages(prev => [...prev, { ...msg, sender: 'me' }]);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  if (!buddy) {
    return (
      <div className="incall-chat-panel">
        <p className="text-muted incall-chat-empty">No study buddy linked to this session.</p>
      </div>
    );
  }

  return (
    <div className="incall-chat-panel">
      <div className="incall-chat-header">
        <UserAvatar user={buddy} name={buddy.name} size={32} />
        <div>
          <strong>{buddy.name}</strong>
          <span className="incall-chat-status">{buddyTyping ? 'Typing…' : 'Messages save to your chat history'}</span>
        </div>
      </div>

      <div className="incall-chat-messages">
        {messages.length === 0 ? (
          <p className="text-muted incall-chat-empty">Say hi — this thread stays in Messages after the call.</p>
        ) : (
          messages.map((msg, idx) => (
            <ChatMessage key={msg.id || idx} msg={msg} />
          ))
        )}
        {buddyTyping && <div className="typing-indicator">Typing…</div>}
        <div ref={messagesEndRef} />
      </div>

      <div className="incall-chat-input">
        <input
          ref={fileInputRef}
          type="file"
          hidden
          accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.txt"
          onChange={handleFileSelect}
        />
        <button
          type="button"
          className="btn btn-outline chat-attach-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          aria-label="Attach file"
        >
          <FiPaperclip />
        </button>
        <input
          type="text"
          className="input-field"
          placeholder="Message…"
          value={newMessage}
          onChange={handleInputChange}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button type="button" className="btn btn-primary" onClick={sendMessage} disabled={uploading || !newMessage.trim()}>
          <FiSend />
        </button>
      </div>
    </div>
  );
};

export default InCallChatPanel;
