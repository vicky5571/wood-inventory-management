# ADR-0013: User Management Architecture — Phased Admin UI Foundations

**Date:** 2026-10-22
**Status:** Accepted
**Deciders:** Owner + AI pair session

---

## Context

Client requires an administrative UI to manage user lifecycle in production: create new users, change role levels, grant/revoke permission flags (currently `tallyCreate` per ADR-0012), reset passwords, deactivate users. Current state (`src/auth/users.ts`) stores users as a hardcoded `PRESET_USERS` array compiled into source — any user change requires a code edit + redeploy.

Beyond storage mechanics, four operational risks surface when admin can mutate roles/permissions in production:

1. **Session staleness** — JWT carries role/permission snapshot; demoted user retains access until session expires.
2. **Self-lockout** — admin can accidentally demote the last Level 1 or demote themselves, locking out the system.
3. **Audit gap** — no record of who changed whose role when; forensics impossible 6 months later.
4. **Permission residue** — demoting Level 2+flag user to Level 3 leaves `tallyCreate: true` orphaned on wrong role, creating semantic inconsistency.

A single "admin page" spec would bundle persistence migration, session mechanics, audit extension, and UI into one PR of unmanageable blast radius against the auth system.

---

## Decision

**Split user management into 4 sequential, independently-shippable specs with 1 shared ADR (this one) establishing architecture and invariants.**

```
Spec A: User Storage Migration    (PRESET_USERS → DB table, DAO, backward-compat login)
Spec B: Session Invalidation       (fresh user lookup OR short-expiry refresh pattern)
Spec C: Audit Log Extension        (USER_ROLE_CHANGED, USER_PERMISSION_* actions)
Spec D: Admin UI                   (list/create/edit/role/permission/password/deactivate)
```

**Execution order is strict: A → B → C → D.** D cannot ship until A, B, C merged, because it depends on all three.

**Shared invariants (binding for all 4 specs):**

1. **User ID is immutable.** `AuthUser.id` never changes after creation. All historical FKs (`InventoryTransaction.operatorId`, future `activity_log.user_id` in Spec C) remain valid across role changes.
2. **Historical records preserve role-at-time.** Activity log stores `operatorRole` as a string snapshot (already true per `activity-queries.ts`). Changing a user's current role does NOT retroactively change historical log entries.
3. **Soft delete only.** Users are deactivated (`isActive: false`), never hard-deleted. Preserves FK integrity for all historical records.
4. **Role invariants in Spec D UI:**
   - Must always exist ≥1 active Level 1 user (reject operation that would violate).
   - User cannot change their own `roleLevel` (prevent self-lockout).
   - Promote to Level 1 requires explicit confirmation UI (two-step confirm).
5. **Permission flag auto-reset on role change.** When `roleLevel` is modified, all `permissions.*` flags are cleared to `false`. Admin must re-grant explicitly. Rationale: least privilege; demotion intent is "remove access" by default.
6. **Permission flag only exposed for applicable role.** Spec D UI hides `tallyCreate` toggle for Level 1 (always true) and Level 3 (semantic mismatch, requires explicit override confirmation).
7. **No capability flag field proliferation.** Each new `permissions.*` flag added by any future spec triggers evaluation against ADR-0012 Follow-up (if 5th flag, migrate to RBAC via new ADR).
8. **No change to `UserRoleLevel` type.** Hierarchical `1 | 2 | 3` model is preserved. ADR-0010/ADR-0012 remain authoritative on role hierarchy.

---

## Rejected Alternatives

### Alternative A: Single monolithic "admin page" spec
**Rejected because:**
- Blast radius covers auth, persistence, session, audit log, UI simultaneously. One missed detail = security hole.
- Spec document would exceed 500 lines; review impractical.
- Cannot ship incrementally; nothing lands until everything lands.
- Violates project pattern — all 9 shipped features in SESSION_STATE are single-feature specs.

### Alternative B: Two specs (persistence + UI only, skip session & audit)
**Rejected because:**
- Skipping session invalidation (Spec B) means production admin can demote a user who continues writing for hours — security incident waiting to happen.
- Skipping audit (Spec C) means post-incident forensics impossible. Compliance / client-trust risk.
- Shortcut saves 2 specs now, costs multi-week debugging later.

### Alternative C: Umbrella spec + 4 sub-specs
**Rejected because:**
- Umbrella pattern is new to project; introducing it alongside 4 specs adds unfamiliar structure risk.
- This ADR already serves the "navigation" purpose an umbrella spec would — architecture + invariants + sequence are here.
- Reader workflow: ADR-0013 → Spec A → Spec B → Spec C → Spec D is linear and self-explanatory.

