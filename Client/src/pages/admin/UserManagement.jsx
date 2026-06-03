import React, { useState, useEffect } from 'react';
import { FiSearch, FiTrash2, FiUserX } from 'react-icons/fi';
import adminService from '../../services/adminService';
import { toast } from 'react-toastify';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async (search = searchTerm) => {
    try {
      const data = await adminService.getUsers(search);
      setUsers(data);
    } catch (error) {
      toast.error('Failed to load users');
    }
  };

  const handleToggle = async (userId) => {
    try {
      await adminService.toggleUserStatus(userId);
      toast.success('User status updated');
      loadUsers();
    } catch (error) {
      toast.error('Failed to update user');
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Delete this user permanently?')) return;
    try {
      await adminService.deleteUser(userId);
      toast.success('User deleted');
      loadUsers();
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  return (
    <div className="user-management">
      <h1>User Management</h1>
      <p>Manage and monitor all platform users</p>

      <div className="search-bar card">
        <FiSearch />
        <input
          type="text"
          placeholder="Search users by name or email..."
          className="input-field"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && loadUsers(searchTerm)}
        />
      </div>

      <div className="users-table card">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Sessions</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>
                  <span className={`badge ${user.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                    {user.status}
                  </span>
                </td>
                <td>{user.sessions}</td>
                <td>
                  <div className="action-buttons">
                    <button className="icon-btn" title="Ban/Activate" onClick={() => handleToggle(user.id)}>
                      <FiUserX />
                    </button>
                    <button className="icon-btn danger" title="Delete" onClick={() => handleDelete(user.id)}>
                      <FiTrash2 />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserManagement;
