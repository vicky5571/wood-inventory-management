export interface NavItem {
  id: string;
  labelId: string;
  labelZh: string;
  href: string;
}

export const NAV_ITEMS: readonly NavItem[] = [
  {
    id: 'analytics',
    labelId: 'Ringkasan',
    labelZh: '运营概况',
    href: '/',
  },
  {
    id: 'ledger',
    labelId: 'Buku Besar',
    labelZh: '入库总账',
    href: '/ledger',
  },
  {
    id: 'inventory',
    labelId: 'Inventaris',
    labelZh: '库存',
    href: '/inventory',
  },
  {
    id: 'contracts',
    labelId: 'Kontrak',
    labelZh: '合同',
    href: '/contracts',
  },
  {
    id: 'tally',
    labelId: 'Tally Lapangan',
    labelZh: '检尺录入',
    href: '/tally',
  },
  {
    id: 'sales',
    labelId: 'Penjualan',
    labelZh: '木材销售',
    href: '/sales',
  },
  {
    id: 'suppliers',
    labelId: 'Pemasok',
    labelZh: '供应商',
    href: '/suppliers',
  },
  {
    id: 'activity',
    labelId: 'Aktivitas',
    labelZh: '审计日志',
    href: '/activity',
  },
  {
    id: 'settings',
    labelId: 'Pengaturan',
    labelZh: '系统设置',
    href: '/settings',
  },
] as const;

export function isNavItemActive(itemHref: string, currentPathname: string): boolean {
  if (!currentPathname) return false;
  // Clean query params if present in currentPathname
  const cleanPath = currentPathname.split('?')[0];

  if (itemHref === '/') {
    return cleanPath === '/';
  }
  return cleanPath === itemHref || cleanPath.startsWith(`${itemHref}/`);
}

// Backward-compatibility fallback for legacy tests if needed
export function resolveActiveNavSection(
  scrollY: number,
  offsets: { dashboard?: number; species?: number; ledger?: number }
): 'dashboard' | 'ledger' | 'species' {
  const adjusted = scrollY + 120;
  if (offsets.ledger !== undefined && adjusted >= offsets.ledger) {
    return 'ledger';
  }
  if (offsets.species !== undefined && adjusted >= offsets.species) {
    return 'species';
  }
  return 'dashboard';
}
