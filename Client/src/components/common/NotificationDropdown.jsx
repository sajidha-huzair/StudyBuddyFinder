import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../contexts/NotificationContext';
import { formatDistanceToNow } from 'date-fns';
import { FiCheck, FiTrash2, FiX } from 'react-icons/fi';
import { resolveNotificationRoute } from '../../utils/notificationRoutes';
import './NotificationDropdown.css';

const NotificationDropdown = ({ onClose }) => {
  const navigate = useNavigate();
  const { notifications, markAsRead, markAllAsRead, deleteNotification } = useNotifications();

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    onClose();
    navigate(resolveNotificationRoute(notification));
  };

  return (
    <div className="notification-dropdown">
      <div className="notification-header">
        <h3>Notifications</h3>
        <div className="notification-actions">
          {notifications.some(n => !n.read) && (
            <button onClick={markAllAsRead} className="mark-all-btn">
              <FiCheck /> Mark all read
            </button>
          )}
          <button onClick={onClose} className="close-btn">
            <FiX />
          </button>
        </div>
      </div>

      <div className="notification-list">
        {notifications.length === 0 ? (
          <div className="no-notifications">
            <p>No notifications yet</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`notification-item ${!notification.read ? 'unread' : ''}`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="notification-content">
                <p className="notification-title">{notification.title}</p>
                <p className="notification-message">{notification.message}</p>
                <span className="notification-time">
                  {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                </span>
              </div>
              <button
                className="delete-notification-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteNotification(notification.id);
                }}
              >
                <FiTrash2 />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationDropdown;