### Alternative D: Keep hardcoded `PRESET_USERS`, add admin UI that edits source via API
**Rejected because:**
- Writable source files from runtime is an anti-pattern (deployment immutability, atomic release, rollback).
- Does not work on serverless/read-only filesystems (Supabase hosting target).
- Fundamentally broken approach; disqualified.

### Alternative E: Fully adopt Supabase Auth (built-in user management)
**Rejected because:**
- Project uses dual-mode persistence (SQLite + Supabase). Supabase Auth only available in Supabase mode, breaking SQLite parity.
- Current auth is a thin bespoke layer (SHA-256 + session cookie); migration cost exceeds admin page value for this scope.
- Can be reconsidered as a separate ADR if authentication requirements grow (SSO, MFA, OAuth providers).

---

## Consequences

### Positive
- **Reviewable increments.** Each spec ≤ ~300 LOC, implementable in 1-2 sessions.
- **Independent shippability.** Spec A can merge and run in production before B/C/D exist — hardcoded fallback preserved during migration.
- **Clear security boundary per phase.** Spec B explicitly addresses session staleness; Spec C explicitly addresses audit; neither is deferred as "we'll do it later".
- **Shared invariants prevent drift.** Future spec authors read ADR-0013 and know the rules (immutable ID, soft delete, auto-reset flags, etc.) without rediscovering them.
- **Compatible with existing commits.** Current `PRESET_USERS` + `permissions.tallyCreate` design (commit `d4d05d3`) remains valid; Spec A migrates it into DB with same shape.

### Negative / Trade-offs
- **4 specs ≠ 1 week of work.** Total scope is multi-week. Owner must accept delivery timeline.
  - Mitigation: Each spec deliverable independently useful; Spec A alone enables Owner to add users via DB script without redeploy, even before UI exists.
- **Dependency chain.** D cannot ship until A+B+C done. Skipping any of A/B/C to accelerate D re-introduces the risk that spec was designed to prevent.
  - Mitigation: Documented strict order. ADR explicitly refuses D-first approach.
- **ADR-0010 hierarchical invariant still partially leaky.** Permission flag `tallyCreate` already orthogonal (ADR-0012); this ADR preserves that trade-off without resolving it.
  - Mitigation: ADR-0012 Follow-up triggers RBAC migration at 5th flag; this ADR does not change that threshold.
- **Session invalidation (Spec B) will add latency.** Fresh DB lookup per request adds ~1-5ms per authenticated request. Short-expiry refresh pattern adds client-side complexity instead.
  - Mitigation: Spec B evaluates trade-off explicitly; decision deferred to that spec.

### Follow-up Obligations
- **Each sub-spec (A/B/C/D) MUST reference this ADR** and confirm compliance with invariants 1-8.
- **If any invariant conflicts with implementation reality during Spec A-D execution,** STOP and amend this ADR via new ADR (supersede or clarify) before proceeding.
- **If Spec B evaluates session invalidation and determines a strategy,** that strategy becomes a new ADR (ADR-0014?) because it affects every authenticated request.
- **If a 5th `permissions.*` flag is proposed during Spec D UI design,** trigger RBAC migration ADR before implementing Spec D.
- **Supabase Auth adoption** remains open as future consideration if auth requirements grow (SSO/MFA). Document deliberately deferred.

---

## References

- Spec A: `docs/superpowers/specs/2026-10-22-user-storage-migration-design.md` (to be written this session)
- Spec B: TBD — `docs/superpowers/specs/YYYY-MM-DD-session-invalidation-design.md`
- Spec C: TBD — `docs/superpowers/specs/YYYY-MM-DD-user-audit-log-extension-design.md`
- Spec D: TBD — `docs/superpowers/specs/YYYY-MM-DD-admin-user-management-ui-design.md`
- Related:
  - ADR-0010 (Role-Based Nav Filter) — hierarchical role invariant
  - ADR-0012 (Tally Create Permission Flag) — orthogonal capability pattern, 5-flag RBAC trigger
  - ADR-0001 (Dual-Mode Persistence) — SQLite + Supabase storage parity requirement
  - `src/auth/users.ts` — current `PRESET_USERS` to be migrated
  - `src/auth/session.ts` — session layer impacted by Spec B
  - `src/persistence/sqlite/migrations.ts` — schema target for Spec A
  - `src/persistence/sqlite/activity-queries.ts` — audit log target for Spec C
