'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { fetchWithRetry } from '@/lib/apiClient';

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#a855f7'];

const EXPENSE_FIELDS = [
  { key: 'houseRent', label: 'House Rent' },
  { key: 'currentBill', label: 'Current Bill' },
  { key: 'gasBill', label: 'Gas Bill' },
  { key: 'wifiBill', label: 'WiFi Bill' },
  { key: 'dustBill', label: 'Dust Bill' },
  { key: 'maidBill', label: 'Maid Bill' },
  { key: 'othersExpenses', label: "Others' Expenses" },
  { key: 'bazarBudget', label: 'Bazar Budget' },
];

interface ExpenseEntry {
  _id: string;
  userId: { _id: string; userId: string; name: string };
  houseRent: number;
  currentBill: number;
  gasBill: number;
  wifiBill: number;
  dustBill: number;
  maidBill: number;
  othersExpenses: number;
  bazarBudget: number;
  due: number;
  totalWithoutDue: number;
  totalWithDue: number;
  isPaid: boolean;
}

export default function SheetDetail({ params }: { params: Promise<{ groupId: string; sheetId: string }> }) {
  const { groupId, sheetId } = use(params);
  const { currentUser, loading } = useAuth() as any;
  const router = useRouter();

  const [sheet, setSheet] = useState<any>(null);
  const [entries, setEntries] = useState<ExpenseEntry[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [updatingPermission, setUpdatingPermission] = useState(false);

  // Expense form
  const [showForm, setShowForm] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [formValues, setFormValues] = useState<Record<string, string>>({
    houseRent: '0', currentBill: '0', gasBill: '0', wifiBill: '0',
    dustBill: '0', maidBill: '0', othersExpenses: '0', bazarBudget: '0', due: '0',
  });
  const [formIsPaid, setFormIsPaid] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');

  // Inline edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({
    houseRent: '0', currentBill: '0', gasBill: '0', wifiBill: '0',
    dustBill: '0', maidBill: '0', othersExpenses: '0', bazarBudget: '0', due: '0'
  });
  const [editIsPaid, setEditIsPaid] = useState(false);
  const [savingInline, setSavingInline] = useState(false);

  const handleStartEdit = (entry: ExpenseEntry) => {
    setEditingId(entry._id);
    setEditValues({
      houseRent: entry.houseRent.toString(),
      currentBill: entry.currentBill.toString(),
      gasBill: entry.gasBill.toString(),
      wifiBill: entry.wifiBill.toString(),
      dustBill: entry.dustBill.toString(),
      maidBill: entry.maidBill.toString(),
      othersExpenses: entry.othersExpenses.toString(),
      bazarBudget: entry.bazarBudget.toString(),
      due: entry.due.toString(),
    });
    setEditIsPaid(entry.isPaid || false);
  };

  const handleEditChange = (key: string, value: string) => {
    setEditValues(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveInline = async (entry: ExpenseEntry) => {
    setSavingInline(true);
    setError('');
    setSaveSuccess('');
    try {
      const body: any = {
        sheetId,
        userId: entry.userId._id,
        isPaid: editIsPaid,
      };
      EXPENSE_FIELDS.forEach(f => {
        body[f.key] = parseFloat(editValues[f.key]) || 0;
      });
      body.due = parseFloat(editValues.due) || 0;

      const res = await fetchWithRetry('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save inline expenses');
      setSaveSuccess('Expenses updated successfully!');
      await loadData();
      setEditingId(null);
    } catch (err: any) {
      setError(err.message || 'Save failed');
    } finally {
      setSavingInline(false);
    }
  };

  useEffect(() => {
    if (!loading && !currentUser) router.push('/login');
  }, [currentUser, loading, router]);

  const loadData = async () => {
    try {
      setFetching(true);
      const [sRes, eRes] = await Promise.all([
        fetchWithRetry(`/api/sheets/${sheetId}`),
        fetchWithRetry(`/api/expenses?sheetId=${sheetId}`),
      ]);
      if (!sRes.ok) throw new Error('Failed to load sheet details');
      setSheet(await sRes.json());
      if (eRes.ok) setEntries(await eRes.json());
    } catch (err: any) {
      setError(err.message || 'Error loading sheet');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (currentUser && sheetId) loadData();
  }, [currentUser, sheetId]);

  // Prefill form when member is selected
  useEffect(() => {
    if (!selectedUserId) {
      setFormValues({ houseRent: '0', currentBill: '0', gasBill: '0', wifiBill: '0', dustBill: '0', maidBill: '0', othersExpenses: '0', bazarBudget: '0', due: '0' });
      setFormIsPaid(false);
      return;
    }
    const existing = entries.find(e => e.userId._id === selectedUserId);
    if (existing) {
      setFormValues({
        houseRent: existing.houseRent.toString(),
        currentBill: existing.currentBill.toString(),
        gasBill: existing.gasBill.toString(),
        wifiBill: existing.wifiBill.toString(),
        dustBill: existing.dustBill.toString(),
        maidBill: existing.maidBill.toString(),
        othersExpenses: existing.othersExpenses.toString(),
        bazarBudget: existing.bazarBudget.toString(),
        due: existing.due.toString(),
      });
      setFormIsPaid(existing.isPaid || false);
    } else {
      setFormValues({ houseRent: '0', currentBill: '0', gasBill: '0', wifiBill: '0', dustBill: '0', maidBill: '0', othersExpenses: '0', bazarBudget: '0', due: '0' });
      setFormIsPaid(false);
    }
  }, [selectedUserId, entries]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;
    setSaving(true);
    setSaveSuccess('');
    setError('');
    try {
      const body: any = { sheetId, userId: selectedUserId };
      EXPENSE_FIELDS.forEach(f => { body[f.key] = parseFloat(formValues[f.key]) || 0; });
      body.due = parseFloat(formValues.due) || 0;
      body.isPaid = formIsPaid;

      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save expenses');
      setSaveSuccess('Expenses saved successfully!');
      await loadData();
      setSelectedUserId('');
      setShowForm(false);
    } catch (err: any) {
      setError(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePaidStatus = async (entry: ExpenseEntry) => {
    if (!canInputExpenses) return;
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetId: sheetId,
          userId: entry.userId._id,
          isPaid: !entry.isPaid,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to toggle status');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle status');
    }
  };

  const handleCopyPublicLink = () => {
    const url = `${window.location.origin}/view/${sheetId}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleTogglePermission = async (newValue: boolean) => {
    if (!sheet?.groupId?._id) return;
    setUpdatingPermission(true);
    try {
      const res = await fetch(`/api/groups/${sheet.groupId._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowPreviousMonthsViewer: newValue }),
      });
      if (!res.ok) throw new Error('Failed to update viewer permission');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update permission');
    } finally {
      setUpdatingPermission(false);
    }
  };

  if (loading || !currentUser || fetching) {
    return <div className="loading-screen"><p className="loading-text">Loading monthly sheet...</p></div>;
  }

  if (error && !sheet) {
    return (
      <div className="page-container-md">
        <div className="alert alert-error">{error}</div>
        <Link href={`/groups/${groupId}`} className="btn btn-secondary">← Back to Group</Link>
      </div>
    );
  }

  const isAdmin = currentUser.role === 'admin';
  const isLeader = sheet?.groupId?.leader === currentUser._id || sheet?.groupId?.leader?._id === currentUser._id;
  const canInputExpenses = isAdmin || isLeader;
  const groupMembers = sheet?.groupId?.members || [];

  // Compute totals
  const totals = entries.reduce((acc, e) => ({
    houseRent: acc.houseRent + e.houseRent,
    currentBill: acc.currentBill + e.currentBill,
    gasBill: acc.gasBill + e.gasBill,
    wifiBill: acc.wifiBill + e.wifiBill,
    dustBill: acc.dustBill + e.dustBill,
    maidBill: acc.maidBill + e.maidBill,
    othersExpenses: acc.othersExpenses + e.othersExpenses,
    bazarBudget: acc.bazarBudget + e.bazarBudget,
    due: acc.due + e.due,
    totalWithoutDue: acc.totalWithoutDue + e.totalWithoutDue,
    totalWithDue: acc.totalWithDue + e.totalWithDue,
  }), { houseRent: 0, currentBill: 0, gasBill: 0, wifiBill: 0, dustBill: 0, maidBill: 0, othersExpenses: 0, bazarBudget: 0, due: 0, totalWithoutDue: 0, totalWithDue: 0 });

  const chartData = EXPENSE_FIELDS
    .map(f => ({ name: f.label, value: (totals as any)[f.key] }))
    .filter(d => d.value > 0);

  return (
    <div className="page-container" style={{ maxWidth: '1600px' }}>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-text">
          <div className="breadcrumb">
            <Link href="/dashboard">Dashboard</Link>
            <span>›</span>
            <Link href={`/groups/${groupId}`}>{sheet?.groupId?.name}</Link>
            <span>›</span>
            <span>{sheet?.month} {sheet?.year}</span>
          </div>
          <h1>{sheet?.month} {sheet?.year} — Expense Ledger</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Opened: {sheet?.openingDate ? new Date(sheet.openingDate).toLocaleDateString() : '—'}
            &nbsp;•&nbsp;{entries.length} / {groupMembers.length} members logged
          </p>
        </div>
        <div className="page-header-actions">
          <button
            onClick={handleCopyPublicLink}
            className="btn btn-secondary flex items-center gap-1.5"
            title="Copy Public Viewer Link for this sheet"
          >
            {copiedLink ? '✓ Link Copied!' : '📋 Copy Viewer Link'}
          </button>
          {canInputExpenses && (
            <button
              onClick={() => { setShowForm(!showForm); setSaveSuccess(''); }}
              className="btn btn-primary"
            >
              {showForm ? '✕ Close Form' : '✏️ Input Expenses'}
            </button>
          )}
          <Link href={`/groups/${groupId}`} className="btn btn-secondary">← Back</Link>
        </div>
      </div>

      {/* Admin Settings bar inside Sheet View */}
      {canInputExpenses && sheet?.groupId && (
        <div className="glass-panel mb-6 p-3 px-4 flex flex-wrap items-center justify-between gap-3 border-l-4 border-purple-500">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">🌐 Viewer Setting:</span>
            <span className="text-xs text-zinc-400">
              {sheet.groupId.allowPreviousMonthsViewer
                ? 'Visitors can view previous months via dropdown.'
                : 'Visitors can only view this month.'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-300 font-medium">Previous Months Access:</span>
            <button
              onClick={() => handleTogglePermission(!sheet.groupId.allowPreviousMonthsViewer)}
              disabled={updatingPermission}
              className="btn btn-sm"
              style={{
                backgroundColor: sheet.groupId.allowPreviousMonthsViewer ? '#10b981' : '#3f3f46',
                borderColor: sheet.groupId.allowPreviousMonthsViewer ? '#10b981' : '#3f3f46',
                color: '#fff',
                fontSize: '11px',
                padding: '0.25rem 0.75rem',
              }}
            >
              {updatingPermission ? 'Updating...' : sheet.groupId.allowPreviousMonthsViewer ? 'ENABLED (ON)' : 'DISABLED (OFF)'}
            </button>
          </div>
        </div>
      )}

      {/* Role notice */}
      {!canInputExpenses && (
        <div className="role-notice role-notice-viewer">
          <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          You have <strong className="mx-1">Viewer</strong> access — only the Group Admin or system Admin can input expenses.
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}
      {saveSuccess && <div className="alert alert-success">{saveSuccess}</div>}

      {/* Expense Input Form */}
      {showForm && canInputExpenses && (
        <div className="glass-panel mb-6" style={{ border: '1px solid rgba(139,92,246,0.25)' }}>
          <h2 className="text-base font-bold text-white mb-1">Input Member Expenses</h2>
          <p className="text-xs text-zinc-400 mb-5">Select a member and enter their monthly expense breakdown.</p>

          <form onSubmit={handleSave}>
            <div className="form-group" style={{ maxWidth: '420px' }}>
              <label className="form-label font-semibold text-white">Select Group Member</label>
              <select
                className="form-control"
                value={selectedUserId}
                onChange={e => setSelectedUserId(e.target.value)}
                required
              >
                <option value="">-- Choose Member --</option>
                {groupMembers.map((m: any) => (
                  <option key={m._id} value={m._id}>
                    {m.name} — ID: {m.userId}
                    {entries.find(e => e.userId._id === m._id) ? ' ✓' : ''}
                  </option>
                ))}
              </select>
            </div>

            {selectedUserId && (
              <>
                <div className="three-col-grid mb-4">
                  {EXPENSE_FIELDS.map(field => (
                    <div key={field.key} className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">{field.label} (৳)</label>
                      <input
                        type="number"
                        className="form-control"
                        min="0"
                        step="any"
                        value={formValues[field.key]}
                        onChange={e => setFormValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                      />
                    </div>
                  ))}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ color: '#fcd34d' }}>Due (৳)</label>
                    <input
                      type="number"
                      className="form-control"
                      min="0"
                      step="any"
                      value={formValues.due}
                      onChange={e => setFormValues(prev => ({ ...prev, due: e.target.value }))}
                      style={{ borderColor: 'rgba(245,158,11,0.4)' }}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ color: '#10b981' }}>Payment Status</label>
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="checkbox"
                        id="formIsPaid"
                        checked={formIsPaid}
                        onChange={e => setFormIsPaid(e.target.checked)}
                        className="h-5 w-5 rounded border-zinc-700 bg-zinc-950 text-purple-600 focus:ring-purple-500 cursor-pointer"
                      />
                      <label htmlFor="formIsPaid" className="text-sm font-semibold text-white cursor-pointer select-none">
                        Mark as Paid
                      </label>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 flex-wrap">
                  <button type="submit" disabled={saving} className="btn btn-primary">
                    {saving ? 'Saving...' : 'Save Expenses'}
                  </button>
                  <button type="button" onClick={() => { setShowForm(false); setSelectedUserId(''); }} className="btn btn-secondary">
                    Cancel
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      )}

      {/* Expense Table */}
      <section className="glass-panel mb-6">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-base font-bold text-white">Expense Ledger Table</h2>
          {entries.length > 0 && (
            <div className="flex gap-4 text-sm">
              <span className="text-zinc-400">Total (No Due): <strong className="text-purple-300">৳{totals.totalWithoutDue.toLocaleString()}</strong></span>
              <span className="text-zinc-400">Total (With Due): <strong className="text-purple-400">৳{totals.totalWithDue.toLocaleString()}</strong></span>
            </div>
          )}
        </div>

        <div className="table-container" style={{ marginTop: 0 }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Rent</th>
                <th>Current</th>
                <th>Gas</th>
                <th>WiFi</th>
                <th>Dust</th>
                <th>Maid</th>
                <th>Others</th>
                <th>Bazar</th>
                <th style={{ color: '#fcd34d' }}>Due</th>
                <th style={{ color: '#c4b5fd' }}>Total (No Due)</th>
                <th style={{ color: '#a78bfa' }}>Total (W/ Due)</th>
                <th>Status</th>
                {canInputExpenses && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={canInputExpenses ? 14 : 13} className="text-center py-10 text-zinc-500 italic">
                    No expense data entered yet.
                    {canInputExpenses && (
                      <button onClick={() => setShowForm(true)} className="ml-2 text-purple-400 hover:text-purple-300 underline bg-transparent border-none cursor-pointer font-medium">
                        Add now
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                <>
                  {entries.map(entry => {
                    const isEditing = editingId === entry._id;
                    const computedTotalWithoutDue = isEditing
                      ? (parseFloat(editValues.houseRent) || 0) +
                      (parseFloat(editValues.currentBill) || 0) +
                      (parseFloat(editValues.gasBill) || 0) +
                      (parseFloat(editValues.wifiBill) || 0) +
                      (parseFloat(editValues.dustBill) || 0) +
                      (parseFloat(editValues.maidBill) || 0) +
                      (parseFloat(editValues.othersExpenses) || 0) +
                      (parseFloat(editValues.bazarBudget) || 0)
                      : entry.totalWithoutDue;

                    const computedTotalWithDue = isEditing
                      ? computedTotalWithoutDue + (parseFloat(editValues.due) || 0)
                      : entry.totalWithDue;

                    return (
                      <tr
                        key={entry._id}
                        style={{
                          backgroundColor: entry.isPaid ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          transition: 'background-color 0.2s ease',
                        }}
                      >
                        <td>
                          <div className="font-semibold text-white">{entry.userId?.name}</div>
                          <div className="text-xs font-mono text-zinc-500">#{entry.userId?.userId}</div>
                        </td>
                        <td>
                          {isEditing ? (
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={editValues.houseRent}
                              onChange={e => handleEditChange('houseRent', e.target.value)}
                              className="form-control"
                              style={{ width: '80px', padding: '0.25rem 0.5rem', fontSize: '0.8rem', background: '#09090b', border: '1px solid var(--border-color)', borderRadius: '6px' }}
                            />
                          ) : (
                            `৳${entry.houseRent.toLocaleString()}`
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={editValues.currentBill}
                              onChange={e => handleEditChange('currentBill', e.target.value)}
                              className="form-control"
                              style={{ width: '80px', padding: '0.25rem 0.5rem', fontSize: '0.8rem', background: '#09090b', border: '1px solid var(--border-color)', borderRadius: '6px' }}
                            />
                          ) : (
                            `৳${entry.currentBill.toLocaleString()}`
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={editValues.gasBill}
                              onChange={e => handleEditChange('gasBill', e.target.value)}
                              className="form-control"
                              style={{ width: '80px', padding: '0.25rem 0.5rem', fontSize: '0.8rem', background: '#09090b', border: '1px solid var(--border-color)', borderRadius: '6px' }}
                            />
                          ) : (
                            `৳${entry.gasBill.toLocaleString()}`
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={editValues.wifiBill}
                              onChange={e => handleEditChange('wifiBill', e.target.value)}
                              className="form-control"
                              style={{ width: '80px', padding: '0.25rem 0.5rem', fontSize: '0.8rem', background: '#09090b', border: '1px solid var(--border-color)', borderRadius: '6px' }}
                            />
                          ) : (
                            `৳${entry.wifiBill.toLocaleString()}`
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={editValues.dustBill}
                              onChange={e => handleEditChange('dustBill', e.target.value)}
                              className="form-control"
                              style={{ width: '80px', padding: '0.25rem 0.5rem', fontSize: '0.8rem', background: '#09090b', border: '1px solid var(--border-color)', borderRadius: '6px' }}
                            />
                          ) : (
                            `৳${entry.dustBill.toLocaleString()}`
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={editValues.maidBill}
                              onChange={e => handleEditChange('maidBill', e.target.value)}
                              className="form-control"
                              style={{ width: '80px', padding: '0.25rem 0.5rem', fontSize: '0.8rem', background: '#09090b', border: '1px solid var(--border-color)', borderRadius: '6px' }}
                            />
                          ) : (
                            `৳${entry.maidBill.toLocaleString()}`
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={editValues.othersExpenses}
                              onChange={e => handleEditChange('othersExpenses', e.target.value)}
                              className="form-control"
                              style={{ width: '80px', padding: '0.25rem 0.5rem', fontSize: '0.8rem', background: '#09090b', border: '1px solid var(--border-color)', borderRadius: '6px' }}
                            />
                          ) : (
                            `৳${entry.othersExpenses.toLocaleString()}`
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={editValues.bazarBudget}
                              onChange={e => handleEditChange('bazarBudget', e.target.value)}
                              className="form-control"
                              style={{ width: '80px', padding: '0.25rem 0.5rem', fontSize: '0.8rem', background: '#09090b', border: '1px solid var(--border-color)', borderRadius: '6px' }}
                            />
                          ) : (
                            `৳${entry.bazarBudget.toLocaleString()}`
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={editValues.due}
                              onChange={e => handleEditChange('due', e.target.value)}
                              className="form-control"
                              style={{ width: '80px', padding: '0.25rem 0.5rem', fontSize: '0.8rem', background: '#09090b', border: '1px solid rgba(245, 158, 11, 0.4)', borderRadius: '6px' }}
                            />
                          ) : (
                            <span className="due-column font-semibold">৳{entry.due.toLocaleString()}</span>
                          )}
                        </td>
                        <td style={{ color: '#c4b5fd', fontWeight: 700 }}>৳{computedTotalWithoutDue.toLocaleString()}</td>
                        <td style={{ color: '#a78bfa', fontWeight: 700 }}>৳{computedTotalWithDue.toLocaleString()}</td>
                        <td>
                          {isEditing ? (
                            <div className="flex items-center gap-1.5 justify-center">
                              <input
                                type="checkbox"
                                id={`editIsPaid-${entry._id}`}
                                checked={editIsPaid}
                                onChange={e => setEditIsPaid(e.target.checked)}
                                className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-purple-600 focus:ring-purple-500 cursor-pointer"
                              />
                              <label htmlFor={`editIsPaid-${entry._id}`} className="text-[10px] font-semibold text-zinc-300 cursor-pointer select-none">
                                Paid
                              </label>
                            </div>
                          ) : (
                            <span className={`badge ${entry.isPaid ? 'badge-user' : 'badge-admin'}`} style={{ minWidth: '60px', textAlign: 'center' }}>
                              {entry.isPaid ? 'Paid' : 'Unpaid'}
                            </span>
                          )}
                        </td>
                        {canInputExpenses && (
                          <td>
                            {isEditing ? (
                              <div className="flex gap-1 justify-center">
                                <button
                                  onClick={() => handleSaveInline(entry)}
                                  disabled={savingInline}
                                  className="btn btn-sm btn-primary"
                                  style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem', minWidth: '45px' }}
                                >
                                  {savingInline ? '...' : 'Save'}
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="btn btn-sm btn-secondary"
                                  style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem', minWidth: '45px' }}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex gap-1 justify-center">
                                <button
                                  onClick={() => handleStartEdit(entry)}
                                  className="btn btn-sm btn-secondary"
                                  style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '3px' }}
                                >
                                  ✏️ Edit
                                </button>
                                <button
                                  onClick={() => handleTogglePaidStatus(entry)}
                                  className={`btn btn-sm ${entry.isPaid ? 'btn-success' : 'btn-danger'}`}
                                  style={{ minWidth: '60px', padding: '0.2rem 0.4rem', fontSize: '0.7rem' }}
                                >
                                  {entry.isPaid ? 'Paid' : 'Unpaid'}
                                </button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  <tr className="highlight-row">
                    <td>TOTAL</td>
                    <td>৳{totals.houseRent.toLocaleString()}</td>
                    <td>৳{totals.currentBill.toLocaleString()}</td>
                    <td>৳{totals.gasBill.toLocaleString()}</td>
                    <td>৳{totals.wifiBill.toLocaleString()}</td>
                    <td>৳{totals.dustBill.toLocaleString()}</td>
                    <td>৳{totals.maidBill.toLocaleString()}</td>
                    <td>৳{totals.othersExpenses.toLocaleString()}</td>
                    <td>৳{totals.bazarBudget.toLocaleString()}</td>
                    <td style={{ color: '#fcd34d', fontWeight: 700 }}>৳{totals.due.toLocaleString()}</td>
                    <td style={{ color: '#ddd6fe', fontWeight: 800 }}>৳{totals.totalWithoutDue.toLocaleString()}</td>
                    <td style={{ color: '#ffffff', fontWeight: 800 }}>৳{totals.totalWithDue.toLocaleString()}</td>
                    <td>—</td>
                    {canInputExpenses && <td>—</td>}
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Donut Chart */}
      {chartData.length > 0 && (
        <section className="glass-panel">
          <h2 className="text-base font-bold text-white mb-1">Monthly Expense Distribution</h2>
          <p className="text-xs text-zinc-400 mb-5">Visual breakdown of expense categories for {sheet?.month} {sheet?.year}</p>

          <div className="two-col-grid items-center">
            <div className="relative" style={{ height: '280px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={3} dataKey="value">
                    {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    formatter={(val: any) => [`৳${Number(val).toLocaleString()}`, '']}
                  />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: '12px', color: '#a1a1aa' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ marginBottom: '40px' }}>
                <span className="text-2xl font-black text-white">৳{totals.totalWithoutDue.toLocaleString()}</span>
                <span className="text-xs text-zinc-400">Base Total</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 bg-zinc-950/50 rounded-xl p-4 border border-zinc-800">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Spending Breakdown</h3>
              {chartData.map((item, i) => {
                const pct = totals.totalWithoutDue > 0 ? ((item.value / totals.totalWithoutDue) * 100).toFixed(1) : '0';
                return (
                  <div key={item.name} className="flex justify-between items-center text-xs border-b border-zinc-900 pb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-zinc-300">{item.name}</span>
                    </div>
                    <span className="text-white font-semibold">৳{item.value.toLocaleString()} <span className="text-zinc-500 font-normal">({pct}%)</span></span>
                  </div>
                );
              })}
              <div className="flex justify-between items-center text-sm pt-1.5 font-bold">
                <span className="text-zinc-300">Total (With Due)</span>
                <span className="text-purple-400">৳{totals.totalWithDue.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
