import React, { createContext, useCallback, useEffect, useRef, useState } from 'react';
import { authService } from '../services/auth.service';
import type { AuthContextValue, AuthUser, LoginFormData } from '../types/auth.types';

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasFetched = useRef(false);

  const refreshUser = useCallback(async () => {
    try {
      const u = await authService.me();
      setUser(u);
    } catch {
      setUser(null);
    }
  }, []);

  // On mount, check if the user is already logged in (cookie exists)
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    void authService
      .me()
      .then((u) => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (data: LoginFormData) => {
    const u = await authService.login(data);
    setUser(u);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated: user !== null,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
