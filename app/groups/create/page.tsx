'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { fetchWithRetry } from '@/lib/apiClient';
import LoadingSpinner from '@/components/LoadingSpinner';

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

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  if (loading || !currentUser) {
    return <LoadingSpinner message="Loading group details..." />;
  }

  return (
    <div className="page-container-sm px-4 sm:px-6 py-6 sm:py-10 max-w-2xl mx-auto">
      {/* Header section with icon badge */}
      <div className="mb-6 sm:mb-8 text-left">
        <div style={{ padding: "5px 10px" }} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-400 text-xs font-semibold mb-3">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Mess Group Management
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Create a New Mess Group
        </h1>
        <p className="text-zinc-400 text-sm sm:text-base mt-1.5 leading-relaxed">
          Form a mess group and select members. You will automatically become the <span className="text-purple-400 font-semibold">Group Admin</span>.
        </p>
      </div>

      {error && (
        <div className="p-4 mb-6 bg-red-950/60 border border-red-800/80 text-red-300 rounded-xl text-sm flex items-center gap-3">
          <svg className="w-5 h-5 shrink-0 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Main Glass Form Container */}
      <form onSubmit={handleSubmit} className="glass-panel p-5 sm:p-7 rounded-2xl flex flex-col gap-6 sm:gap-7 shadow-2xl border border-purple-500/20 bg-zinc-900/80 backdrop-blur-xl">

        {/* Group Name input box */}
        <div className="flex flex-col gap-2">
          <label className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <span>Group Name</span>
            <span className="text-purple-400 text-xs font-normal">*Required</span>
          </label>
          <input
            type="text"
            className="form-control w-full px-4 py-3 rounded-xl border border-zinc-700/60 bg-zinc-950/90 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all text-sm sm:text-base"
            placeholder="e.g. Friends Mess, Lake View Apartment"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            required
          />
        </div>

        {/* Select Members Section */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <label className="text-sm sm:text-base font-bold text-white">Select Members</label>
            <span style={{ padding: "5px 10px" }} className="px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-950/60 border border-purple-500/30 text-purple-300">
              {selectedUserIds.length} {selectedUserIds.length === 1 ? 'member' : 'members'} selected
            </span>
          </div>

          <p className="text-xs sm:text-sm text-zinc-400 leading-normal">
            Search for registered users and select them to add to this group. You will automatically be added as the Group Admin.
          </p>

          {/* Search Box with Search Icon */}
          <div className="relative mt-2 mb-3">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-purple-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              style={{ paddingLeft: '3.5rem', paddingRight: '1.25rem' }}
              className="form-control w-full py-3.5 rounded-xl border border-zinc-700/70 bg-zinc-950/90 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all text-sm shadow-inner"
              placeholder="Search by name, email, or 6-digit ID..."
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>

          {/* Member Selection List Container */}
          <div
            style={{ padding: '15px' }}
            className="max-h-72 overflow-y-auto border border-zinc-800/90 rounded-2xl bg-zinc-950/90 flex flex-col gap-3 scrollbar-thin scrollbar-thumb-purple-500/30"
          >
            {fetching ? (
              <div className="text-center py-10 text-zinc-400 text-sm flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                Searching members...
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-10 text-zinc-500 text-sm">
                {searchQuery ? 'No members match search query' : 'No other users registered in the system'}
              </div>
            ) : (
              users.map((user) => {
                const isSelected = selectedUserIds.includes(user._id);
                return (
                  <div
                    key={user._id}
                    onClick={() => handleToggleUser(user._id)}
                    style={{ padding: '10px' }}
                    className={`relative flex items-center justify-between rounded-xl cursor-pointer transition-all duration-200 border my-0.5 ${isSelected
                      ? 'bg-purple-950/50 border-purple-500/60 shadow-[0_0_16px_rgba(139,92,246,0.2)] scale-[1.01]'
                      : 'bg-zinc-900/80 hover:bg-zinc-800/90 border-zinc-800 hover:border-zinc-700'
                      }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 py-0.5 pr-8 sm:pr-0">
                      {/* Avatar initials icon */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold shrink-0 transition-colors shadow-sm ${isSelected
                        ? 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white ring-2 ring-purple-400/40'
                        : 'bg-zinc-800 text-zinc-300 border border-zinc-700/60'
                        }`}>
                        {getInitials(user.name)}
                      </div>

                      <div className="flex flex-col min-w-0 gap-1">
                        <span className="font-bold text-white text-sm sm:text-base leading-snug truncate">
                          {user.name}
                        </span>
                        <div className="flex items-center gap-2 flex-wrap text-xs text-zinc-400">
                          <span className="truncate">{user.email}</span>
                          <span className="hidden sm:inline text-zinc-600">•</span>
                          <span className="bg-zinc-800/90 px-2 py-0.5 rounded-md font-mono text-[11px] text-purple-300 border border-zinc-700/60">
                            ID: {user.userId}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div
                      className={`absolute top-3.5 right-3.5 sm:static h-5 w-5 rounded-lg border flex items-center justify-center shrink-0 ml-4 transition-all duration-200 ${isSelected
                        ? 'bg-gradient-to-br from-purple-600 to-indigo-600 border-purple-400 text-white shadow-md scale-110'
                        : 'border-zinc-600 bg-zinc-800/50 hover:border-zinc-500'
                        }`}
                    >
                      {isSelected && (
                        <svg
                          className="h-3.5 w-3.5 fill-current"
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

        {/* Action Buttons */}
        <div style={{ paddingTop: "10px" }} className="pt-4 border-t border-zinc-800/80 flex flex-col-reverse sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="btn btn-secondary py-3.5 px-6 rounded-xl font-semibold text-sm transition-all sm:w-auto"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary flex-1 py-3.5 px-6 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Creating Group...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Create Mess Group
              </>
            )}
          </button>
        </div>
      </form >
    </div >
  );
}
