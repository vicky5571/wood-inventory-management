'use client';

import { useState, useEffect, useCallback } from 'react';
import type { AuthUser, LoginCredentials, UserRoleLevel } from '../types/index.ts';

export function computePermissions(roleLevel: UserRoleLevel | null | undefined) {
  return {
    canWrite: roleLevel === 1,
    canViewAll: roleLevel === 1 || roleLevel === 2,
    isMonitorOnly: roleLevel === 3,
  };
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch current session on mount
  const checkSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUser(data.user);
        return { success: true };
      }
      return { success: false, error: data.error || 'Gagal masuk.' };
    } catch {
      return { success: false, error: 'Terjadi kesalahan jaringan.' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
      setIsLoading(false);
      window.location.href = '/login';
    }
  }, []);

  const permissions = computePermissions(user?.roleLevel);

  return {
    user,
    isLoading,
    ...permissions,
    login,
    logout,
  };
}
