'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';

export default function Navbar() {
  const { currentUser, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!currentUser) return null;

  const isSystemAdmin = currentUser.role === 'admin';

  return (
    <nav className="navbar">
      <Link href="/dashboard" className="logo">
        🍽️ MessManager
      </Link>

      {/* Desktop Links - styled via .desktop-nav in globals.css */}
      <div className="desktop-nav">
        <Link href="/dashboard" className="nav-link">Dashboard</Link>
        <Link href="/groups/create" className="nav-link">+ Create Group</Link>
        {isSystemAdmin && (
          <Link href="/admin" className="nav-link" style={{ color: '#f87171' }}>Admin Panel</Link>
        )}
        <div className="user-chip">
          <div className="user-chip-info">
            <span className="user-chip-name">{currentUser.name}</span>
            <span className="user-chip-id">ID: {currentUser.userId}</span>
          </div>
          <span className={`badge ${isSystemAdmin ? 'badge-admin' : 'badge-user'}`}>
            {isSystemAdmin ? 'Admin' : 'User'}
          </span>
          <button onClick={logout} className="btn btn-secondary py-1 px-3 text-sm">
            Logout
          </button>
        </div>
      </div>

      {/* Mobile hamburger - styled via .mobile-menu-toggle in globals.css */}
      <button
        className="mobile-menu-toggle btn btn-secondary p-2"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {mobileOpen
            ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          }
        </svg>
      </button>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="mobile-menu">
          <Link href="/dashboard" className="mobile-link" onClick={() => setMobileOpen(false)}>Dashboard</Link>
          <Link href="/groups/create" className="mobile-link" onClick={() => setMobileOpen(false)}>+ Create Group</Link>
          {isSystemAdmin && (
            <Link href="/admin" className="mobile-link" style={{ color: '#f87171' }} onClick={() => setMobileOpen(false)}>Admin Panel</Link>
          )}
          <div className="mobile-user-info">
            <div className="flex flex-col">
              <span className="font-semibold text-white text-sm">{currentUser.name}</span>
              <span className="text-xs text-zinc-400 font-mono">ID: {currentUser.userId}</span>
            </div>
            <span className={`badge ${isSystemAdmin ? 'badge-admin' : 'badge-user'}`}>
              {isSystemAdmin ? 'Admin' : 'User'}
            </span>
            <button onClick={logout} className="btn btn-secondary py-1 px-3 text-sm">Logout</button>
          </div>
        </div>
      )}
    </nav>
  );
}
