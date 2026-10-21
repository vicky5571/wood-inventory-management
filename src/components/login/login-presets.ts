export type LoginPresetKeyConfig = 'manager' | 'auditor' | 'director' | 'level1' | 'level2' | 'level3' | null;

export const PRESETS = [
  {
    key: 'manager' as const,
    email: 'manager@timber.id',
    password: 'password123',
    label: 'Level 1',
    name: 'Budi S.',
    badgeColor: 'text-amber-700 bg-amber-100/80',
  },
  {
    key: 'auditor' as const,
    email: 'admin@timber.id',
    password: 'password123',
    label: 'Level 2',
    name: 'Siti R.',
    badgeColor: 'text-emerald-700 bg-emerald-100/80',
  },
  {
    key: 'director' as const,
    email: 'viewer@timber.id',
    password: 'password123',
    label: 'Level 3',
    name: 'Robert T.',
    badgeColor: 'text-indigo-700 bg-indigo-100/80',
  },
] as const;

export type LoginPresetConfig = typeof PRESETS[number];
