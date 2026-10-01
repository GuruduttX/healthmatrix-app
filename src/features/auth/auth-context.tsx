import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { setAuthToken } from '@/services/api';
import { storage } from '@/services/storage';

const TOKEN_KEY = 'healthmatrix.token';

type AuthContextValue = {
  token: string | null;
  isLoading: boolean;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    storage
      .get(TOKEN_KEY)
      .then((stored) => {
        setAuthToken(stored);
        setToken(stored);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const signIn = async (next: string) => {
    await storage.set(TOKEN_KEY, next);
    setAuthToken(next);
    setToken(next);
  };

  const signOut = async () => {
    await storage.remove(TOKEN_KEY);
    setAuthToken(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}
