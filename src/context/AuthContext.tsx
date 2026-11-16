import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiFetch, registerUnauthorizedHandler, setStoredSessionToken } from '../lib/api';
import type { AuthUser } from '../types/common';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  login: (email: string, password: string) => Promise<AuthUser>;
  signup: (payload: {
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
    location?: string;
  }) => Promise<AuthUser>;
  demoLogin: (email: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<AuthUser | null>>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const data = await apiFetch<{ user: AuthUser | null }>('/api/auth/me');
      setUser(data.user);
      if (!data.user) {
        setStoredSessionToken(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    registerUnauthorizedHandler(() => {
      setUser(null);
    });
    refreshUser();
    return () => {
      registerUnauthorizedHandler(null);
    };
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const data = await apiFetch<{ user: AuthUser; sessionToken?: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (data.sessionToken) setStoredSessionToken(data.sessionToken);
    setUser(data.user);
    return data.user;
  };

  const signup = async (payload: {
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
    location?: string;
  }) => {
    const data = await apiFetch<{ user: AuthUser; sessionToken?: string }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (data.sessionToken) setStoredSessionToken(data.sessionToken);
    setUser(data.user);
    return data.user;
  };

  const demoLogin = async (email: string) => {
    const data = await apiFetch<{ user: AuthUser; sessionToken?: string }>('/api/auth/demo', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    if (data.sessionToken) setStoredSessionToken(data.sessionToken);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try {
      await apiFetch<{ ok: boolean }>('/api/auth/logout', { method: 'POST' });
    } finally {
      setStoredSessionToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, refreshUser, login, signup, demoLogin, logout, setUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
