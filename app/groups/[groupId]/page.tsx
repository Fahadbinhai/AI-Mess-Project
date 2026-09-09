'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { fetchWithRetry } from '@/lib/apiClient';
import LoadingSpinner from '@/components/LoadingSpinner';

const COLORS = ['#8b5cf6','#3b82f6','#10b981','#f59e0b','#ef4444','#ec4899','#06b6d4','#a855f7'];

export default function GroupDashboard({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = use(params);
  const { currentUser, loading } = useAuth() as any;
  const router = useRouter();

  const [group, setGroup] = useState<any>(null);
  const [sheets, setSheets] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');

  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState(false);
  const [updatingPermission, setUpdatingPermission] = useState(false);
  const [copiedSheetId, setCopiedSheetId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !currentUser) router.push('/login');
  }, [currentUser, loading, router]);

  const load = async () => {
    try {
      setFetching(true);
      const [gRes, sRes, sumRes] = await Promise.all([
        fetchWithRetry(`/api/groups/${groupId}`),
        fetchWithRetry(`/api/sheets?groupId=${groupId}`),
        fetchWithRetry(`/api/groups/${groupId}/expenses-summary`),
      ]);
      if (!gRes.ok) throw new Error('Failed to load group details');
      setGroup(await gRes.json());
      if (sRes.ok) setSheets(await sRes.json());
      if (sumRes.ok) setSummary(await sumRes.json());
    } catch (err: any) {
      setError(err.message || 'Error loading dashboard');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (currentUser && groupId) {
      load();
    }
  }, [currentUser, groupId]);

  const handleSearchUsers = async (query: string) => {
    setMemberSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetchWithRetry(`/api/users?search=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        // Filter out users already in the group
        const existingIds = group.members.map((m: any) => m._id);
        const filtered = data.filter((u: any) => !existingIds.includes(u._id));
        setSearchResults(filtered);
      }
    } catch (err) {
      console.error('Error searching members:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleAddMember = async (targetUser: any) => {
    try {
      const currentMemberIds = group.members.map((m: any) => m._id);
      const newMemberIds = [...currentMemberIds, targetUser._id];
      const res = await fetch(`/api/groups/${groupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberIds: newMemberIds }),
      });
      if (!res.ok) throw new Error('Failed to add member');
      const updatedGroup = await res.json();
      setGroup(updatedGroup);
      setMemberSearchQuery('');
      setSearchResults([]);
    } catch (err: any) {
      alert(err.message || 'Failed to add member');
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove "${memberName}" from the group?`)) return;
    try {
      const currentMemberIds = group.members.map((m: any) => m._id);
      const newMemberIds = currentMemberIds.filter((id: string) => id !== memberId);
      const res = await fetch(`/api/groups/${groupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberIds: newMemberIds }),
      });
      if (!res.ok) throw new Error('Failed to remove member');
      const updatedGroup = await res.json();
      setGroup(updatedGroup);
    } catch (err: any) {
      alert(err.message || 'Failed to remove member');
    }
  };

  const handleDeleteGroup = async () => {
    if (!confirm('🚨 WARNING: Are you sure you want to delete this group? This will permanently delete all associated monthly sheets and expense ledgers. This action is irreversible.')) return;
    setDeletingGroup(true);
    try {
      const res = await fetch(`/api/groups/${groupId}?requesterId=${currentUser._id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to delete group');
      }
      router.push('/dashboard');
    } catch (err: any) {
      alert(err.message || 'Error deleting group');
      setDeletingGroup(false);
    }
  };

  const handleTogglePermission = async (newValue: boolean) => {
    setUpdatingPermission(true);
    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowPreviousMonthsViewer: newValue }),
      });
      if (!res.ok) throw new Error('Failed to update viewer permission');
      const updated = await res.json();
      setGroup(updated);
    } catch (err: any) {
      alert(err.message || 'Error updating permission');
    } finally {
      setUpdatingPermission(false);
    }
  };

  const handleCopyViewerLink = (e: React.MouseEvent, sheetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/view/${sheetId}`;
    navigator.clipboard.writeText(url);
    setCopiedSheetId(sheetId);
    setTimeout(() => setCopiedSheetId(null), 2000);
  };

  if (loading || !currentUser || fetching) {
    return <LoadingSpinner message="Loading group dashboard..." />;
  }

  if (error || !group) {
    return (
      <div className="page-container-md">
        <div className="alert alert-error">{error || 'Group not found.'}</div>
        <Link href="/dashboard" className="btn btn-secondary">← Back to Dashboard</Link>
      </div>
    );
  }

  const isAdmin = currentUser.role === 'admin';
  const isLeader = group.leader?._id === currentUser._id;
  const canManage = isAdmin || isLeader; // can create sheets, manage members

  const chartData = summary
    ? [
        { name: 'House Rent', value: summary.houseRent },
        { name: 'Current Bill', value: summary.currentBill },
        { name: 'Gas Bill', value: summary.gasBill },
        { name: 'WiFi Bill', value: summary.wifiBill },
        { name: 'Dust Bill', value: summary.dustBill },
        { name: 'Maid Bill', value: summary.maidBill },
        { name: 'Others', value: summary.othersExpenses },
        { name: 'Bazar Budget', value: summary.bazarBudget },
      ].filter(d => d.value > 0)
    : [];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-text">
          <div className="breadcrumb">
            <Link href="/dashboard">Dashboard</Link>
            <span>›</span>
            <span>Group</span>
          </div>
          <h1>{group.name}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {isLeader && <span className="badge badge-leader">Group Admin</span>}
            {isAdmin && <span className="badge badge-admin">Admin</span>}
            {!isLeader && !isAdmin && <span className="badge badge-viewer">Viewer</span>}
            <span className="text-xs text-zinc-400">
              Group Admin: <span className="text-zinc-200">{group.leader?.name}</span>
            </span>
          </div>
        </div>
        <div className="page-header-actions">
          {canManage && (
            <Link href={`/groups/${groupId}/sheets/create`} className="btn btn-primary">
              + Monthly Sheet
            </Link>
          )}
          {(isAdmin || isLeader) && (
            <button
              onClick={handleDeleteGroup}
              disabled={deletingGroup}
              className="btn btn-danger"
            >
              {deletingGroup ? 'Deleting...' : '🗑️ Delete Group'}
            </button>
          )}
          <Link href="/dashboard" className="btn btn-secondary">← Back</Link>
        </div>
      </div>

      {/* Role notice */}
      {!canManage && (
        <div className="role-notice role-notice-viewer mb-6">
          <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          You have <strong className="mx-1">Viewer</strong> access to this group — data is read-only.
        </div>
      )}

      {canManage && isLeader && !isAdmin && (
        <div className="role-notice role-notice-leader mb-6">
          <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          You are the <strong className="mx-1">Group Admin</strong> — you can create monthly sheets, enter expenses, and manage members.
        </div>
      )}

      {/* Admin Settings & Public Permission Toggle */}
      {canManage && (
        <div className="glass-panel mb-6 p-4 border-l-4 border-purple-500">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white">🌐 Public Sheet Viewer Settings</span>
                <span className="badge badge-primary text-[10px]">Admin Control</span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Allow visitors opening any monthly sheet link to also view previous months' details without logging in.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-zinc-300">
                {group.allowPreviousMonthsViewer ? 'Enabled (Show Previous Months)' : 'Disabled (Only Current Month)'}
              </span>
              <button
                onClick={() => handleTogglePermission(!group.allowPreviousMonthsViewer)}
                disabled={updatingPermission}
                className={`btn btn-sm ${group.allowPreviousMonthsViewer ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  minWidth: '100px',
                  backgroundColor: group.allowPreviousMonthsViewer ? '#10b981' : '#3f3f46',
                  borderColor: group.allowPreviousMonthsViewer ? '#10b981' : '#3f3f46',
                }}
              >
                {updatingPermission ? 'Updating...' : group.allowPreviousMonthsViewer ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main layout */}
      <div className="two-col-grid">
        {/* Left column */}
        <div className="flex flex-col gap-6">
          {/* Monthly Sheets */}
          <section className="glass-panel">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="text-base font-bold text-white">Monthly Expense Sheets</h2>
              <span className="text-xs text-zinc-500">{sheets.length} sheet{sheets.length !== 1 ? 's' : ''}</span>
            </div>
            {sheets.length === 0 ? (
              <div className="empty-state">
                <p className="text-zinc-500 text-sm mb-3">No monthly sheets created yet.</p>
                {canManage && (
                  <Link href={`/groups/${groupId}/sheets/create`} className="btn btn-primary btn-sm">
                    Create First Sheet
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {sheets.map(sheet => (
                  <div key={sheet._id} className="glass-panel p-4 flex flex-col justify-between hover:border-purple-500/50 transition-colors">
                    <div>
                      <div className="font-bold text-white text-sm">{sheet.month} {sheet.year}</div>
                      <div className="text-xs text-zinc-500 mt-1">
                        Opened: {new Date(sheet.openingDate).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-zinc-800 gap-2">
                      <Link href={`/groups/${groupId}/sheets/${sheet._id}`} className="text-xs text-purple-400 font-medium hover:underline">
                        View details →
                      </Link>
                      <button
                        onClick={(e) => handleCopyViewerLink(e, sheet._id)}
                        className="btn btn-sm text-[11px] py-1 px-2.5 font-semibold"
                        style={{
                          backgroundColor: 'rgba(139, 92, 246, 0.2)',
                          borderColor: 'rgba(139, 92, 246, 0.4)',
                          color: '#c4b5fd'
                        }}
                        title="Copy public view link"
                      >
                        {copiedSheetId === sheet._id ? '✓ Copied' : '🔗 View link'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Members */}
          <section className="glass-panel">
            <h2 className="text-base font-bold text-white mb-4">
              Group Members <span className="text-zinc-500 font-normal text-sm">({group.members?.length || 0})</span>
            </h2>

            <div className="members-grid mb-6">
              {group.members?.map((m: any) => {
                const mIsLeader = m._id === group.leader?._id;
                return (
                  <div key={m._id} className="member-card justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="member-avatar">{m.name.charAt(0).toUpperCase()}</div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-semibold text-white truncate">{m.name}</span>
                          {mIsLeader && <span className="badge badge-leader">Group Admin</span>}
                        </div>
                        <span className="text-xs text-zinc-400 font-mono">ID: {m.userId}</span>
                      </div>
                    </div>
                    {canManage && !mIsLeader && (
                      <button
                        onClick={() => handleRemoveMember(m._id, m.name)}
                        className="text-red-400 hover:text-red-300 p-1.5 bg-zinc-900 hover:bg-zinc-800 rounded transition-colors text-xs font-bold font-mono border-none cursor-pointer"
                        title="Remove member from group"
                        style={{ padding: '0.2rem 0.4rem' }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add member section (Admins only) */}
            {canManage && (
              <div className="border-t border-zinc-800 pt-4">
                <h3 className="text-sm font-bold text-zinc-300 mb-2">Add New Member</h3>
                <div className="relative">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search by name, email, or 6-digit ID..."
                    value={memberSearchQuery}
                    onChange={(e) => handleSearchUsers(e.target.value)}
                  />
                  {memberSearchQuery && (
                    <div className="absolute left-0 right-0 mt-2 max-h-48 overflow-y-auto border border-zinc-800 rounded-lg bg-zinc-950 p-2 flex flex-col gap-1 z-10">
                      {searching ? (
                        <div className="text-center py-4 text-xs text-zinc-500">Searching...</div>
                      ) : searchResults.length === 0 ? (
                        <div className="text-center py-4 text-xs text-zinc-500">No members found to add.</div>
                      ) : (
                        searchResults.map((user) => (
                          <div
                            key={user._id}
                            onClick={() => handleAddMember(user)}
                            className="flex items-center justify-between p-2 rounded hover:bg-zinc-900 cursor-pointer transition-colors"
                          >
                            <div className="flex flex-col text-left">
                              <span className="text-xs font-semibold text-white">{user.name}</span>
                              <span className="text-[10px] text-zinc-400">ID: {user.userId}</span>
                            </div>
                            <span className="text-xs text-purple-400 font-bold font-mono">+ Add</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Right column — Overall Chart */}
        <div>
          <section className="glass-panel h-full flex flex-col">
            <h2 className="text-base font-bold text-white mb-1">Overall Expense Overview</h2>
            <p className="text-xs text-zinc-400 mb-4">Aggregated across all monthly sheets</p>

            {!summary || summary.totalWithoutDue === 0 ? (
              <div className="empty-state flex-1">
                <p className="text-zinc-500 text-sm">No expense data available yet.</p>
              </div>
            ) : (
              <>
                {/* Donut Chart */}
                <div className="relative" style={{ height: '220px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                        {chartData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                        formatter={(val: any) => [`৳${Number(val).toLocaleString()}`, '']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xl font-black text-white">৳{summary.totalWithoutDue.toLocaleString()}</span>
                    <span className="text-xs text-zinc-400">Total Base</span>
                  </div>
                </div>

                {/* Legend */}
                <div className="grid grid-cols-2 gap-1.5 mt-3 mb-4">
                  {chartData.map((item, i) => (
                    <div key={item.name} className="flex items-center gap-1.5 text-xs">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-zinc-400 truncate">{item.name}</span>
                    </div>
                  ))}
                </div>

                {/* Summary stats */}
                <div className="border-t border-zinc-800 pt-3 flex flex-col gap-2 mt-auto">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Total (No Due)</span>
                    <span className="text-white font-bold">৳{summary.totalWithoutDue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Unpaid Dues</span>
                    <span className="text-amber-400 font-bold">৳{summary.due.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold border-t border-zinc-800 pt-2 mt-1">
                    <span className="text-zinc-200">Grand Total</span>
                    <span className="text-purple-400">৳{summary.totalWithDue.toLocaleString()}</span>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
