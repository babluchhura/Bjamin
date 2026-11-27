import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, ApiError, type SessionUser } from './api';

type AuthValue = {
  user: SessionUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<SessionUser>;
  register: (body: { name: string; email: string; phone: string; password: string }) => Promise<SessionUser>;
  logout: () => Promise<void>;
  setUser: (user: SessionUser | null) => void;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthValue>({
  user: null,
  loading: true,
  login: async () => {
    throw new Error('not ready');
  },
  register: async () => {
    throw new Error('not ready');
  },
  logout: async () => undefined,
  setUser: () => undefined,
  refresh: async () => undefined,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { user: current } = await api.me();
      setUser(current);
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) {
        console.error('Session check failed', error);
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      loading,
      setUser,
      refresh,
      login: async (email, password) => {
        const { user: current } = await api.login(email, password);
        setUser(current);
        return current;
      },
      register: async (body) => {
        const { user: current } = await api.register(body);
        setUser(current);
        return current;
      },
      logout: async () => {
        await api.logout();
        setUser(null);
      },
    }),
    [user, loading, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
