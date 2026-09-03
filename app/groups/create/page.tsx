'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { fetchWithRetry } from '@/lib/apiClient';

interface User {
  _id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
}

export default function CreateGroup() {
  const { currentUser, loading } = useAuth() as any;
  const router = useRouter();

  const [groupName, setGroupName] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [fetching, setFetching] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Protect route - Any logged in user can access
  useEffect(() => {
    if (!loading && !currentUser) {
      router.push('/login');
    }
  }, [currentUser, loading, router]);

  // Load all users
  const loadUsers = async (query = '') => {
    try {
      const res = await fetchWithRetry(`/api/users?search=${encodeURIComponent(query)}`);
      if (!res.ok) {
        throw new Error('Failed to load members directory');
      }
      const data = await res.json();
      // Exclude current user from the list since they are automatically included as the leader
      const filtered = data.filter((u: User) => u._id !== currentUser?._id);
      setUsers(filtered);
    } catch (err: any) {
      setError(err.message || 'Error fetching members');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadUsers();
    }
  }, [currentUser]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    loadUsers(value);
  };

  const handleToggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      setError('Group name is required');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      // Creator is automatically the leader/Group Admin
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: groupName,
          memberIds: selectedUserIds,
          leaderId: currentUser?._id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create group');
      }

      router.push(`/groups/${data._id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create group');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !currentUser) {
    return (
      <div className="loading-screen">
        <p className="loading-text">Loading details...</p>
      </div>
    );
  }

  return (
    <div className="page-container-sm">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-white">Create a New Mess Group</h1>
        <p className="text-zinc-400 mt-1">
          Form a mess group, select members. You will automatically become the **Group Admin** of this group.
        </p>
      </header>

      {error && (
        <div className="p-4 mb-6 bg-red-950/50 border border-red-800 text-red-400 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="glass-panel flex flex-col gap-6">
        <div className="form-group">
          <label className="form-label font-bold text-white">Group Name</label>
          <input
            type="text"
            className="form-control"
            placeholder="e.g. Friends Mess, Lake View Apartment"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="form-label font-bold text-white mb-2">Select Members</label>
          <p className="text-sm text-zinc-400 mb-4">
            Search for registered users and select them to add to this group. You will automatically be added as the Group Admin.
          </p>

          <div className="mb-4">
            <input
              type="text"
              className="form-control"
              placeholder="Search by name, email, or 6-digit ID..."
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>

          <div className="max-h-60 overflow-y-auto border border-zinc-800 rounded-lg bg-zinc-950 p-2 flex flex-col gap-1">
            {fetching ? (
              <div className="text-center py-8 text-zinc-500">Searching members...</div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">
                {searchQuery ? 'No members match search query' : 'No other users registered in the system'}
              </div>
            ) : (
              users.map((user) => {
                const isSelected = selectedUserIds.includes(user._id);
                return (
                  <div
                    key={user._id}
                    onClick={() => handleToggleUser(user._id)}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-purple-950/40 border border-purple-500/30'
                        : 'hover:bg-zinc-900 border border-transparent'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="font-semibold text-white">
                        {user.name}
                      </span>
                      <span className="text-xs text-zinc-400">
                        {user.email} • ID: <span className="font-mono text-zinc-300">{user.userId}</span>
                      </span>
                    </div>
                    <div
                      className={`h-5 w-5 rounded border flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'bg-purple-600 border-purple-500 text-white'
                          : 'border-zinc-700 bg-transparent'
                      }`}
                    >
                      {isSelected && (
                        <svg
                          className="h-3 w-3 fill-current"
                          viewBox="0 0 20 20"
                        >
                          <path d="M0 11l2-2 5 5L18 3l2 2L7 18z" />
                        </svg>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="border-t border-zinc-800 pt-4 flex gap-4">
          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary flex-1 py-3"
          >
            {submitting ? 'Creating Group...' : 'Create Mess Group'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="btn btn-secondary py-3 px-6"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
