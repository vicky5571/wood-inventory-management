# Plan: Sidebar Navigation Grouping & Role-Based Filter

**Date:** 2026-10-22
**Priority:** P2 (UX improvement — 14-item flat list causes cognitive load)
**Status:** COMPLETED
**Related Spec:** `docs/superpowers/specs/2026-10-22-sidebar-grouping-and-role-filter-design.md`
**Related ADR:** ADR-0009, ADR-0010

---

## 1. Context Summary

Reorganize sidebar from flat 14-item list under 2 groups (OPERASIONAL/SISTEM) into 5 semantic sections with role-based item filtering. Zero behavior change at page level — only nav presentation improves.

Design detail in spec. This plan is implementation steps.

---

## 2. Implementation Checklist

### Phase 1: SSOT Type Updates (`nav-config.ts`)
- [x] Add `UserRoleLevel` import from `@/src/types`
- [x] Extend `NavItemConfig` interface with `minRoleLevel?: UserRoleLevel` and `maxRoleLevel?: UserRoleLevel` fields
- [x] Add new interface `NavSectionConfig` with `{ id, labelId, labelZh, items }`

### Phase 2: Section Structure Export
- [x] Define `NAV_SECTIONS` constant with 5 sections (Dashboard, Operations, Stock-Billing, Master Data, Admin)
- [x] Order items within each section per spec Section 2.2
- [x] Settings item carries `minRoleLevel: 1` (Owner only)
- [x] All other items have no role filter (visible to all)
- [x] Replace existing `NAV_ITEMS` with derived export: `NAV_SECTIONS.flatMap((s) => s.items)` (backward compat)

### Phase 3: Pure Filter Helper (Test-First)
- [x] Create `test/nav-config.test.ts`:
  - [x] `filterNavSections(sections, null)` → returns all sections unchanged
  - [x] `filterNavSections(sections, undefined)` → returns all sections unchanged
  - [x] `filterNavSections(sections, 1)` → Owner sees all 5 sections, Settings visible in Admin
  - [x] `filterNavSections(sections, 2)` → Staff sees Admin with Activity only, Settings hidden
  - [x] `filterNavSections(sections, 3)` → Monitor sees Admin with Activity only, Settings hidden
  - [x] Section with all items filtered out → section removed from result
  - [x] Item with no minRoleLevel/maxRoleLevel → always visible
  - [x] Item with `maxRoleLevel: 2` → visible to Level 1 & 2, hidden from Level 3
- [x] Implement `filterNavSections` function in `nav-config.ts`
- [x] Run `node --test test/nav-config.test.ts` → 0 failures

### Phase 4: Sidebar Component Update
- [x] Edit `src/components/layout/Sidebar.tsx`:
  - [x] Import `useAuth` from `@/src/hooks/useAuth`
  - [x] Import `NAV_SECTIONS`, `filterNavSections`, type `NavItemConfig` from `./nav-config`
  - [x] Replace `operationalItems` / `systemItems` logic with `visibleSections` memo
  - [x] Update `renderNavLinks` parameter type from `typeof NAV_ITEMS` → `readonly NavItemConfig[]`
  - [x] Replace hardcoded 2-group render with `visibleSections.map(section => ...)`
  - [x] Keep existing section header style (uppercase, gray-400, tracking-wider)
  - [x] Keep existing `renderNavLinks` body (icon map, active state) unchanged
- [x] Verify LOC: `wc -l src/components/layout/Sidebar.tsx` → < 250 (233 LOC)

### Phase 5: LOC Safety Net (Conditional)
- [x] If Sidebar.tsx exceeds 250 LOC: (Not required — Sidebar.tsx is 233 LOC, under limit)

### Phase 6: Visual QA
- [x] Login as Owner (`manager@timber.id` / `password123`):
  - [x] Verify 5 sections visible: Dashboard, Operasi Harian, Stok & Tagihan, Data Master, Admin
  - [x] Verify item count: 1 + 5 + 3 + 3 + 2 = 14
  - [x] Verify item order within each section matches spec Section 2.2
- [x] Login as Staff (`admin@timber.id` / `password123`):
  - [x] Verify 5 sections visible
  - [x] Verify Settings hidden under Admin (Activity only)
  - [x] Total items visible: 13
- [x] Login as Monitor (`viewer@timber.id` / `password123`):
  - [x] Verify 5 sections visible, Settings hidden
  - [x] Total items visible: 13
