# Design Spec: DAO Inactive-User Lookup Method

**Document:** `docs/superpowers/specs/2026-10-22-dao-inactive-user-lookup-design.md`
**Date:** 2026-10-22
**Status:** Draft — Pending Approval
**Related Plan:** TBD — `docs/superpowers/plans/2026-10-22-dao-inactive-user-lookup.md`
**Related ADR:** ADR-0013 (User Management Architecture)
**Resolves:** TD-002 (session failure-reason disambiguation uses O(N) scan)
**Architecture:** Add `findByIdIncludingInactive(id): Promise<UserRecordRow | null>` method to `UserRepository` DAO. Refactor 3 existing call-sites that currently work around this gap via `listAll` scan. Zero behavior change externally; replace O(N) with O(1) indexed lookup.

---

## 1. Executive Summary & Problem Statement

### 1.1 Context

Spec A `UserRepository.findById(id)` deliberately filters active users only (`WHERE is_active = 1`). This is correct for auth lookup (deactivated users must not authenticate).

However, 3 call-sites need to look up a user **regardless of active state** to make correct decisions:

| Call-site | File | Line | Why needs inactive lookup |
|---|---|---|---|
| 1 | `src/auth/session.ts` | 171-178 | Distinguish `USER_INACTIVE` vs `USER_NOT_FOUND` after `findById` returns null |
| 2 | `src/persistence/user-repository-audited.ts` | 79-83 | `update` must detect reactivation transition (`isActive: false → true`) — fail-safe when target was inactive |
| 3 | `src/persistence/user-repository-audited.ts` | 92-96 | `deactivate` captures `previousRoleLevel` from existing row even if someone else deactivated the user concurrently |

All 3 currently use the same workaround:

```ts
let existing = await this.inner.findById(id);
if (!existing) {
  const all = await this.inner.listAll({ includeInactive: true });
  existing = all.find((u) => u.id === id) ?? null;
}
```

### 1.2 Problem

`listAll({ includeInactive: true })` is **O(N) full table scan**. At 4 users this is negligible. At 100 deactivated users with frequent reactivation attempts (expected Spec D admin UI flow), each call allocates and iterates the full user list.

**Scalability smell, not current bug.** Recorded as TD-002 in SESSION_STATE on 2026-10-22. Finding reinforced during Spec C code review — pattern now exists at 3 call-sites, growing with each new admin feature. Earlier fix = lower refactor cost.

### 1.3 Business Requirement

- Session verification correctly distinguishes `USER_INACTIVE` vs `USER_NOT_FOUND` at O(1) cost.
- Audited wrapper reactivation and deactivation paths work on inactive users at O(1) cost.
- Spec D admin UI (future) gets a direct DAO primitive for inspecting any user by id without active filter.

### 1.4 Scope
- Add `findByIdIncludingInactive(id): Promise<UserRecordRow | null>` method to abstract `UserRepository` class.
- Implement in SQLite impl (`user-repository-sqlite.ts`) using indexed PK lookup without `is_active` filter.
- Implement in Supabase impl (`user-repository-supabase.ts`) using PostgREST `?id=eq.<id>` without active filter.
- Refactor 3 call-sites to use new method.
- Add tests for new method.
- Zero schema change.

