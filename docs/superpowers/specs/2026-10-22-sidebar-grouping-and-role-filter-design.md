# Design Spec: Sidebar Navigation Grouping & Role-Based Filter

**Document:** `docs/superpowers/specs/2026-10-22-sidebar-grouping-and-role-filter-design.md`
**Date:** 2026-10-22
**Status:** Draft — Pending Approval
**Related Plan:** `docs/superpowers/plans/2026-10-22-sidebar-grouping-and-role-filter.md`
**Related ADR:** ADR-0009 (Section Header grouping vs flat list), ADR-0010 (Role-based nav filter default state)
**Architecture:** Reorganize existing flat 14-item sidebar nav into 5 semantic section groups (Dashboard, Operasi Harian, Stok & Tagihan, Master Data, Admin), with non-clickable section headers for visual chunking. Add role-based filtering so Admin section hidden for non-Owner roles. Zero route or page changes.

---

## 1. Executive Summary & Problem Statement

### 1.1 Context
`src/components/layout/Sidebar.tsx` currently renders 14 nav items in 2 broad groups (OPERASIONAL + SISTEM). All 13 operational items appear flat under one header, forcing users to scan a long list.

Current grouping (from code):
- OPERASIONAL (13): analytics, ledger, pending-pricing, inventory, contracts, payment-forms, tally, sales, production, sorting, suppliers, brokers, activity
- SISTEM (1): settings

### 1.2 Business Problem
Operators report cognitive load scanning 13 items under one header. Violates Hick's Law (decision time grows logarithmically with option count) and Miller's Law (7±2 chunk limit).

Observed friction:
- Items most used by yard operators (tally, sales, production, sorting) are scattered — not clustered.
- Setup items (contracts, suppliers, brokers) mixed with daily operations.
- No visual landmarks for muscle memory navigation.
- All items visible to all roles — Admin tools (Activity, Settings) exposed to operators who can't use them.

### 1.3 Scope
- Reorganize `NAV_ITEMS` into semantic groups via new `NavSection` interface.
- Update `Sidebar.tsx` to render section headers with grouped items.
- Add role-based filter via `useAuth().user.roleLevel`.
- No new routes, no page changes, no behavior change in individual pages.

### 1.4 Non-Goals (YAGNI)
- No collapsible sections (defer to future if 20+ items emerge).
- No drag-reorder for user customization.
- No separate section for mobile vs desktop.
- No breadcrumb / secondary nav.
- No change to active-state styling or icon mapping.

---

## 2. Design Decisions

### 2.1 Section Structure (per ADR-0009)

Five semantic sections based on workflow role, ordered by frequency of access:

| # | Section ID | Label ID | Label ZH | Items | Rationale |
|---|---|---|---|---|---|
| 1 | `dashboard` | Dashboard | 概览 | Ringkasan | Entry point, single item |
| 2 | `operations` | Operasi Harian | 日常操作 | Buku Besar, Tally Lapangan, Penjualan, Produksi, Sortir Stok | Core daily workflow — 80% of operator time |
| 3 | `stock-billing` | Stok & Tagihan | 库存与账单 | Inventaris, Pending Harga, Form Pembayaran | Follow-up state views |
| 4 | `master-data` | Data Master | 主数据 | Kontrak, Pemasok, Broker | Setup once, edit periodically |
| 5 | `admin` | Admin | 系统管理 | Aktivitas, Pengaturan | Owner-only (role-filtered) |

### 2.2 Item Ordering Within Each Section

**Dashboard:**
1. Ringkasan

**Operasi Harian** (ordered by typical daily flow):
1. Buku Besar (procurement entry)
2. Tally Lapangan (field measurement)
3. Penjualan (outbound)
4. Produksi (sawmill)
5. Sortir Stok (adjustments)

**Stok & Tagihan** (follow-up / financial cycle):
1. Inventaris
2. Pending Harga
3. Form Pembayaran

**Data Master** (setup frequency):
1. Kontrak
2. Pemasok
3. Broker

**Admin:**
1. Aktivitas
2. Pengaturan

### 2.3 Role-Based Filtering (per ADR-0010)

Section visibility rules per role level:

