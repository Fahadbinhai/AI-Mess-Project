'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';

export default function AdminPanel() {
  const { currentUser, loading, refreshUser } = useAuth() as any;
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actioningId, setActioningId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) {
      if (!currentUser) router.push('/login');
      else if (currentUser.role !== 'admin') router.push('/dashboard');
    }
  }, [currentUser, loading, router]);

  const loadUsers = async (query = '') => {
    setFetching(true);
    try {
      const res = await fetch(`/api/users?search=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Error loading users');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (currentUser && currentUser.role === 'admin') loadUsers();
  }, [currentUser]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadUsers(searchQuery);
  };

  const handlePromote = async (targetUser: any) => {
    if (!confirm(`Promote "${targetUser.name}" to Admin? This grants full access.`)) return;
    setActioningId(targetUser._id);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: targetUser._id, role: 'admin' }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to promote user');
      }
      setSuccess(`${targetUser.name} has been promoted to Admin.`);
      await loadUsers(searchQuery);
      if (targetUser._id === currentUser._id) await refreshUser();
    } catch (err: any) {
      setError(err.message || 'Promotion failed');
    } finally {
      setActioningId(null);
    }
  };

  const handleDemote = async (targetUser: any) => {
    if (targetUser._id === currentUser._id) {
      alert("You cannot demote yourself.");
      return;
    }
    if (!confirm(`Remove Admin role from "${targetUser.name}"? They will become a regular user.`)) return;
    setActioningId(targetUser._id);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: targetUser._id, role: 'user' }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to demote user');
      }
      setSuccess(`${targetUser.name} has been demoted to User.`);
      await loadUsers(searchQuery);
    } catch (err: any) {
      setError(err.message || 'Demotion failed');
    } finally {
      setActioningId(null);
    }
  };

  if (loading || !currentUser || currentUser.role !== 'admin') {
    return <div className="loading-screen"><p className="loading-text">Verifying admin credentials...</p></div>;
  }

  const admins = users.filter(u => u.role === 'admin');
  const regularUsers = users.filter(u => u.role === 'user');

  return (
    <div className="page-container-md">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-text">
          <h1>Admin Control Panel</h1>
          <p className="mt-1">Manage user roles across the Mess Management System.</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <div className="glass-panel py-2 px-4 flex flex-col items-center" style={{ padding: '0.5rem 1.25rem' }}>
            <span className="text-xl font-black text-white">{users.length}</span>
            <span className="text-xs text-zinc-400">Total Users</span>
          </div>
          <div className="glass-panel py-2 px-4 flex flex-col items-center" style={{ padding: '0.5rem 1.25rem', borderColor: 'rgba(239,68,68,0.25)' }}>
            <span className="text-xl font-black text-red-400">{admins.length}</span>
            <span className="text-xs text-zinc-400">Admins</span>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Search */}
      <div className="glass-panel mb-6">
        <form onSubmit={handleSearch} className="search-row">
          <input
            type="text"
            className="form-control"
            placeholder="Search by Name, Email, or 6-digit User ID..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="btn btn-primary">Search</button>
          {searchQuery && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => { setSearchQuery(''); loadUsers(''); }}
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Users Table */}
      <div className="glass-panel">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-base font-bold text-white">
            All Users
            {searchQuery && <span className="ml-2 text-sm font-normal text-zinc-400">— results for "{searchQuery}"</span>}
          </h2>
          <span className="text-xs text-zinc-500">{users.length} found</span>
        </div>

        <div className="table-container" style={{ marginTop: 0 }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>6-Digit ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {fetching ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-zinc-500">Loading users...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-zinc-500">No users found matching your search.</td>
                </tr>
              ) : (
                users.map(user => (
                  <tr key={user._id}>
                    <td>
                      <span className="font-mono text-purple-300 font-bold">{user.userId}</span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="member-avatar" style={{ height: '28px', width: '28px', fontSize: '0.75rem' }}>
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-white">
                          {user.name}
                          {user._id === currentUser._id && (
                            <span className="ml-1 text-xs text-purple-400 font-normal">(You)</span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="text-zinc-400 text-sm">{user.email}</td>
                    <td>
                      <span className={`badge ${user.role === 'admin' ? 'badge-admin' : 'badge-user'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      {user.role === 'user' ? (
                        <button
                          onClick={() => handlePromote(user)}
                          disabled={actioningId === user._id}
                          className="btn btn-primary btn-sm"
                        >
                          {actioningId === user._id ? 'Promoting...' : '↑ Promote to Admin'}
                        </button>
                      ) : user._id !== currentUser._id ? (
                        <button
                          onClick={() => handleDemote(user)}
                          disabled={actioningId === user._id}
                          className="btn btn-danger btn-sm"
                        >
                          {actioningId === user._id ? 'Demoting...' : '↓ Demote to User'}
                        </button>
                      ) : (
                        <span className="text-xs text-zinc-500 italic">You (Admin)</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
