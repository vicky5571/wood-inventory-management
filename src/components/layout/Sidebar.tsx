'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useNavigation } from '@/src/context/NavigationContext';
import {
  Trees,
  LayoutDashboard,
  TableProperties,
  Truck,
  Building2,
  History,
  Settings,
  ClipboardCheck,
  Menu,
  X,
  Warehouse,
  FileText,
  Users,
  Tag,
} from 'lucide-react';
import { NAV_ITEMS, isNavItemActive } from './nav-config';
import { UserNav } from './UserNav';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  analytics: LayoutDashboard, ledger: TableProperties, 'pending-pricing': Tag, inventory: Warehouse, contracts: FileText, tally: ClipboardCheck, sales: Truck,
  suppliers: Building2, brokers: Users, activity: History, settings: Settings,
};

export function Sidebar() {
  const pathname = usePathname();
  const { targetHref, navigateTo } = useNavigation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Auto-close mobile drawer on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Lock body scroll and dismiss on ESC when mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = isMobileOpen ? 'hidden' : '';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileOpen) setIsMobileOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileOpen]);

  const operationalItems = NAV_ITEMS.filter((item) => item.id !== 'settings');
  const systemItems = NAV_ITEMS.filter((item) => item.id === 'settings');
  const effectivePath = targetHref || pathname;

  const renderNavLinks = (items: typeof NAV_ITEMS) => (
    <div className="flex flex-col gap-1">
      {items.map((item) => {
        const isActive = isNavItemActive(item.href, effectivePath);
        const Icon = ICON_MAP[item.id];

        return (
          <Link
            key={item.id}
            href={item.href}
            prefetch={true}
            onClick={(e) => {
              e.preventDefault();
              setIsMobileOpen(false);
              navigateTo(item.href);
            }}
            aria-current={isActive ? 'page' : undefined}
            className={`group flex items-center justify-between text-xs sm:text-sm py-2.5 transition-all duration-200 cursor-pointer ${
              isActive
                ? 'bg-amber-50 text-amber-950 font-bold border-l-4 border-amber-600 pl-3 pr-3.5 rounded-r-xl shadow-xs'
                : 'text-gray-600 hover:text-gray-950 hover:bg-gray-100/80 font-medium px-3.5 rounded-xl'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              {Icon && (
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors duration-200 ${
                  isActive ? 'bg-amber-600 text-white shadow-xs' : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200/90 group-hover:text-gray-700'
                }`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <span className="truncate leading-tight">{item.labelId}</span>
                <span className="text-[10px] text-gray-400 font-normal leading-tight group-hover:text-gray-500">
                  {item.labelZh}
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );

  return (
    <>
      {/* 1. Mobile Top Header Bar (< lg) */}
      <header className="lg:hidden sticky top-0 z-30 w-full h-14 bg-white/95 backdrop-blur-md border-b border-gray-200/80 px-4 flex items-center justify-between shadow-xs">
        <Link
          href="/"
          onClick={(e) => { e.preventDefault(); setIsMobileOpen(false); navigateTo('/'); }}
          className="flex items-center gap-2.5 group"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-100 to-amber-200 text-[#101828] flex items-center justify-center flex-shrink-0 shadow-xs">
            <Trees className="w-4 h-4 text-amber-800" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-[#101828] text-sm tracking-tight leading-none">
                TimberGuard
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-[1px] rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                TPK-01
              </span>
            </div>
          </div>
        </Link>

        <button
          type="button"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          aria-label={isMobileOpen ? 'Tutup menu samping' : 'Buka menu samping'}
          aria-expanded={isMobileOpen}
          className="p-2 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
        >
          {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* 2. Mobile Drawer Backdrop Overlay */}
      {isMobileOpen && (
        <div
          role="presentation"
          onClick={() => setIsMobileOpen(false)}
          className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        />
      )}

      {/* 3. Main Enterprise Sidebar (Docked on Desktop, Slide-over Drawer on Mobile) */}
      <aside
        aria-label="Navigasi Samping"
        className={`
          fixed inset-y-0 left-0 z-50 lg:z-30 w-72 lg:w-64 bg-white border-r border-gray-200/80
          flex flex-col justify-between shadow-xl lg:shadow-none transition-transform duration-300 ease-in-out
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Top Brand Identity Section */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <Link
            href="/"
            onClick={(e) => { e.preventDefault(); setIsMobileOpen(false); navigateTo('/'); }}
            className="flex items-center gap-3 group cursor-pointer min-w-0"
          >
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200/90 text-[#101828] shadow-xs flex-shrink-0 group-hover:scale-105 transition-transform">
              <Trees className="w-5 h-5 text-amber-800" />
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white shadow-xs" />
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-[#101828] tracking-tight text-base leading-none">
                  TimberGuard
                </span>
                <span className="inline-flex items-center gap-1 px-1.5 py-[2px] rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  TPK-01
                </span>
              </div>
              <span className="text-[11px] text-gray-400 font-medium mt-1 truncate">
                Penerimaan Kayu & Stok (木材入库)
              </span>
            </div>
          </Link>

          {/* Close button inside mobile drawer */}
          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            aria-label="Tutup navigasi"
            className="lg:hidden p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Navigation Body */}
        <div className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-6">
          {/* Group 1: Operasional */}
          <div>
            <div className="px-3 mb-2 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                OPERASIONAL (业务)
              </span>
            </div>
            {renderNavLinks(operationalItems)}
          </div>

          {/* Group 2: Sistem */}
          <div>
            <div className="px-3 mb-2 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                SISTEM (系统)
              </span>
            </div>
            {renderNavLinks(systemItems)}
          </div>

          {/* Facility Status Card */}
          <div className="mt-auto px-3">
            <div className="rounded-xl border border-amber-200/70 bg-gradient-to-br from-amber-50/70 to-amber-100/40 p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-950 flex items-center gap-1.5">
                  <Warehouse className="w-3.5 h-3.5 text-amber-700" />
                  Status Yard TPK
                </span>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                  Aktif
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-gray-600">
                <span>Kapasitas Kavling:</span>
                <span className="font-bold text-[#101828]">8 / 12 Terisi</span>
              </div>
              <div className="w-full bg-amber-200/80 rounded-full h-1.5 overflow-hidden">
                <div className="bg-amber-600 h-1.5 rounded-full w-[67%]" />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom User Profile & Session Bar */}
        <div className="p-3 border-t border-gray-100 bg-gray-50/60">
          <UserNav />
        </div>
      </aside>
    </>
  );
}
