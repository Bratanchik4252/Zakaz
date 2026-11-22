'use client';

import { useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AuthUser } from '@vp/shared';
import {
  API_URL,
  apiFetch,
  onSessionChange,
  refreshSession,
  setAccessToken,
} from './api';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: () => void;
  logout: () => Promise<void>;
  completeLogin: (token: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onSessionChange((session) => {
      if (session) {
        setUser(session.user);
      }
    });

    void refreshSession().finally(() => setLoading(false));

    return unsubscribe;
  }, []);

  const login = useCallback(() => {
    window.location.href = `${API_URL}/auth/google`;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {
      // ignore network errors on logout
    }
    setAccessToken(null);
    setUser(null);
    router.push('/');
  }, [router]);

  const completeLogin = useCallback(async (token: string) => {
    setAccessToken(token);
    const me = await apiFetch<AuthUser>('/users/me');
    setUser(me);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout, completeLogin }),
    [user, loading, login, logout, completeLogin],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
