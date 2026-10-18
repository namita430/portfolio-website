import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, setCsrfToken, setUnauthorizedHandler } from '@/lib/api';
import type { AdminUser } from '@/types/api';
import { adminApi } from './adminApi';

interface AuthState {
  status: 'loading' | 'authed' | 'anon' | 'unavailable';
  user: AdminUser | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  retry: () => void;
}

const AuthContext = createContext<AuthState | null>(null);
const ME_KEY = ['admin', 'me'] as const;

/**
 * Session state lives on the server (HTTP-only cookie). The browser only keeps the CSRF token, in memory:
 * after a page reload it is re-fetched from /auth/me, so nothing sensitive is ever written to localStorage.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();

  const me = useQuery({
    queryKey: ME_KEY,
    queryFn: async () => {
      try {
        const session = await adminApi.me();
        setCsrfToken(session.csrfToken);
        return session;
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          setCsrfToken(null);
          return null; // not signed in
        }
        throw err;
      }
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const signOutLocally = useCallback(() => {
    setCsrfToken(null);
    qc.setQueryData(ME_KEY, null);
    qc.removeQueries({ predicate: (q) => q.queryKey[0] === 'admin' && q.queryKey[1] !== 'me' });
  }, [qc]);

  // Any 401 from a protected endpoint (expired session) returns the user to the login screen.
  useEffect(() => {
    setUnauthorizedHandler(signOutLocally);
    return () => setUnauthorizedHandler(null);
  }, [signOutLocally]);

  const login = useCallback(
    async (username: string, password: string) => {
      const session = await adminApi.login(username, password);
      setCsrfToken(session.csrfToken);
      qc.setQueryData(ME_KEY, session);
    },
    [qc],
  );

  const logout = useCallback(async () => {
    try {
      await adminApi.logout();
    } finally {
      signOutLocally();
    }
  }, [signOutLocally]);

  const value = useMemo<AuthState>(() => {
    // A signed-in user stays signed in (in the UI) even if a later background re-check fails; the server remains
    // the authority, and a real expiry arrives as a 401 from the next protected request.
    const status: AuthState['status'] = me.data ? 'authed' : me.isPending ? 'loading' : me.isError ? 'unavailable' : 'anon';
    return { status, user: me.data?.user ?? null, login, logout, retry: () => void me.refetch() };
  }, [me.isPending, me.isError, me.data, login, logout, me]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
