import React from 'react';

const UserAvatar = ({ user, name, size = 40, className = '' }) => {
  const displayName = name || user?.name || user?.full_name || user?.username || '?';
  const avatarUrl = user?.avatarUrl || user?.avatar;
  const sizeStyle = { width: size, height: size, fontSize: Math.max(12, size * 0.38) };

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={displayName}
        className={`user-avatar user-avatar-img ${className}`}
        style={sizeStyle}
      />
    );
  }

  return (
    <div className={`user-avatar ${className}`} style={sizeStyle}>
      {displayName.charAt(0).toUpperCase()}
    </div>
  );
};

export default UserAvatar;
