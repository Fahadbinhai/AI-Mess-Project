'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Failed to parse current user from localStorage', e);
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to login');
    }

    localStorage.setItem('currentUser', JSON.stringify(data));
    setCurrentUser(data);
    router.push('/dashboard');
    return data;
  };

  const register = async (name, email, password) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to register');
    }

    localStorage.setItem('currentUser', JSON.stringify(data));
    setCurrentUser(data);
    router.push('/dashboard');
    return data;
  };

  const logout = () => {
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
    router.push('/login');
  };

  const refreshUser = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/users?search=${encodeURIComponent(currentUser.email)}`);
      if (res.ok) {
        const users = await res.json();
        const found = users.find(u => u.email === currentUser.email);
        if (found) {
          localStorage.setItem('currentUser', JSON.stringify(found));
          setCurrentUser(found);
        }
      }
    } catch (error) {
      console.error('Failed to refresh user data', error);
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
