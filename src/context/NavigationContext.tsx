'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

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
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear pending target when destination pathname is reached
  useEffect(() => {
    setTargetHref(null);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [pathname]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const navigateTo = useCallback(
    (href: string) => {
      // Ignore navigation if already on the requested page or already transitioning to it
      if (href === pathname || href === targetHref) {
        return;
      }

      setTargetHref(href);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Safety timeout: reset targetHref if transition takes longer than 6 seconds
      timeoutRef.current = setTimeout(() => {
        setTargetHref(null);
      }, SAFETY_TIMEOUT_MS);

      // Trigger Next.js router transition in parallel
      router.push(href);
    },
    [pathname, targetHref, router]
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
