# ADR-0012: Tally Create Permission Flag (Orthogonal to Role Level)

**Date:** 2026-10-22
**Status:** Accepted
**Deciders:** Owner + AI pair session

---

## Context

Client reports a real-world need: one warehouse staff member (nominally a Level 2 user) must be able to write Tally Lapangan manifests. Current permission model (`src/hooks/useAuth.ts`) is strictly hierarchical by numeric `roleLevel`:

- `canWrite = roleLevel === 1` (Level 1 Owner only)
- `canViewAll = roleLevel === 1 || roleLevel === 2`
- `isMonitorOnly = roleLevel === 3`

The warehouse user needs write access **only** at `/tally` (create manifest), while retaining Level 2 visibility (full read, no finance writes elsewhere). No other write surfaces (sales, pricing, settings) are affected. Client confirmed this is one user today; may be a handful later; no broader RBAC migration planned.

ADR-0010 Section "Follow-up Obligations" explicitly flagged: *"If role model changes to non-hierarchical (orthogonal), supersede this ADR."* This decision is the first orthogonal capability on top of the hierarchical role model.

---

## Decision

**Add an optional `permissions` capability object on `AuthUser`, carrying narrowly-scoped boolean flags. Introduce `tallyCreate` as the first flag.** Existing `roleLevel` semantics are preserved unchanged; the flag is additive only.

```ts
// src/types/index.ts
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  roleLevel: UserRoleLevel;         // Unchanged: 1 | 2 | 3
  title: string;
  permissions?: {                    // NEW: optional, orthogonal to roleLevel
    tallyCreate?: boolean;
  };
}

// src/hooks/useAuth.ts
export function computePermissions(user: AuthUser | null | undefined) {
  const roleLevel = user?.roleLevel;
  return {
    canWrite: roleLevel === 1,                                   // Unchanged
    canViewAll: roleLevel === 1 || roleLevel === 2,              // Unchanged
    isMonitorOnly: roleLevel === 3,                              // Unchanged
    canCreateTally: roleLevel === 1 || !!user?.permissions?.tallyCreate,  // NEW
  };
}
```

**Server guard pattern:** introduce a dedicated endpoint `POST /api/records/tally` carrying the relaxed guard (`roleLevel === 1 || permissions.tallyCreate === true`). The existing `POST /api/records` keeps its strict `roleLevel !== 1 → 403` guard untouched to prevent accidental privilege escalation on other actions (`reset`, etc.).

**Audit trail:** manifests created via tally endpoint are logged with `operatorRole = user.title` (unchanged pattern). The log already captures operator identity, so no schema change required.

---

## Rejected Alternatives

### Alternative A: Introduce a new `roleLevel: 4` (Field Tallier)
**Rejected because:**
- Breaks the hierarchical invariant `roleLevel 1 > 2 > 3` relied upon by `filterNavSections` (ADR-0010) and ≥15 call-sites using `canWrite`/`roleLevel === N` comparisons. A "field tallier" is *more* privileged than Level 2 for tally but *less* for finance — orthogonal, not hierarchical.
- Would force every existing guard to add `|| roleLevel === 4` branches, inflating surface area for drift and security regressions.
- SSOT type `UserRoleLevel = 1 | 2 | 3` would need widening; downstream numeric comparisons (`roleLevel > 2`) would silently misbehave for new value.

### Alternative B: Hardcoded userId whitelist in guard
**Rejected because:**
- `const TALLY_WRITERS = ['usr-warehouse-04']` requires code deploy to add/remove users.
- Not discoverable from user record itself — permission lives in guard code, not user data.
- Client stated staff turnover is expected; whitelist does not accommodate that gracefully.

### Alternative C: Full RBAC refactor (replace roleLevel with permissions array)
**Rejected because:**
- Overkill for one capability flag. RBAC becomes worthwhile at ≥5 orthogonal permissions × ≥3 custom roles; we have 1.
- Requires refactoring ≥15 UI call-sites + 7 API routes + JWT payload + SQLite `operator_role` column + Supabase schema + activity log operator identity. High blast radius.
- AGENTS.md invariant: *"Question speculative abstractions and premature optimization."*
- **Migration path from this ADR → RBAC remains clean:** `permissions.tallyCreate: true` maps 1:1 to future `permissions: ['tally.create']`. This ADR is not a dead-end.

