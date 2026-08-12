'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const { currentUser, loading } = useAuth() as any;
  const router = useRouter();
  const [groups, setGroups] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !currentUser) router.push('/login');
  }, [currentUser, loading, router]);

  useEffect(() => {
    if (!currentUser) return;
    async function loadGroups() {
      try {
        const res = await fetch(`/api/groups?userId=${currentUser._id}`);
        if (!res.ok) throw new Error('Failed to load groups');
        const data = await res.json();
        setGroups(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch your groups');
      } finally {
        setFetching(false);
      }
    }
    loadGroups();
  }, [currentUser]);

  if (loading || !currentUser) {
    return <div className="loading-screen"><p className="loading-text">Loading your profile...</p></div>;
  }

  const isSystemAdmin = currentUser.role === 'admin';

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-text">
          <h1>Welcome, {currentUser.name}! 👋</h1>
          <p className="mt-1">
            User ID: <span className="font-mono text-purple-400">{currentUser.userId}</span>
            &nbsp;•&nbsp;
            <span className={`badge ${isSystemAdmin ? 'badge-admin' : 'badge-user'}`}>
              {isSystemAdmin ? 'Admin' : 'User'}
            </span>
          </p>
        </div>
        <div className="page-header-actions">
          <Link href="/groups/create" className="btn btn-primary">
            + Create Group
          </Link>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Groups section */}
      <section>
        <h2 className="text-lg font-bold text-zinc-300 mb-1">
          Your Mess Groups
          <span className="ml-2 text-sm font-normal text-zinc-500">({groups.length})</span>
        </h2>

        {fetching ? (
          <div className="text-center py-12 text-zinc-500">Loading groups...</div>
        ) : groups.length === 0 ? (
          <div className="glass-panel empty-state">
            <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h3 className="text-lg font-bold mb-2">No groups yet</h3>
            <p className="text-sm text-zinc-400 max-w-xs mx-auto mb-5">
              You are not a member of any mess group. Create a group now to start tracking monthly expenses!
            </p>
            <Link href="/groups/create" className="btn btn-primary">
              Create First Group
            </Link>
          </div>
        ) : (
          <div className="dashboard-grid">
            {groups.map((group) => {
              const isMeLeader = group.leader?._id === currentUser._id;
              return (
                <div key={group._id} className="glass-panel flex flex-col gap-3" style={{ minHeight: '170px' }}>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-bold text-white leading-snug line-clamp-2">
                      {group.name}
                    </h3>
                    <div className="flex gap-1 flex-wrap justify-end">
                      {isMeLeader && <span className="badge badge-leader">Group Admin</span>}
                      {isSystemAdmin && <span className="badge badge-admin">Admin</span>}
                      {!isMeLeader && !isSystemAdmin && <span className="badge badge-viewer">Viewer</span>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 flex-1">
                    <p className="text-sm text-zinc-400">
                      Group Admin: <span className="text-zinc-200 font-medium">{group.leader?.name || 'N/A'}</span>
                    </p>
                    <p className="text-xs text-zinc-500 font-mono">
                      {group.members?.length || 0} member{group.members?.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <Link href={`/groups/${group._id}`} className="btn btn-secondary btn-full text-center mt-auto">
                    View Group →
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
