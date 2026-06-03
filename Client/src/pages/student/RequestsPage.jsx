import React, { useState, useEffect } from 'react';
import { FiCheck, FiX, FiClock } from 'react-icons/fi';
import matchService from '../../services/matchService';
import { toast } from 'react-toastify';

const RequestsPage = () => {
  const [activeTab, setActiveTab] = useState('incoming');
  const [incoming, setIncoming] = useState([]);
  const [sent, setSent] = useState([]);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const [incomingData, sentData] = await Promise.all([
        matchService.getIncomingRequests(),
        matchService.getSentRequests()
      ]);
      setIncoming(incomingData);
      setSent(sentData);
    } catch (error) {
      toast.error('Failed to load requests');
    }
  };

  const handleAccept = async (requestId) => {
    try {
      await matchService.acceptRequest(requestId);
      toast.success('Request accepted!');
      loadRequests();
    } catch (error) {
      toast.error('Failed to accept request');
    }
  };

  const handleReject = async (requestId) => {
    try {
      await matchService.rejectRequest(requestId);
      toast.info('Request rejected');
      loadRequests();
    } catch (error) {
      toast.error('Failed to reject request');
    }
  };

  const handleCancel = async (requestId) => {
    if (!window.confirm('Cancel this sent request?')) return;
    try {
      await matchService.cancelRequest(requestId);
      toast.success('Request cancelled');
      loadRequests();
    } catch {
      toast.error('Failed to cancel request');
    }
  };

  return (
    <div className="requests-page">
      <h1>Study Buddy Requests</h1>
      
      <div className="tabs">
        <button className={`tab ${activeTab === 'incoming' ? 'active' : ''}`} onClick={() => setActiveTab('incoming')}>
          Incoming ({incoming.length})
        </button>
        <button className={`tab ${activeTab === 'sent' ? 'active' : ''}`} onClick={() => setActiveTab('sent')}>
          Sent ({sent.length})
        </button>
      </div>

      <div className="request-list">
        {activeTab === 'incoming' ? (
          incoming.length === 0 ? (
            <div className="empty-state"><p>No incoming requests</p></div>
          ) : (
            incoming.map(req => (
              <div key={req.id} className="request-card card">
                <div className="request-info">
                  <div className="user-avatar">{req.sender.name.charAt(0)}</div>
                  <div>
                    <h3>{req.sender.name}</h3>
                    <p>{req.message}</p>
                  </div>
                </div>
                <div className="request-actions">
                  <button onClick={() => handleAccept(req.id)} className="btn btn-primary btn-sm">
                    <FiCheck /> Accept
                  </button>
                  <button onClick={() => handleReject(req.id)} className="btn btn-outline btn-sm">
                    <FiX /> Decline
                  </button>
                </div>
              </div>
            ))
          )
        ) : (
          sent.length === 0 ? (
            <div className="empty-state"><p>No sent requests</p></div>
          ) : (
            sent.map(req => (
              <div key={req.id} className="request-card card">
                <div className="request-info">
                  <div className="user-avatar">{req.recipient.name.charAt(0)}</div>
                  <div>
                    <h3>{req.recipient.name}</h3>
                    <p>{req.message}</p>
                  </div>
                </div>
                <div className="request-actions">
                  <span className="badge badge-warning"><FiClock /> Pending</span>
                  <button onClick={() => handleCancel(req.id)} className="btn btn-outline btn-sm">
                    <FiX /> Cancel
                  </button>
                </div>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
};

export default RequestsPage;
