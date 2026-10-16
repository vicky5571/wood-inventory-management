'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Trees, Menu, X, LayoutDashboard, TableProperties, PieChart } from 'lucide-react';
import { NAV_ITEMS, resolveActiveNavSection } from './nav-config';
import { UserNav } from './UserNav';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  ledger: TableProperties,
  species: PieChart,
};

export function Navbar() {
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (pathname === '/login') return;

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const ledgerEl = document.getElementById('ledger');
      const speciesEl = document.getElementById('species');
      const dashboardEl = document.getElementById('dashboard');

      const active = resolveActiveNavSection(scrollY, {
        dashboard: dashboardEl ? dashboardEl.offsetTop : 0,
        species: speciesEl ? speciesEl.offsetTop : undefined,
        ledger: ledgerEl ? ledgerEl.offsetTop : undefined,
      });

      setActiveTab(active);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [pathname]);

  if (pathname === '/login') {
    return null;
  }

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    setActiveTab(id);
    setIsMobileMenuOpen(false);

    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.history.pushState(null, '', `#${id}`);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md transition-all">
      <div className="max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand & Facility Identity */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#ffc908]/20 text-[#101828] border border-[#ffc908]/40 shadow-2xs">
            <Trees className="w-5 h-5 text-[#b38600]" />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#101828] tracking-tight text-base leading-none">
                TimberGuard
              </span>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-[#00bb7f] border border-emerald-200">
                TPK-01 • Yard Active
              </span>
            </div>
            <span className="text-[11px] text-gray-500 font-medium mt-0.5">
              Penerimaan Kayu & Stok (木材入库与库存管理)
            </span>
          </div>
        </div>

        {/* Center: Section Navigation Tabs (Desktop) */}
        <nav
          aria-label="Section Navigation"
          className="hidden md:flex items-center gap-1 bg-gray-100/80 p-1 rounded-xl border border-gray-200/70"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = ICON_MAP[item.id];

            return (
              <a
                key={item.id}
                href={item.href}
                onClick={(e) => handleNavClick(e, item.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs transition-all ${
                  isActive
                    ? 'bg-white text-[#101828] font-bold shadow-xs border border-gray-200/90'
                    : 'text-gray-600 hover:text-[#101828] hover:bg-white/60 font-medium border border-transparent'
                }`}
              >
                {Icon && (
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#b38600]' : 'text-gray-400'}`} />
                )}
                <span>{item.labelId}</span>
                <span className="text-[10px] opacity-60">({item.labelZh})</span>
              </a>
            );
          })}
        </nav>

        {/* Right: User Profile & Session Controls */}
        <div className="flex items-center gap-2">
          <UserNav />

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? 'Tutup navigasi' : 'Buka navigasi'}
            className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white/95 px-4 py-3 flex flex-col gap-1.5 shadow-sm">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = ICON_MAP[item.id];

            return (
              <a
                key={item.id}
                href={item.href}
                onClick={(e) => handleNavClick(e, item.id)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-900 font-semibold border border-emerald-200'
                    : 'text-slate-600 hover:bg-slate-50 font-medium'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {Icon && (
                    <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                  )}
                  <span>{item.labelId}</span>
                </div>
                <span className="text-xs text-slate-400 font-normal">{item.labelZh}</span>
              </a>
            );
          })}
        </div>
      )}
    </header>
  );
}