| Section | Owner (L1) | Staff (L2) | Monitor (L3) |
|---|---|---|---|
| Dashboard | ✓ | ✓ | ✓ |
| Operasi Harian | ✓ | ✓ | ✓ (view-only pages) |
| Stok & Tagihan | ✓ | ✓ | ✓ (view-only pages) |
| Data Master | ✓ | ✓ | ✓ (view-only pages) |
| Admin | ✓ | **hidden** | ✓ (Activity only, Settings hidden) |

**Rationale:**
- Page-level RBAC already handled by page components (unchanged).
- Nav filter is **UX convenience** — hide items users can't meaningfully use.
- Staff Level 2 (operator) doesn't need Settings or Activity Log in sidebar — clutter removal.
- Monitor Level 3 (auditor) needs Activity Log but not Settings.

**Filter granularity:** Per-item within section (not just whole section hidden), to allow Monitor Level 3 to see Activity but not Settings in Admin section.

Enhanced per-item role filter via new field:

```ts
interface NavItemConfig {
  id: string;
  labelId: string;
  labelZh: string;
  href: string;
  minRoleLevel?: UserRoleLevel;  // NEW: hide item if user.roleLevel > this value
  maxRoleLevel?: UserRoleLevel;  // NEW: hide item if user.roleLevel < this value
}
```

Rules:
- No `minRoleLevel` / `maxRoleLevel` → visible to all roles.
- `minRoleLevel = 1` → visible only to Level 1 (Owner).
- `maxRoleLevel = 2` → visible to Level 1 + 2 (not Level 3).

Applied per-item:
- Settings: `minRoleLevel = 1` → Owner only
- Activity: visible to all (no filter)

Section auto-hidden if **all** its items are filtered out.

### 2.4 Visual Design

Section headers use existing style convention:
```jsx
<div className="px-3 mb-2 flex items-center justify-between">
  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
    {section.labelId} ({section.labelZh})
  </span>
</div>
```

Spacing between sections: `gap-6` (existing Tailwind utility, matches current OPERASIONAL/SISTEM gap).

No visual change to individual nav item rendering (same icon map, same active state, same hover).

---

## 3. Data Architecture Changes

### 3.1 Type Additions (`src/components/layout/nav-config.ts`)

```ts
import type { UserRoleLevel } from '@/src/types';

export interface NavItemConfig {
  id: string;
  labelId: string;
  labelZh: string;
  href: string;
  minRoleLevel?: UserRoleLevel;  // NEW
  maxRoleLevel?: UserRoleLevel;  // NEW
}

export interface NavSectionConfig {
  id: string;
  labelId: string;
  labelZh: string;
  items: readonly NavItemConfig[];
}
```

### 3.2 New Export: `NAV_SECTIONS`

```ts
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
      { id: 'pending-pricing', labelId: 'Pending Harga', labelZh: '待定价', href: '/pending-pricing' },
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
      { id: 'settings', labelId: 'Pengaturan', labelZh: '系统设置', href: '/settings', minRoleLevel: 1 },
    ],
  },
] as const;
```

### 3.3 Backward Compatibility

Keep `NAV_ITEMS` export (derived from `NAV_SECTIONS`) for any external consumers that may exist:

```ts
export const NAV_ITEMS: readonly NavItemConfig[] = NAV_SECTIONS.flatMap((s) => s.items);
```

### 3.4 Pure Filter Helper

```ts
export function filterNavSections(
  sections: readonly NavSectionConfig[],
  roleLevel: UserRoleLevel | null | undefined,
): NavSectionConfig[]
```

