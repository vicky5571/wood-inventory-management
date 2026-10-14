export interface NavItem {
  id: string;
  labelId: string;
  labelZh: string;
  href: string;
}

export const NAV_ITEMS: readonly NavItem[] = [
  {
    id: 'dashboard',
    labelId: 'Dashboard',
    labelZh: '仪表板',
    href: '#dashboard',
  },
  {
    id: 'ledger',
    labelId: 'Buku Besar',
    labelZh: '入库总账',
    href: '#ledger',
  },
  {
    id: 'species',
    labelId: 'Spesies',
    labelZh: '木材种类',
    href: '#species',
  },
] as const;

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