### Alternative D: Separate `permissions` module / permissions table
**Rejected because:**
- Co-locating `permissions` on `AuthUser` keeps user identity + capabilities in one record, consistent with how `roleLevel` lives today.
- Separate module adds indirection with no payoff at current scale (1 flag).
- Centralized module becomes justified at ~5+ flags; revisit then.

---

## Consequences

### Positive
- **Zero disruption to existing roles.** Levels 1/2/3 behavior unchanged; `canWrite`, `canViewAll`, `isMonitorOnly` semantics preserved.
- **Narrow blast radius.** New capability is opt-in per user record; absent `permissions` field = behaves exactly as before (backward compatible).
- **Explicit audit.** Permission state visible on the user record, not hidden in guard code or env config.
- **Composable with future flags.** Adding e.g. `permissions.salesCreate` later follows the same pattern without touching role model.
- **Clean upgrade path to full RBAC.** If capability flags grow past ~5, migrate to `permissions: Permission[]` with 1:1 field mapping.

### Negative / Trade-offs
- **Dual authorization model.** Both `roleLevel` hierarchy AND `permissions` capability must be checked in some guards. Developers must know which guard belongs to which model.
  - Mitigation: `computePermissions` centralizes all derived flags. Guards must consume derived flags (`canCreateTally`), not read `permissions.tallyCreate` directly.
- **JWT payload grows.** Session token (`src/auth/session.ts`) now carries optional `permissions` object. Minor size impact; well under token size limits.
  - Mitigation: Field is optional; omitted when empty.
- **Potential for proliferation without discipline.** Adding `permissions.X` for every one-off request leads to flag soup.
  - Mitigation: Each new flag requires its own ADR + justification. If flags exceed 5, trigger RBAC migration ADR.
- **Server endpoint duplication.** New `POST /api/records/tally` partially overlaps `POST /api/records`.
  - Mitigation: Deliberate — isolates relaxed guard to one surface, reduces risk of broadening `/api/records` guard accidentally.
- **ADR-0010 numeric-comparison invariant now partially leaky.** `roleLevel` is still hierarchical for `canWrite`/`canViewAll`, but `canCreateTally` is not expressible as a pure numeric comparison.
  - Mitigation: Documented here. If orthogonal capabilities multiply, supersede ADR-0010 with a formal RBAC ADR.

### Follow-up Obligations
- **If a 5th `permissions.*` flag is proposed, open an RBAC migration ADR before implementing.** Rationale: at 5 flags, maintaining ad-hoc booleans costs more than migrating to a permissions array.
- **If orthogonal capability appears outside tally (e.g., `salesCreate`),** evaluate whether to add another flag or trigger RBAC migration based on breadth of surfaces affected.
- **Password reset / user management UI** is explicitly out of scope here. When client requests ability to rotate the warehouse user without a deploy, open a separate spec for an admin user-management module.
- **Database/Supabase schema:** current users are hardcoded in `src/auth/users.ts` (`PRESET_USERS`). No persistence change needed. When user model migrates to DB, carry `permissions` as JSONB column.

---

## References

- Spec: `docs/superpowers/specs/2026-10-22-tally-create-permission-design.md`
- Plan: `docs/superpowers/plans/2026-10-22-tally-create-permission.md`
- Related:
  - ADR-0010 (Role-Based Nav Filter) — this ADR introduces the first orthogonal capability flagged as follow-up risk in ADR-0010.
  - `src/hooks/useAuth.ts` — single source of derived permission flags
  - `src/auth/users.ts` — `PRESET_USERS` catalog
  - `src/types/index.ts` — `AuthUser`, `UserRoleLevel` SSOT
  - `app/tally/page.tsx` — primary consumer of `canCreateTally`
  - `app/api/records/route.ts` — strict guard reference (unchanged by this ADR)
