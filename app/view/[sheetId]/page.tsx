'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import LoadingSpinner from '@/components/LoadingSpinner';

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

export default function PublicSheetView({ params }: { params: Promise<{ sheetId: string }> }) {
  const { sheetId } = use(params);
  const router = useRouter();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const loadData = async (targetId: string) => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`/api/public/sheet/${targetId}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error('Sheet not found');
        throw new Error('Failed to load sheet details');
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Error loading public sheet');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sheetId) {
      loadData(sheetId);
    }
  }, [sheetId]);

  const handleCopyLink = () => {
    const shareUrl = `${window.location.origin}/view/${sheetId}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    if (selectedId && selectedId !== sheetId) {
      router.push(`/view/${selectedId}`);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading Public Sheet View..." />;
  }

  if (error || !data) {
    return (
      <div className="page-container-sm" style={{ paddingTop: '4rem' }}>
        <div className="glass-panel text-center p-8">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-2">Sheet Not Available</h2>
          <p className="text-zinc-400 mb-6">{error || 'This monthly sheet does not exist or has been removed.'}</p>
          <Link href="/login" className="btn btn-primary">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  const { sheet, entries, group, availableSheets, allowPreviousMonthsViewer } = data;

  // Calculate Column Totals
  const colTotals = EXPENSE_FIELDS.reduce((acc: any, f) => {
    acc[f.key] = entries.reduce((sum: number, e: ExpenseEntry) => sum + ((e as any)[f.key] || 0), 0);
    return acc;
  }, {});

  const grandTotalWithoutDue = entries.reduce((sum: number, e: ExpenseEntry) => sum + (e.totalWithoutDue || 0), 0);
  const totalDues = entries.reduce((sum: number, e: ExpenseEntry) => sum + (e.due || 0), 0);
  const grandTotalWithDue = entries.reduce((sum: number, e: ExpenseEntry) => sum + (e.totalWithDue || 0), 0);
  const paidCount = entries.filter((e: ExpenseEntry) => e.isPaid).length;

  // Recharts Data
  const pieData = EXPENSE_FIELDS.map(f => ({
    name: f.label,
    value: colTotals[f.key] || 0,
  })).filter(d => d.value > 0);

  return (
    <div className="page-container" style={{ maxWidth: '1800px', margin: '0 auto', padding: '1.5rem 1rem' }}>
      {/* Top Banner Header */}
      <div className="glass-panel mb-6" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(24, 24, 27, 0.9) 100%)', borderLeft: '4px solid #8b5cf6' }}>
        <div className="flex flex-wrap items-center justify-between gap-4 p-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="badge badge-primary" style={{ backgroundColor: 'rgba(139, 92, 246, 0.25)', color: '#c4b5fd' }}>
                🌐 Public Sheet View
              </span>
              <span className="text-zinc-400 text-sm">
                • Mess: <strong className="text-white">{group?.name}</strong>
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white">
              {sheet.month} {sheet.year} - Expense Ledger
            </h1>
            <p className="text-xs md:text-sm text-zinc-400 mt-1">
              Opening Date: {new Date(sheet.openingDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Copy Public Link Button */}
            <button
              onClick={handleCopyLink}
              className="btn btn-secondary flex items-center gap-2"
              title="Copy Public Viewer Link"
            >
              {copied ? '✓ Link Copied!' : '📋 Copy Share Link'}
            </button>

            <Link href="/login" className="btn btn-primary text-sm">
              Account Login
            </Link>
          </div>
        </div>
      </div>

      {/* Month Navigator & Admin Permission Notice */}
      <div className="glass-panel mb-6 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <label className="font-semibold text-white text-sm whitespace-nowrap">📅 Switch Month:</label>
            <select
              value={sheet._id}
              onChange={handleMonthChange}
              disabled={!allowPreviousMonthsViewer && availableSheets.length <= 1}
              className="form-control"
              style={{ minWidth: '200px', cursor: allowPreviousMonthsViewer ? 'pointer' : 'not-allowed' }}
            >
              {availableSheets.map((s: any) => (
                <option key={s._id} value={s._id}>
                  {s.month} {s.year} {s._id === sheet._id ? '(Current)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="text-xs text-zinc-400 flex items-center gap-2">
            {allowPreviousMonthsViewer ? (
              <span className="text-emerald-400 flex items-center gap-1">
                ✓ Previous months viewing enabled by group admin
              </span>
            ) : (
              <span className="text-amber-400 flex items-center gap-1">
                🔒 Previous months details are set to private by admin
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Member Expense Breakdown Table */}
      <div className="glass-panel mb-6 overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-white">Member Expense Breakdown</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Paid: {paidCount} / {entries.length} Members</p>
          </div>
        </div>

        <div className="table-container" style={{ overflowX: 'auto', width: '100%' }}>
          <table className="custom-table w-full">
            <thead>
              <tr>
                <th>Member Name</th>
                {EXPENSE_FIELDS.map(f => (
                  <th key={f.key} className="text-right">{f.label}</th>
                ))}
                <th className="text-right font-bold">Total (W/O Due)</th>
                <th className="text-right text-amber-400">Due</th>
                <th className="text-right font-bold text-purple-400">Total (With Due)</th>
                <th className="text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={13} className="text-center py-6 text-zinc-500">
                    No expense records added for this month yet.
                  </td>
                </tr>
              ) : (
                entries.map((entry: ExpenseEntry) => (
                  <tr
                    key={entry._id}
                    style={{
                      backgroundColor: entry.isPaid ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                      transition: 'background-color 0.2s ease',
                    }}
                  >
                    <td className="font-semibold text-white">
                      {entry.userId?.name || 'Unknown User'}
                    </td>
                    {EXPENSE_FIELDS.map(f => (
                      <td key={f.key} className="text-right text-zinc-300">
                        ৳{(entry as any)[f.key] || 0}
                      </td>
                    ))}
                    <td className="text-right font-semibold text-white">
                      ৳{entry.totalWithoutDue || 0}
                    </td>
                    <td className="text-right text-amber-400">
                      ৳{entry.due || 0}
                    </td>
                    <td className="text-right font-bold text-purple-300">
                      ৳{entry.totalWithDue || 0}
                    </td>
                    <td className="text-center">
                      <span className={`badge ${entry.isPaid ? 'badge-success' : 'badge-danger'}`}>
                        {entry.isPaid ? 'Paid' : 'Unpaid'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr style={{ background: 'rgba(139, 92, 246, 0.1)', fontWeight: 'bold' }}>
                <td className="text-white font-bold">TOTALS</td>
                {EXPENSE_FIELDS.map(f => (
                  <td key={f.key} className="text-right text-purple-200">
                    ৳{colTotals[f.key] || 0}
                  </td>
                ))}
                <td className="text-right text-white font-bold">
                  ৳{grandTotalWithoutDue}
                </td>
                <td className="text-right text-amber-400 font-bold">
                  ৳{totalDues}
                </td>
                <td className="text-right text-purple-300 font-extrabold text-base">
                  ৳{grandTotalWithDue}
                </td>
                <td className="text-center text-xs text-zinc-400">
                  {paidCount} Paid
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
