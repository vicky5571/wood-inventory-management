'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Trees,
  Menu,
  X,
  LayoutDashboard,
  TableProperties,
  Truck,
  Building2,
  History,
  Settings,
  ChevronRight,
  Warehouse,
  FileText,
  ClipboardCheck,
  Users,
} from 'lucide-react';
import { NAV_ITEMS, isNavItemActive } from './nav-config';
import { UserNav } from './UserNav';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  analytics: LayoutDashboard,
  ledger: TableProperties,
  inventory: Warehouse,
  contracts: FileText,
  tally: ClipboardCheck,
  sales: Truck,
  suppliers: Building2,
  brokers: Users,
  activity: History,
  settings: Settings,
};

export function Navbar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 });

  // Resolve current active item from pathname
  const activeItem = NAV_ITEMS.find((item) => isNavItemActive(item.href, pathname)) || NAV_ITEMS[0];
  const activeTab = activeItem.id;

  // Compute sliding indicator position from active tab ref
  const updateIndicator = useCallback(() => {
    const activeEl = tabRefs.current[activeTab];
    const container = navRef.current;
    if (activeEl && container) {
      const containerRect = container.getBoundingClientRect();
      const tabRect = activeEl.getBoundingClientRect();
      setIndicatorStyle({
        left: tabRect.left - containerRect.left,
        width: tabRect.width,
      });
    }
  }, [activeTab]);

  useEffect(() => {
    updateIndicator();
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [updateIndicator, pathname]);

  useEffect(() => {
    if (pathname === '/login') return;

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 8);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isMobileMenuOpen]);

  if (pathname === '/login') {
    return null;
  }

  return (
    <>
      <header
        className={`
          sticky top-0 z-40 w-full transition-all duration-300 ease-out
          ${isScrolled
            ? 'bg-white/90 backdrop-blur-xl shadow-[0_1px_3px_0_rgb(0_0_0/0.06),0_4px_12px_-2px_rgb(0_0_0/0.05)] border-b border-gray-200/60'
            : 'bg-white/70 backdrop-blur-md border-b border-transparent'
          }
        `}
      >
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8 h-[60px] flex items-center justify-between gap-4">
          {/* Left: Brand & Facility Identity */}
          <Link href="/" className="flex items-center gap-3 min-w-0 group cursor-pointer">
            <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200/80 text-[#101828] shadow-[0_1px_3px_0_rgb(180_83_9/0.15)] flex-shrink-0 group-hover:scale-105 transition-transform">
              <Trees className="w-[18px] h-[18px] text-amber-700" />
              {/* Pulse dot */}
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white shadow-sm" />
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#101828] tracking-tight text-[15px] leading-none whitespace-nowrap">
                  TimberGuard
                </span>
                <span className="hidden lg:inline-flex items-center gap-1 px-2 py-[3px] rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200/80 whitespace-nowrap">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  TPK-01 • Active
                </span>
              </div>
              <span className="hidden sm:block text-[11px] text-gray-400 font-medium mt-0.5 truncate">
                Penerimaan Kayu & Stok (木材入库与库存管理)
              </span>
            </div>
          </Link>

          {/* Center: Section Navigation Tabs (Desktop) — with sliding indicator */}
          <nav
            ref={navRef}
            aria-label="Primary Navigation"
            className="hidden md:flex relative items-center gap-0.5 bg-gray-100/70 p-1 rounded-xl border border-gray-200/50"
          >
            {/* Sliding active indicator */}
            <div
              className="absolute top-1 h-[calc(100%-8px)] rounded-[10px] bg-white shadow-[0_1px_3px_0_rgb(0_0_0/0.08),0_1px_2px_-1px_rgb(0_0_0/0.04)] border border-gray-200/80 transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] pointer-events-none"
              style={{
                left: `${indicatorStyle.left}px`,
                width: `${indicatorStyle.width}px`,
              }}
            />

            {NAV_ITEMS.map((item) => {
              const isActive = isNavItemActive(item.href, pathname);
              const Icon = ICON_MAP[item.id];

              return (
                <Link
                  key={item.id}
                  ref={(el) => { tabRefs.current[item.id] = el; }}
                  href={item.href}
                  className={`relative z-10 flex items-center gap-2 px-3.5 py-[7px] rounded-[10px] text-xs transition-colors duration-200 ${
                    isActive ? 'text-[#101828] font-bold' : 'text-gray-500 hover:text-[#101828] font-medium'
                  }`}
                >
                  {Icon && (
                    <Icon className={`w-3.5 h-3.5 transition-colors duration-200 ${isActive ? 'text-amber-600' : 'text-gray-400'}`} />
                  )}
                  <span className="whitespace-nowrap">{item.labelId}</span>
                  <span className="text-[10px] opacity-50 whitespace-nowrap">({item.labelZh})</span>
                </Link>
              );
            })}
          </nav>

          {/* Right: User Profile & Session Controls */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <UserNav />
            </div>

            {/* Mobile Menu Toggle Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? 'Tutup navigasi' : 'Buka navigasi'}
              aria-expanded={isMobileMenuOpen}
              className={`md:hidden relative p-2 rounded-xl transition-all duration-200 ${
                isMobileMenuOpen ? 'bg-gray-900 text-white shadow-lg shadow-gray-900/20' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <div className="relative w-5 h-5">
                <Menu className={`w-5 h-5 absolute inset-0 transition-all duration-300 ${isMobileMenuOpen ? 'opacity-0 rotate-90 scale-75' : 'opacity-100 rotate-0 scale-100'}`} />
                <X className={`w-5 h-5 absolute inset-0 transition-all duration-300 ${isMobileMenuOpen ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-75'}`} />
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Overlay + Panel */}
      <div className={`md:hidden fixed inset-0 z-[35] transition-all duration-300 ${isMobileMenuOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/30 backdrop-blur-[2px] transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setIsMobileMenuOpen(false)}
        />

        {/* Drawer Panel — slides down from top */}
        <div
          className={`absolute top-[60px] left-0 right-0 bg-white/95 backdrop-blur-xl border-b border-gray-200 shadow-[0_8px_32px_-4px_rgb(0_0_0/0.12)] transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] ${isMobileMenuOpen ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'}`}
        >
          <div className="px-4 py-4 flex flex-col gap-1">
            {NAV_ITEMS.map((item, index) => {
              const isActive = isNavItemActive(item.href, pathname);
              const Icon = ICON_MAP[item.id];

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`group flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                    isActive ? 'bg-amber-50/80 text-amber-900 font-semibold border border-amber-200/60' : 'text-gray-600 hover:bg-gray-50 font-medium border border-transparent hover:border-gray-100'
                  }`}
                  style={{ transitionDelay: isMobileMenuOpen ? `${index * 50}ms` : '0ms' }}
                >
                  <div className="flex items-center gap-3">
                    {Icon && (
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200 ${
                        isActive ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200/80 group-hover:text-gray-500'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span>{item.labelId}</span>
                      <span className="text-[11px] text-gray-400 font-normal">{item.labelZh}</span>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 transition-all duration-200 ${isActive ? 'text-amber-500 translate-x-0' : 'text-gray-300 -translate-x-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-0'}`} />
                </Link>
              );
            })}
          </div>

          {/* Mobile-only: Compact user info */}
          <div className="sm:hidden px-4 pb-4 pt-2 border-t border-gray-100">
            <UserNav />
          </div>
        </div>
      </div>
    </>
  );
}