- [x] Logout state (no auth, redirect handled by middleware):
  - [x] Sidebar not rendered on login page (not a concern)
- [x] Mobile drawer: open → verify same sectioned layout
- [x] Active state: click each nav item → verify amber highlight correct
- [x] Hover state: verify unchanged across all items

### Phase 7: Verification Gate
- [x] `npm run drift:check` → ✅ No new drift
- [x] `npm test` → 0 failures (762/762 passing)
- [x] `npm run build:check` → 0 TypeScript errors (Clean Next.js 15 build)
- [x] Manual smoke test completed per Phase 6
- [x] No regression in page-level content (only nav changes)

### Phase 8: Documentation Updates
- [x] Mark this plan `Status: COMPLETED` after merge
- [x] Update `docs/SESSION_STATE.md`:
  - [x] Record completion under "Recently Completed"
- [x] Append `CHANGELOG.md` entry under `[Unreleased]`:
  ```
  ### Changed
  - **Sidebar Navigation**: reorganized 14-item flat list into 5 semantic sections
    (Dashboard, Operasi Harian, Stok & Tagihan, Data Master, Admin) with
    role-based item filtering (Settings hidden from Staff/Monitor).
    Spec: docs/superpowers/specs/2026-10-22-sidebar-grouping-and-role-filter-design.md
    ADR: ADR-0009, ADR-0010
  ```

---

## 3. File Change Manifest

| File | Action | Est. Changes |
|---|---|---|
| `src/components/layout/nav-config.ts` | Modify | +~70 LOC (5 sections, 2 types, 1 filter function) |
| `src/components/layout/Sidebar.tsx` | Modify | ~15 LOC changed (replace hardcoded groups with dynamic map) |
| `src/components/layout/SidebarSection.tsx` | Create (conditional) | ~50 LOC (only if Sidebar.tsx exceeds 250 LOC) |
| `test/nav-config.test.ts` | Create | ~120 LOC (8 test cases for filter logic) |
| `docs/SESSION_STATE.md` | Modify | +5 LOC |
| `CHANGELOG.md` | Modify | +8 LOC |

**Total:** 1 modified + 1 modified + 0-1 created + 1 created + 2 docs. Zero route changes, zero page component changes.

---

## 4. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| User muscle memory broken (items in new positions) | Expected and acceptable — new order is intuitive. If feedback shows confusion, revert via git in <5 min. |
| Role filter hides item user needs | Only Settings is filtered. Owner always has access. Documented in release notes. |
| Backward compat break if external code imports `NAV_ITEMS` | Preserve `NAV_ITEMS` as derived export via `NAV_SECTIONS.flatMap(s => s.items)`. |
| Sidebar.tsx exceeds 250 LOC after changes | Phase 5 conditional extraction into `SidebarSection.tsx`. |
| `useAuth()` returns null during SSR | Spec Section 2.3 says: if roleLevel null/undefined, return sections as-is (public pages). Behavior safe. |
| Mobile drawer renders differently | Same code path (`renderNavLinks`), same `visibleSections` memo — behaves identically. |
| Section auto-hide produces empty sidebar | Impossible: Dashboard section always visible (no role filter), always has 1 item. |

---

## 5. Done Criteria

- All Phase 1-8 checkboxes ticked.
- `npm run drift:check && npm test && npm run build:check` all green.
- Manual smoke test per Phase 6 passes for all 3 role levels.
- `test/nav-config.test.ts` covers 8+ test cases.
- No regression in page-level functionality.
- Documentation updates committed (SESSION_STATE, CHANGELOG, ADR-0009, ADR-0010).
- Commit message convention:
  ```
  feat(sidebar): group 14 nav items into 5 semantic sections with role filter

  Reorganizes flat OPERASIONAL/SISTEM groups into Dashboard, Operasi Harian,
  Stok & Tagihan, Data Master, Admin. Settings hidden from Staff/Monitor
  roles via new minRoleLevel field in NavItemConfig.

  Spec: docs/superpowers/specs/2026-10-22-sidebar-grouping-and-role-filter-design.md
  Plan: docs/superpowers/plans/2026-10-22-sidebar-grouping-and-role-filter.md
  Refs: ADR-0009, ADR-0010
  ```

---

## 6. Dependencies

- **Blocks:** None.
- **Blocked by:** None.
- **Related:**
  - `src/hooks/useAuth.ts` (consumed for role level)
  - Existing tests covering nav state (`resolveActiveNavSection`, `isNavItemActive`) remain untouched — backward compat.
