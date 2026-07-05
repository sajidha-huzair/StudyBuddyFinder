import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUsers } from 'react-icons/fi';
import UserAvatar from '../common/UserAvatar';

const ChatSidebar = ({
  buddies = [],
  sessionRooms = [],
  blockedUsers = [],
  activeBuddyId = null,
  activeRoomId = null,
  onSelectBuddy,
}) => {
  const navigate = useNavigate();

  const selectRoom = (room) => {
    navigate(`/chat/room/${room.id}`);
  };

  const selectBuddy = (buddy) => {
    if (onSelectBuddy) {
      onSelectBuddy(buddy);
    } else {
      navigate(`/chat/${buddy.id}`);
    }
  };

  return (
    <div className="chat-sidebar card">
      <div className="chat-sidebar-header">
        <h3>Messages</h3>
        <p className="text-muted">Chat with your study buddies</p>
      </div>
      <div className="buddy-list">
        {sessionRooms.length > 0 && (
          <>
            <p className="text-muted blocked-list-label">SESSION GROUP CHATS</p>
              {sessionRooms.map((room) => (
              <div
                key={`room-${room.id}`}
                className={`buddy-item session-room-item ${String(activeRoomId) === String(room.id) ? 'active' : ''}`}
                onClick={() => selectRoom(room)}
              >
                {room.iconUrl ? (
                  <img src={room.iconUrl} alt="" className="chat-list-icon" />
                ) : (
                  <div className="buddy-avatar group-chat-avatar"><FiUsers /></div>
                )}
                <div className="buddy-info">
                  <span className="chat-list-name" title={room.title}>{room.title}</span>
                  <p className="last-message">{room.lastMessage}</p>
                </div>
              </div>
            ))}
          </>
        )}
        {buddies.length > 0 && (
          <>
            {sessionRooms.length > 0 && (
              <p className="text-muted blocked-list-label">STUDY BUDDIES</p>
            )}
            {buddies.map((buddy) => (
              <div
                key={buddy.id}
                className={`buddy-item ${String(activeBuddyId) === String(buddy.id) ? 'active' : ''}`}
                onClick={() => selectBuddy(buddy)}
              >
                <UserAvatar user={buddy} name={buddy.name} size={36} />
                <div className="buddy-info">
                  <span className="chat-list-name" title={buddy.name}>{buddy.name}</span>
                  <p className="last-message">{buddy.lastMessage}</p>
                </div>
                {buddy.unreadCount > 0 && (
                  <span className="badge badge-primary">{buddy.unreadCount}</span>
                )}
              </div>
            ))}
          </>
        )}
        {blockedUsers.length > 0 && (
          <>
            <p className="text-muted blocked-list-label">BLOCKED</p>
            {blockedUsers.map((buddy) => (
              <div
                key={`blocked-${buddy.id}`}
                className={`buddy-item blocked ${String(activeBuddyId) === String(buddy.id) ? 'active' : ''}`}
                onClick={() => selectBuddy(buddy)}
              >
                <UserAvatar user={buddy} name={buddy.name} size={36} />
                <div className="buddy-info">
                  <span className="chat-list-name" title={buddy.name}>{buddy.name}</span>
                  <p className="last-message">Blocked</p>
                </div>
              </div>
            ))}
          </>
        )}
        {buddies.length === 0 && blockedUsers.length === 0 && sessionRooms.length === 0 && (
          <p className="empty-state chat-sidebar-empty">Accept a study buddy request to start chatting.</p>
        )}
      </div>
    </div>
  );
};

export default ChatSidebar;
