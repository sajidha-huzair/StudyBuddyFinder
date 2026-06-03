import React from 'react';
import { FiCheckCircle } from 'react-icons/fi';

const VerifiedBadge = ({ show, title = 'Verified student' }) => {
  if (!show) return null;
  return (
    <span className="verified-badge" title={title}>
      <FiCheckCircle /> Verified
    </span>
  );
};

export default VerifiedBadge;
