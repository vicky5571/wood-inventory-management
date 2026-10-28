import type { UserRoleLevel } from '../../types/index.ts';

export interface NavItemConfig {
  id: string;
  labelId: string;
  labelZh: string;
  href: string;
  minRoleLevel?: UserRoleLevel;
  maxRoleLevel?: UserRoleLevel;
}

export interface NavSectionConfig {
  id: string;
  labelId: string;
  labelZh: string;
  items: readonly NavItemConfig[];
}

export const NAV_SECTIONS: readonly NavSectionConfig[] = [
  {
    id: 'dashboard',
    labelId: 'Dashboard',
    labelZh: '概览',
    items: [
      { id: 'analytics', labelId: 'Ringkasan', labelZh: '运营概况', href: '/' },
    ],
  },
  {
    id: 'operations',
    labelId: 'Operasi Harian',
    labelZh: '日常操作',
    items: [
      { id: 'ledger', labelId: 'Buku Besar', labelZh: '入库总账', href: '/ledger' },
      { id: 'tally', labelId: 'Tally Lapangan', labelZh: '检尺录入', href: '/tally' },
      { id: 'sales', labelId: 'Penjualan', labelZh: '木材销售', href: '/sales' },
      { id: 'production', labelId: 'Produksi', labelZh: '生产', href: '/production' },
      { id: 'sorting', labelId: 'Sortir Stok', labelZh: '分拣', href: '/sorting' },
    ],
  },
  {
    id: 'stock-billing',
    labelId: 'Stok & Tagihan',
    labelZh: '库存与账单',
    items: [
      { id: 'inventory', labelId: 'Inventaris', labelZh: '库存', href: '/inventory' },
      { id: 'prices', labelId: 'Tabel Harga', labelZh: '价格表', href: '/prices' },
      { id: 'report-periods', labelId: 'Periode Laporan', labelZh: '结账周期', href: '/report-periods' },
      { id: 'payment-forms', labelId: 'Form Pembayaran', labelZh: '付款单', href: '/payment-forms' },
    ],
  },
  {
    id: 'master-data',
    labelId: 'Data Master',
    labelZh: '主数据',
    items: [
      { id: 'contracts', labelId: 'Kontrak', labelZh: '合同', href: '/contracts' },
      { id: 'suppliers', labelId: 'Pemasok', labelZh: '供应商', href: '/suppliers' },
      { id: 'brokers', labelId: 'Broker', labelZh: '中间人', href: '/brokers' },
    ],
  },
  {
    id: 'admin',
    labelId: 'Admin',
    labelZh: '系统管理',
    items: [
      { id: 'activity', labelId: 'Aktivitas', labelZh: '审计日志', href: '/activity' },
      { id: 'users', labelId: 'Pengguna', labelZh: '用户管理', href: '/users', minRoleLevel: 1 },
      { id: 'settings', labelId: 'Pengaturan', labelZh: '系统设置', href: '/settings', minRoleLevel: 1 },
    ],
  },
] as const;

export const NAV_ITEMS: readonly NavItemConfig[] = NAV_SECTIONS.flatMap((s) => s.items);

export function filterNavSections(
  sections: readonly NavSectionConfig[],
  roleLevel: UserRoleLevel | null | undefined,
): NavSectionConfig[] {
  if (roleLevel === null || roleLevel === undefined) {
    return sections.map((section) => ({
      ...section,
      items: [...section.items],
    }));
  }

  return sections
    .map((section) => {
      const filteredItems = section.items.filter((item) => {
        if (item.minRoleLevel !== undefined && roleLevel > item.minRoleLevel) {
          return false;
        }
        if (item.maxRoleLevel !== undefined && roleLevel > item.maxRoleLevel) {
          return false;
        }
        return true;
      });

      return {
        ...section,
        items: filteredItems,
      };
    })
    .filter((section) => section.items.length > 0);
}

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
