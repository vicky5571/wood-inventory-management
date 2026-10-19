'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

import {
  resolveNavigationIntent,
  resolvePathnameChange,
} from './navigation-state';

export interface NavigationContextValue {
  targetHref: string | null;
  isNavigating: boolean;
  navigateTo: (href: string) => void;
}

const NavigationContext = createContext<NavigationContextValue>({
  targetHref: null,
  isNavigating: false,
  navigateTo: () => {},
});

const SAFETY_TIMEOUT_MS = 6000;

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [targetHref, setTargetHref] = useState<string | null>(null);
  const targetHrefRef = useRef<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSafetyTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const armSafetyTimeout = useCallback(() => {
    clearSafetyTimeout();
    timeoutRef.current = setTimeout(() => {
      targetHrefRef.current = null;
      setTargetHref(null);
      timeoutRef.current = null;
    }, SAFETY_TIMEOUT_MS);
  }, [clearSafetyTimeout]);

  // Handle route changes when Next.js commits a page navigation
  useEffect(() => {
    if (!targetHrefRef.current) {
      return;
    }

    const { isTargetReached } = resolvePathnameChange(pathname, targetHrefRef.current);

    if (isTargetReached) {
      targetHrefRef.current = null;
      setTargetHref(null);
      clearSafetyTimeout();
    } else {
      // Intermediate route arrived; re-assert navigation to the desired target
      router.push(targetHrefRef.current);
    }
  }, [pathname, router, clearSafetyTimeout]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => clearSafetyTimeout();
  }, [clearSafetyTimeout]);

  const navigateTo = useCallback(
    (href: string) => {
      const intent = resolveNavigationIntent(pathname, targetHrefRef.current, href);

      if (intent.type === 'NOOP') {
        return;
      }

      if (intent.type === 'CANCEL') {
        targetHrefRef.current = null;
        setTargetHref(null);
        clearSafetyTimeout();
        router.push(pathname);
        return;
      }

      // Preempt in-flight navigation and transition to new target
      targetHrefRef.current = intent.targetHref;
      setTargetHref(intent.targetHref);
      armSafetyTimeout();
      router.push(intent.targetHref);
    },
    [pathname, router, armSafetyTimeout, clearSafetyTimeout]
  );

  const value: NavigationContextValue = {
    targetHref,
    isNavigating: Boolean(targetHref && targetHref !== pathname),
    navigateTo,
  };

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useNavigation(): NavigationContextValue {
  return useContext(NavigationContext);
}
