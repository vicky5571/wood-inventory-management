# ADR-0010: Role-Based Nav Filter Default State

**Date:** 2026-10-22
**Status:** Accepted
**Deciders:** Owner + AI pair session

---

## Context

Project has 3 role levels (per `useAuth`):
- **Level 1 (Owner)**: full CRUD
- **Level 2 (Staff)**: view most things, write where applicable
- **Level 3 (Monitor/Auditor)**: view-only

Page-level RBAC already enforced in each page component. The question is **whether sidebar should also filter nav items** based on role.

Two concerns:
1. **UX clutter** — Staff/Monitor roles see Settings in nav but can't access it meaningfully.
2. **Security vs convenience** — hiding nav != security (direct URL still works). Nav filter is purely UX hygiene, not access control.

---

## Decision

**Add per-item role filter via optional `minRoleLevel` / `maxRoleLevel` fields on `NavItemConfig`.**

```ts
interface NavItemConfig {
  id: string;
  labelId: string;
  labelZh: string;
  href: string;
  minRoleLevel?: UserRoleLevel;  // Hide item if user.roleLevel > this value
  maxRoleLevel?: UserRoleLevel;  // Hide item if user.roleLevel < this value
}
```

**Default (no filter fields):** item visible to all roles including unauthenticated contexts.

**Applied filter rules (initial):**
- `Settings`: `minRoleLevel: 1` → Owner only
- All other items: no filter (visible to all roles)

**Section auto-hide:** if all items in a section are filtered out, the section header is also hidden.

**Null role handling:** when `useAuth().user` is null (SSR, login page, pre-auth), filter is **skipped entirely** — all items shown. Rationale: avoid flashing changes when auth state resolves.

---

## Rejected Alternatives

### Alternative A: Hide entire sections based on role
**Rejected because:**
- Section-level filter is too coarse — Admin section has Activity (useful for Level 3 Monitor) AND Settings (Owner only). Must be per-item.
- Section auto-hide (when all items filtered) handles the empty-section case cleanly.

### Alternative B: Separate `visibleTo: ['owner', 'staff']` enum
**Rejected because:**
- Role names (`owner`, `staff`, `monitor`) are not canonical in the codebase — only numeric levels (1/2/3).
- String union adds translation complexity: `labelZh` already in use for i18n; adding role display names doubles the surface.
- Numeric comparison with `minRoleLevel: 1` is unambiguous and matches `UserRoleLevel` type.

### Alternative C: Centralized permissions table (separate module)
**Rejected because:**
- Over-engineered for 1 filtered item (Settings). Centralized permissions become valuable at 10+ filtered items.
- Co-locating filter field with nav config keeps related data together.
- Can refactor to centralized table later if filtering proliferates.

### Alternative D: Rely on page-level RBAC only, no nav filter
**Rejected because:**
- Operator sees Settings in sidebar, clicks it, gets access-denied error. Poor UX.
- Clutter: Staff/Monitor sidebars have one more useless item.
- Nav filter is UX hygiene; page-level RBAC is security — both coexist.

### Alternative E: Hide sidebar entirely for Monitor
**Rejected because:**
- Monitor still navigates between view-only pages. Needs sidebar.
- Over-reaction to a small clutter issue.

---

## Consequences

### Positive
- **Reduced clutter** for non-Owner roles (currently -1 item each, scalable to more).
- **Clear visual signal** — if an item appears in nav, user can at least navigate to it.
- **Consistent with security model** — nav visibility == meaningful UX access.
- **Minimal API surface** — two optional fields, no new concepts.
- **Opt-in by default** — items without role fields are visible to all. No accidental hiding.

### Negative / Trade-offs
- **Not security** — hiding nav doesn't prevent direct URL access. Users could bookmark `/settings` and reach it. Page-level RBAC is the only true gate.
  - Mitigation: Documented explicitly. Nav filter is UX hygiene, not security.
- **Null user flashes visible items** — during auth check (SSR → client hydration), roleLevel is null → all items shown briefly. Then filter applies when auth resolves.
  - Mitigation: Acceptable trade-off vs flashing items disappearing. Alternative (hide everything until auth resolves) worse UX.
- **Field proliferation risk** — if filter rules grow complex (e.g., time-based, feature-flag-based), two optional fields won't scale.
  - Mitigation: Current scope is role-level only. Future complexity triggers refactor to centralized permissions module.
- **Role-level numeric comparison is semantic coupling** — assumes Level 1 > Level 2 > Level 3 in permissions hierarchy. True today, but if roles become orthogonal (e.g., "Finance" ≠ "Operations"), numeric comparison breaks.
  - Mitigation: Current role model is strictly hierarchical per `AGENTS.md`. If orthogonal roles introduced, revisit via new ADR.

### Follow-up Obligations
- If 5+ items need role filtering, consider extracting to centralized permissions table.
- If role model changes to non-hierarchical (orthogonal), supersede this ADR.
- Current filter is **sidebar only** — if other UI surfaces need role-based rendering (menus, dashboards), apply same pattern or extract shared utility.
- When adding new nav items, document any role filter decision in the item's own spec / ADR, not inline in nav-config.

---

## References

- Spec: `docs/superpowers/specs/2026-10-22-sidebar-grouping-and-role-filter-design.md` Section 2.3
- Plan: `docs/superpowers/plans/2026-10-22-sidebar-grouping-and-role-filter.md`
- Related:
  - ADR-0009 (Sidebar Section Grouping — complementary decision)
  - `src/hooks/useAuth.ts` (source of `roleLevel`)
  - Role model: `UserRoleLevel = 1 | 2 | 3` in `src/types/index.ts`