### 1.5 Non-Goals (YAGNI)
- No change to `findById` semantics (still active-only — the common path).
- No change to `findByEmail` (also active-only — correct for auth).
- No new filter options or query builders.
- No admin UI (Spec D).
- No DAO-level cache (orthogonal concern).
- No audit log emission from the new method (read ops don't log per Spec C decision).

---

## 2. Design Decisions

### 2.1 Method Signature

```ts
// src/persistence/user-repository.ts
export abstract class UserRepository {
  // ... existing methods unchanged ...

  /**
   * Looks up a user by id regardless of active state.
   * Returns the user record even if soft-deleted (`isActive: false`).
   * Use for admin flows that need to inspect, reactivate, or audit any user.
   *
   * For auth lookup (login, session verification) use `findById` instead
   * (active-only, deactivated users are correctly treated as not-found).
   */
  abstract findByIdIncludingInactive(id: string): Promise<UserRecordRow | null>;
}
```

**Rationale for separate method (not opts param on `findById`):**
- Explicit intent at call-site: reader immediately sees whether active filter applies.
- Prevents accidental "I'll just add `{ includeInactive: true }` to findById" in future auth code.
- Follows pattern of `listAll({ includeInactive })` which is already separate from authenticated listing.
- Zero risk of changing default behavior for existing callers.

### 2.2 SQLite Implementation

```ts
// src/persistence/user-repository-sqlite.ts
async findByIdIncludingInactive(id: string): Promise<UserRecordRow | null> {
  const row = this.db.prepare(`
    SELECT * FROM users WHERE id = ?
  `).get(id) as SqliteUserRow | undefined;
  if (!row) return null;
  return mapRowToUserRecord(row);
}
```

Uses PK index (`id TEXT PRIMARY KEY`). O(log N) at worst, O(1) in SQLite's B-tree. Immediate.

### 2.3 Supabase Implementation

```ts
// src/persistence/user-repository-supabase.ts
async findByIdIncludingInactive(id: string): Promise<UserRecordRow | null> {
  const { data, error } = await this.client
    .from('users')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapSupabaseRowToUserRecord(data);
}
```

Uses PK index server-side. One network round-trip. No active filter.

### 2.4 Call-Site Refactor

**Before (`src/auth/session.ts` lines 171-178):**
```ts
try {
  const allUsers = await repo.listAll({ includeInactive: true });
  const userExists = allUsers.some((u) => u.id === payload.userId);
  return { user: null, reason: userExists ? 'USER_INACTIVE' : 'USER_NOT_FOUND' };
} catch {
  return { user: null, reason: 'USER_NOT_FOUND' };
}
```

**After:**
```ts
try {
  const anyUser = await repo.findByIdIncludingInactive(payload.userId);
  return { user: null, reason: anyUser ? 'USER_INACTIVE' : 'USER_NOT_FOUND' };
} catch {
  return { user: null, reason: 'USER_NOT_FOUND' };
}
```

**Before (`src/persistence/user-repository-audited.ts` lines 79-83 and 92-96, two identical blocks):**
```ts
let existing = await this.inner.findById(id);
if (!existing) {
  const all = await this.inner.listAll({ includeInactive: true });
  existing = all.find((u) => u.id === id) ?? null;
}
if (!existing) throw new UserNotFoundError(id);
```

**After (both blocks):**
```ts
const existing = await this.inner.findByIdIncludingInactive(id);
if (!existing) throw new UserNotFoundError(id);
```

Reduces 5 lines to 2 per site; removes `listAll` dependency; removes mutable `let`.

### 2.5 Error Semantics (Unchanged)

- `findByIdIncludingInactive(nonExistentId)` → returns `null` (not throws).
- DB errors (connection, SQL) → throws per existing DAO pattern.
- Consistent with `findById` and `findByEmail` null-on-miss convention.

### 2.6 Backward Compatibility

- `findById`, `findByEmail`, `listAll`, `create`, `update`, `deactivate`, `upsertSeed` all unchanged.
- No API contract change at HTTP layer (no new endpoint, no response shape change).
- Session verification outcomes identical from caller perspective (same `AuthResult` shape, same reasons).
- Audited wrapper behavior identical (same log entries emitted, same errors thrown).
- Fresh JWT tokens, existing JWT tokens all continue to work.

### 2.7 What This Spec Does NOT Change

- `AuthUser` SSOT shape — unchanged.
- `ActivityLogEntry` shape — unchanged.
- `UserRecordRow` shape — unchanged.
- `users` table schema (SQLite + Supabase) — unchanged.
- `verifySessionToken`, `createSessionToken`, `getAuthenticatedUser(Detailed)` external signatures — unchanged.
- All API routes — unchanged.
- Seeder (`ensureSeedUsers`) — unchanged (continues to use raw repo).

---

## 3. API Contract

No HTTP API changes. Internal DAO method addition only.

---

## 4. Acceptance Criteria

### 4.1 Functional
- [ ] `findByIdIncludingInactive(activeUserId)` → returns `UserRecordRow` with `isActive: true`.
- [ ] `findByIdIncludingInactive(deactivatedUserId)` → returns `UserRecordRow` with `isActive: false`.
- [ ] `findByIdIncludingInactive(nonExistentId)` → returns `null`.
- [ ] `findByIdIncludingInactive` does NOT emit any audit log entry (read op).
- [ ] Session `getAuthenticatedUserDetailed` still returns `USER_INACTIVE` when userId exists but is inactive.
- [ ] Session `getAuthenticatedUserDetailed` still returns `USER_NOT_FOUND` when userId has no DB row.
- [ ] `AuditedUserRepository.update(id, { isActive: true })` on previously-inactive user → still emits `USER_REACTIVATED` log entry.
- [ ] `AuditedUserRepository.deactivate(inactiveUserId)` → still throws `UserNotFoundError` wait, DOES NOT throw if user exists even if inactive. Verify behavior preserved: deactivate on already-inactive user is idempotent (per Spec A §2.7).

### 4.2 Non-Functional
- [ ] All 857+ existing tests still pass.
- [ ] 2 new tests added (SQLite + Supabase mock) for `findByIdIncludingInactive`.
- [ ] No `listAll({ includeInactive: true })` call remains in `src/auth/session.ts` or `src/persistence/user-repository-audited.ts` after refactor (grep confirms zero occurrences).
- [ ] `src/persistence/user-repository.ts` LOC change: +~8 LOC (abstract method + JSDoc).
- [ ] `src/persistence/user-repository-sqlite.ts` LOC change: +~10 LOC (new method).
- [ ] `src/persistence/user-repository-supabase.ts` LOC change: +~10 LOC (new method).
- [ ] `src/persistence/user-repository-audited.ts` LOC change: ~-10 LOC net (shorter lookup pattern in 2 spots).
- [ ] `src/auth/session.ts` LOC change: ~-5 LOC net (shorter disambiguation).
- [ ] No new drift violations.

### 4.3 Backward Compatibility
- [ ] All Spec B test file (`test/session-invalidation.test.ts`) still passes without modification.
- [ ] All Spec C test file (`test/user-repository-audited.test.ts`) still passes without modification.
- [ ] All Spec A test file (`test/user-repository.test.ts`) still passes without modification.
- [ ] Login flow + auth lookup unchanged.

---

## 5. Verification Checklist

- [ ] `npm run drift:check` → `✅ No drift detected`
- [ ] `npm test` → `pass N, fail 0` where N ≥ 857 + 2 (= 859+)
- [ ] `npm run build:check` → 0 TypeScript errors
- [ ] New test cases in `test/user-repository.test.ts` (or new file):
  - [ ] `findByIdIncludingInactive(activeId)` → row with `isActive: true`
  - [ ] `findByIdIncludingInactive(inactiveId)` → row with `isActive: false`
  - [ ] `findByIdIncludingInactive('nonexistent')` → null
- [ ] Grep assertion: `grep -rn "listAll.*includeInactive" src/auth/ src/persistence/user-repository-audited.ts` → **zero matches** after refactor.
- [ ] Manual QA:
  - Deactivate a user via SQL: `UPDATE users SET is_active = 0 WHERE email = 'gudang@timber.id'`
  - Call `getAuthenticatedUserDetailed` with old gudang session → returns `reason: 'USER_INACTIVE'` (same as before refactor).
  - Reactivate: `UPDATE users SET is_active = 1 WHERE email = 'gudang@timber.id'`.

---

## 6. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Supabase impl mishandles PostgREST error vs no-row | Low | Low | `maybeSingle()` is the idiomatic no-throw-on-empty call. Test with real empty result. |
| Developer uses new method for auth lookup (bypasses active filter) | Medium | High | JSDoc explicitly states "For admin flows". Grep check in Spec D review. Consider lint rule later. |
| Refactor breaks reactivation detection in wrapper | Low | High | Existing Spec C tests cover reactivation scenario. Must still pass post-refactor. Phase 5 verification. |
| Session.ts regression on USER_INACTIVE vs USER_NOT_FOUND | Low | Medium | Spec B tests `test/session-invalidation.test.ts` already cover both reasons. Must pass unchanged. |
| LOC budget concerns | Low | Low | All deltas <15 LOC per file; well under 250 limit. |

---

## 7. Open Questions (None Blocking)

- Should we add a lint rule preventing `findByIdIncludingInactive` from being imported in `src/auth/`? Deferred — JSDoc + code review sufficient for current scale.
- Should we also deprecate `listAll({ includeInactive: true })` since fewer legitimate callers now exist? Deferred — admin UI (Spec D) will use it for user listings.

---

## 8. Change Log Entry Preview

```
refactor(persistence): add findByIdIncludingInactive DAO method

Resolves TD-002. Replaces O(N) listAll scan workaround in 3 call-sites
(session.ts failure-reason disambiguation + AuditedUserRepository.update
+ AuditedUserRepository.deactivate) with O(1) indexed PK lookup.

New method is admin-flow only; findById remains active-filtered for
auth lookup. Backward-compatible: no schema change, no API contract
change, no behavior change from caller perspective.

Spec: docs/superpowers/specs/2026-10-22-dao-inactive-user-lookup-design.md
Plan: docs/superpowers/plans/2026-10-22-dao-inactive-user-lookup.md
Refs: ADR-0013, TD-002
```
