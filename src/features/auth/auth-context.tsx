import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { ApiError, setAuthToken } from '@/services/api';
import { storage } from '@/services/storage';
import { type Member } from '@/types';

import { authApi } from './auth-api';

const TOKEN_KEY = 'healthmatrix.token';
const MEMBER_KEY = 'healthmatrix.member';

type AuthContextValue = {
  token: string | null;
  member: Member | null;
  isLoading: boolean;
  signIn: (token: string, member: Member) => Promise<void>;
  signOut: () => Promise<void>;
  /** Replaces the signed-in member after a profile change. */
  updateMember: (member: Member) => Promise<void>;
  /** Fetches the member again. Only a rejected token signs out; being offline does not. */
  refreshMember: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function parseMember(json: string | null): Member | null {
  try {
    return json ? (JSON.parse(json) as Member) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clear = useCallback(async () => {
    await Promise.all([storage.remove(TOKEN_KEY), storage.remove(MEMBER_KEY)]);
    setAuthToken(null);
    setToken(null);
    setMember(null);
  }, []);

  const refreshMember = useCallback(
    () =>
      authApi
        .me()
        .then(({ member: fresh }) => {
          setMember(fresh);
          return storage.set(MEMBER_KEY, JSON.stringify(fresh));
        })
        .catch((error) => {
          if (error instanceof ApiError && error.status === 401) return clear();
        }),
    [clear],
  );

  useEffect(() => {
    (async () => {
      const [storedToken, storedMember] = await Promise.all([
        storage.get(TOKEN_KEY),
        storage.get(MEMBER_KEY),
      ]);
      const cached = parseMember(storedMember);
      // A token without a saved member is from before sign-in talked to the API.
      if (!storedToken || !cached) {
        if (storedToken) await clear();
        return;
      }
      setAuthToken(storedToken);
      setToken(storedToken);
      setMember(cached);

      // Open straight away from the saved copy, then refresh it.
      void refreshMember();
    })().finally(() => setIsLoading(false));
  }, [clear, refreshMember]);

  const signIn = async (nextToken: string, nextMember: Member) => {
    await Promise.all([
      storage.set(TOKEN_KEY, nextToken),
      storage.set(MEMBER_KEY, JSON.stringify(nextMember)),
    ]);
    setAuthToken(nextToken);
    setToken(nextToken);
    setMember(nextMember);
  };

  const signOut = async () => {
    // End the session on the server too, but never keep someone signed in because it failed.
    await authApi.logout().catch(() => undefined);
    await clear();
  };

  const updateMember = async (next: Member) => {
    setMember(next);
    await storage.set(MEMBER_KEY, JSON.stringify(next));
  };

  return (
    <AuthContext.Provider
      value={{ token, member, isLoading, signIn, signOut, updateMember, refreshMember }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}
