'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const { login, currentUser, loading } = useAuth() as any;
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && currentUser) router.push('/dashboard');
  }, [currentUser, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || currentUser) {
    return <div className="loading-screen"><p className="loading-text">Loading...</p></div>;
  }

  return (
    <div className="auth-screen">
      <div className="auth-card glass-panel">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-extrabold">🍽️ MessManager</h1>
          <p className="text-sm text-zinc-400 mt-2">Login to access your mess groups</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input type="email" className="form-control" value={email} onChange={e => setEmail(e.target.value)} placeholder="e.g. john@example.com" required />
          </div>
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Password</label>
            <input type="password" className="form-control" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          <button type="submit" disabled={submitting} className="btn btn-primary btn-full" style={{ padding: '0.85rem' }}>
            {submitting ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="text-sm text-center mt-5 text-zinc-400">
          Don't have an account?{' '}
          <Link href="/" className="text-purple-400 hover:text-purple-300 font-semibold">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}