**Algorithm:**
1. If `roleLevel` is null/undefined → return sections as-is (public pages like login don't filter).
2. For each section:
   - Filter items by `minRoleLevel` / `maxRoleLevel` rules.
   - If filtered items array is empty → skip section entirely.
   - Otherwise retain section with filtered items.
3. Return filtered sections array.

Pure, deterministic, O(n) where n = total items.

---

## 4. Component Changes

### 4.1 `Sidebar.tsx` Modifications

**Replace** this block:
```tsx
const operationalItems = NAV_ITEMS.filter((item) => item.id !== 'settings');
const systemItems = NAV_ITEMS.filter((item) => item.id === 'settings');
```

**With:**
```tsx
const { user } = useAuth();
const visibleSections = useMemo(
  () => filterNavSections(NAV_SECTIONS, user?.roleLevel),
  [user?.roleLevel],
);
```

**Replace** the hardcoded 2-group render in `<nav>` body with a map:
```tsx
{visibleSections.map((section) => (
  <div key={section.id}>
    <div className="px-3 mb-2 flex items-center justify-between">
      <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
        {section.labelId} ({section.labelZh})
      </span>
    </div>
    {renderNavLinks(section.items)}
  </div>
))}
```

### 4.2 `renderNavLinks` Signature Update

Change parameter type from `typeof NAV_ITEMS` to `readonly NavItemConfig[]`:

```tsx
const renderNavLinks = (items: readonly NavItemConfig[]) => ( /* unchanged body */ );
```

### 4.3 LOC Impact

Current `Sidebar.tsx`: 238 LOC. Changes add ~15 LOC, remove ~5 LOC. Final: ~248 LOC — **still under 250 LOC limit but tight**.

If LOC becomes an issue, extract section rendering into `SidebarSection.tsx` subcomponent.

---

## 5. Non-Goals

- No collapsible sections (defer; adds state complexity for marginal value at current count).
- No drag-and-drop reorder.
- No per-user customization / preferences.
- No section-level permission (filtering is per-item only).
- No analytics tracking of nav usage.
- No tooltips or expanded descriptions on section headers.

---

## 6. Acceptance Criteria

1. Sidebar renders 5 sections (or 4 if user role filters out Admin).
2. Owner (Level 1): sees all 5 sections, all 14 items.
3. Staff (Level 2): sees Dashboard, Operasi Harian, Stok & Tagihan, Data Master, Admin (with only Activity visible — Settings hidden).
4. Monitor (Level 3): sees all 5 sections but Settings hidden under Admin.
5. Public pages (login, no auth): no filtering applied, all sections visible (user not yet authenticated).
6. Items within sections ordered per Section 2.2.
7. Section headers use existing uppercase gray-400 style.
8. Active item highlight behavior unchanged.
9. Mobile drawer displays same sectioned layout.
10. `NAV_ITEMS` backward-compat export still works.
11. All existing tests still pass.
12. `Sidebar.tsx` stays <250 LOC OR coordinator extracted if exceeds.

---

## 7. Verification Checklist (Grep-Able Audit)

### 7.1 SSOT Types
```bash
grep -c "export interface NavItemConfig" src/components/layout/nav-config.ts
grep -c "export interface NavSectionConfig" src/components/layout/nav-config.ts
# EXPECT: each 1
```

### 7.2 Section Structure
```bash
# NAV_SECTIONS exported
grep -c "export const NAV_SECTIONS" src/components/layout/nav-config.ts
# EXPECT: 1

# 5 sections defined
grep -cE "id: 'dashboard'\|id: 'operations'\|id: 'stock-billing'\|id: 'master-data'\|id: 'admin'" src/components/layout/nav-config.ts
# EXPECT: >= 5
```

### 7.3 Role Filter Helper
```bash
grep -c "export function filterNavSections" src/components/layout/nav-config.ts
# EXPECT: 1

# Settings has minRoleLevel = 1
grep -A1 "id: 'settings'" src/components/layout/nav-config.ts | grep -c "minRoleLevel: 1"
# EXPECT: 1
```

### 7.4 Backward Compatibility
```bash
grep -c "export const NAV_ITEMS" src/components/layout/nav-config.ts
# EXPECT: 1 (derived from NAV_SECTIONS via flatMap)
```

### 7.5 Sidebar Integration
```bash
grep -c "NAV_SECTIONS\|filterNavSections" src/components/layout/Sidebar.tsx
# EXPECT: >= 2

grep -c "useAuth" src/components/layout/Sidebar.tsx
# EXPECT: 1
```

### 7.6 LOC & Build
```bash
wc -l src/components/layout/Sidebar.tsx
# EXPECT: < 250

npm run drift:check && npm test && npm run build:check
# EXPECT: all green
```

### 7.7 Tests
```bash
ls test/nav-config.test.ts
node --test test/nav-config.test.ts 2>&1 | grep "fail 0"
# EXPECT: test exists and passes
```

---

## 8. Dependencies

- **Blocks:** None.
- **Blocked by:** None.
- **Related:**
  - `src/components/layout/Sidebar.tsx` (consumer of changes)
  - `src/hooks/useAuth.ts` (source of role level)
  - ADR-0009 (Section Header grouping decision)
  - ADR-0010 (Role-based filter default state decision)
