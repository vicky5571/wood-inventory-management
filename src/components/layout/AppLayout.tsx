'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { NavigationProvider, useNavigation } from '@/src/context/NavigationContext';
import Loading from '@/app/loading';

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { targetHref } = useNavigation();
  const isLoginPage = pathname === '/login';

  if (isLoginPage) {
    return <main className="min-h-screen">{children}</main>;
  }

  const isTransitionPending = Boolean(targetHref && targetHref !== pathname);

  return (
    <div className="min-h-screen flex flex-col bg-[#f3f4f6]">
      {/* Sidebar Navigation (Desktop docked & Mobile slide-out drawer) */}
      <Sidebar />

      {/* Main Content Workspace with Desktop Sidebar Offset */}
      <div className="flex-1 min-w-0 lg:pl-64 flex flex-col min-h-screen transition-all duration-300">
        <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 md:p-6 lg:p-8 flex flex-col gap-6">
          {isTransitionPending ? <Loading /> : children}
        </main>
      </div>
    </div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <NavigationProvider>
      <AppLayoutContent>{children}</AppLayoutContent>
    </NavigationProvider>
  );
}
