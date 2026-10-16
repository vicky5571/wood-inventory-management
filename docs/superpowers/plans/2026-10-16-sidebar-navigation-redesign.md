# Sidebar Navigation Redesign Implementation Plan

Replace the top horizontal navigation bar with a modern, high-contrast enterprise vertical sidebar layout for desktop, accompanied by a responsive mobile slide-out drawer.

---

## 1. Context & User Intent
- **User Preference**: "i prefer side bar instead of navbar"
- **Operational Need**: TimberGuard has expanded into a 5-page enterprise wood inventory system (`/`, `/ledger`, `/suppliers`, `/activity`, `/settings`). A left vertical sidebar provides superior vertical scanning, preserves vertical table real estate for dense timber receiving data, and keeps facility status & user credentials permanently accessible.

---

## 2. Proposed Architecture

### 2.1 File Map
- `src/components/layout/Sidebar.tsx` — Main Sidebar component supporting desktop docked view (`w-64`) and mobile drawer view (`w-72`), with categorized navigation (`OPERASIONAL` and `SISTEM`), facility status widget, and integrated user profile session bar.
- `src/components/layout/AppLayout.tsx` — Client shell that conditionally applies sidebar layout for operational routes while granting full-screen layout to `/login`.
- `app/layout.tsx` — Server root layout mounting `<AppLayout>` around children.
- `src/components/layout/Navbar.tsx` — Retained for backward-compatibility with existing regression tests.
- `test/sidebar.test.ts` — Comprehensive unit test suite for sidebar structure, navigation links, and layout contracts.

### 2.2 Visual & Interaction Specifications
- **Desktop Sidebar**:
  - Width: `w-64` (256px), `fixed inset-y-0 left-0 z-30 bg-white border-r border-gray-200/80`.
  - Header: TimberGuard brand badge (`Trees` amber icon + emerald pulse dot) + "TPK-01 • Active" live tag.
  - Subtitle: "Penerimaan Kayu & Stok (木材入库与库存管理)".
  - Menu Groups:
    - `OPERASIONAL (业务)`: Ringkasan (`/`), Buku Besar (`/ledger`), Pemasok (`/suppliers`), Aktivitas (`/activity`).
    - `SISTEM (系统)`: Pengaturan (`/settings`).
  - Active State: Amber accent bar on left (`border-l-4 border-amber-600 bg-amber-50 text-amber-950 font-bold`).
  - Inactive State: `text-gray-600 hover:text-gray-900 hover:bg-gray-100/70`.
  - Facility Widget: TPK Yard capacity indicator (`8 / 12 Kavling Terisi • 67%`).
  - Footer: User profile info with role badge and logout button (`UserNav`).
- **Mobile Header & Drawer**:
  - Mobile top bar: `h-14 lg:hidden bg-white/90 backdrop-blur-md border-b border-gray-200/80 px-4 flex items-center justify-between`.
  - Drawer: `w-72 max-w-[85vw]` slide-in panel from left with backdrop blur.
  - Body scroll lock & backdrop click dismiss.
- **Content Area**:
  - `lg:pl-64` offset to accommodate desktop fixed sidebar.
  - Preserves wide max-width (`max-w-[1600px]`) and padding (`p-4 md:p-6 lg:p-8`).

---

## 3. Step-by-Step Execution Plan

- [x] **Step 1: Write failing test in `test/sidebar.test.ts`**
  - Verify navigation grouping, route matching, and touch ergonomic contracts.
  - Run `node --test test/sidebar.test.ts` (expect failure before implementation).

- [x] **Step 2: Create `src/components/layout/Sidebar.tsx`**
  - Implement desktop sidebar and mobile drawer.
  - Wire navigation groups using `NAV_ITEMS` and `isNavItemActive`.
  - Integrate yard capacity indicator and `UserNav`.

- [x] **Step 3: Create `src/components/layout/AppLayout.tsx`**
  - Client component checking `usePathname()`.
  - Exempt `/login` from sidebar and padding offset.
  - Wrap application pages with `Sidebar` and `lg:pl-64` content wrapper.

- [x] **Step 4: Update `app/layout.tsx`**
  - Replace `<Navbar />` with `<AppLayout>{children}</AppLayout>`.

- [x] **Step 5: Run Automated Tests & Type Checks**
  - Execute `npm test` (all 154 tests passing).
  - Execute `npx tsc --noEmit` (0 errors).

- [x] **Step 6: Live Server Verification**
  - Verify routes `/`, `/ledger`, `/suppliers`, `/activity`, `/settings`, `/login` with curl and browser checks.
