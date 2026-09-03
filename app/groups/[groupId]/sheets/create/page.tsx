'use client';

import React, { useState, useEffect, use } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { fetchWithRetry } from '@/lib/apiClient';

export default function CreateSheet({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = use(params);
  const { currentUser, loading } = useAuth() as any;
  const router = useRouter();

  const [month, setMonth] = useState('January');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [openingDate, setOpeningDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  // Only admin and group leaders can create sheets
  useEffect(() => {
    if (!loading) {
      if (!currentUser) router.push('/login');
    }
  }, [currentUser, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId) return;
    setError('');
    setSubmitting(true);
    try {
      const res = await fetchWithRetry('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, month, year: parseInt(year), openingDate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create sheet');
      router.push(`/groups/${groupId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create monthly sheet');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !currentUser) {
    return <div className="loading-screen"><p className="loading-text">Loading details...</p></div>;
  }

  return (
    <div className="page-container-sm">
      <div className="page-header">
        <div className="page-header-text">
          <h1>Create Monthly Expense Sheet</h1>
          <p className="mt-1">Open a new expense ledger for a specific month.</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="glass-panel">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Year selection first */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label font-semibold text-white">Year</label>
            <input type="number" className="form-control" value={year} onChange={e => setYear(e.target.value)} min="2020" max="2100" required />
          </div>

          {/* Month selection second */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label font-semibold text-white">Select Month</label>
            <select className="form-control" value={month} onChange={e => setMonth(e.target.value)} required>
              {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* Date selection third */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label font-semibold text-white">Opening Date</label>
            <input type="date" className="form-control" value={openingDate} onChange={e => setOpeningDate(e.target.value)} required />
          </div>

          <div className="flex gap-3 pt-2 border-t border-zinc-800">
            <button type="submit" disabled={submitting} className="btn btn-primary flex-1" style={{ padding: '0.85rem' }}>
              {submitting ? 'Creating...' : 'Create Expense Sheet'}
            </button>
            <button type="button" onClick={() => router.push(`/groups/${groupId}`)} className="btn btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
