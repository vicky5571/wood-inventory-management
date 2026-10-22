# Plan: DAO Inactive-User Lookup Method

**Date:** 2026-10-22
**Priority:** P2 (resolves TD-002; recommended before Spec D)
**Status:** DRAFT — Pending Approval
**Related Spec:** `docs/superpowers/specs/2026-10-22-dao-inactive-user-lookup-design.md`
**Related ADR:** ADR-0013 (User Management Architecture)
**Resolves:** TD-002

---

## 1. Context Summary

Add `findByIdIncludingInactive` DAO method and refactor 3 workaround call-sites that use `listAll` scan to disambiguate active vs inactive user lookup. O(N) → O(1). Zero schema change, zero behavior change externally.

**Pre-flight observations:**
- 3 call-sites verified via grep: `src/auth/session.ts:171`, `src/persistence/user-repository-audited.ts:79` and `:92`.
- All 3 blocks use identical pattern (`findById` → fallback `listAll({ includeInactive: true }).find(...)`).
- Spec C (just merged `cd7cc45`) added 2 of the 3 call-sites. TD-002 reinforced by this growth.
- SQLite `users` table has `id TEXT PRIMARY KEY` (verified Spec A §2.1 schema).
- Supabase `users` table also has `id TEXT PRIMARY KEY`.
- Test baseline: 857 pass, 0 fail.

---

## 2. File Manifest

| File | Action | LOC Delta | Notes |
|---|---|---|---|
| `src/persistence/user-repository.ts` | Modify | +~8 LOC | Add abstract method declaration + JSDoc |
| `src/persistence/user-repository-sqlite.ts` | Modify | +~10 LOC | Implement with indexed PK SELECT |
| `src/persistence/user-repository-supabase.ts` | Modify | +~10 LOC | Implement with PostgREST `maybeSingle()` |
| `src/persistence/user-repository-audited.ts` | Modify | ~-10 LOC net | Replace 2 duplicate blocks with 1-line calls |
| `src/auth/session.ts` | Modify | ~-5 LOC net | Replace listAll scan with findByIdIncludingInactive |
| `test/user-repository.test.ts` | Modify | +~30 LOC | Add 3 new test cases for new method |
| `CHANGELOG.md` | Modify | +8 LOC | New entry |
| `docs/SESSION_STATE.md` | Modify | ~5 LOC changed | Mark TD-002 as ✅ Resolved |

**Total:** ~61 LOC added, ~15 LOC changed, ~15 LOC removed. No file approaches god-file limit.

**Risk:** zero (small additive refactor).

---

## 3. Implementation Checklist

### Phase 1: SSOT Interface (`src/persistence/user-repository.ts`)
- [ ] Add abstract method declaration after `findById` (line 27):
  ```ts
  /**
   * Looks up a user by id regardless of active state.
   * Returns the user record even if soft-deleted (`isActive: false`).
   * Use for admin flows that need to inspect, reactivate, or audit any user.
   *
   * For auth lookup (login, session verification) use `findById` instead
   * (active-only, deactivated users are correctly treated as not-found).
   */
  abstract findByIdIncludingInactive(id: string): Promise<UserRecordRow | null>;
  ```
- [ ] Verify LOC: `wc -l src/persistence/user-repository.ts` → still < 250.

### Phase 2: SQLite Implementation (Test-First)
- [ ] Add 3 new test cases to `test/user-repository.test.ts`:
  - [ ] `findByIdIncludingInactive(activeUserId)` → returns row with `isActive: true`
  - [ ] `findByIdIncludingInactive(inactiveUserId)` → returns row with `isActive: false`
  - [ ] `findByIdIncludingInactive('nonexistent-id')` → returns null
- [ ] Run `node --test test/user-repository.test.ts` → expect 3 failures (method missing on SQLite impl, TypeScript compile error on abstract).
- [ ] Add implementation to `src/persistence/user-repository-sqlite.ts`:
  ```ts
  async findByIdIncludingInactive(id: string): Promise<UserRecordRow | null> {
    const row = this.db.prepare(`
      SELECT * FROM users WHERE id = ?
    `).get(id) as SqliteUserRow | undefined;
    if (!row) return null;
    return mapRowToUserRecord(row);
  }
  ```
- [ ] Run tests → 3 new SQLite tests pass.

### Phase 3: Supabase Implementation
- [ ] Add implementation to `src/persistence/user-repository-supabase.ts`:
  ```ts
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
- [ ] If Supabase test environment available, mirror 3 test cases. Otherwise document "manual verification in Supabase staging during Spec D".
- [ ] TypeScript compile check: `npm run build:check` → 0 errors (abstract method now implemented in both).

### Phase 4: Refactor Session.ts (TD-002 Primary Fix)
- [ ] Edit `src/auth/session.ts` lines 171-178:
  - [ ] Replace `listAll({ includeInactive: true })` block with:
    ```ts
    try {
      const anyUser = await repo.findByIdIncludingInactive(payload.userId);
      return { user: null, reason: anyUser ? 'USER_INACTIVE' : 'USER_NOT_FOUND' };
    } catch {
      return { user: null, reason: 'USER_NOT_FOUND' };
    }
    ```
- [ ] Run `node --test test/session-invalidation.test.ts` → all Spec B tests still pass (regression check).
- [ ] Verify LOC: `wc -l src/auth/session.ts` → should decrease by ~5 LOC from current 183.

### Phase 5: Refactor AuditedUserRepository (2 Spots)
- [ ] Edit `src/persistence/user-repository-audited.ts` lines 79-83 (inside `update`):
  - [ ] Replace with:
    ```ts
    const existing = await this.inner.findByIdIncludingInactive(id);
    if (!existing) throw new UserNotFoundError(id);
    ```
- [ ] Edit `src/persistence/user-repository-audited.ts` lines 92-96 (inside `deactivate`):
  - [ ] Replace with same 2-line pattern.
- [ ] Run `node --test test/user-repository-audited.test.ts` → all 15 Spec C tests still pass (regression check).
- [ ] Verify LOC: `wc -l src/persistence/user-repository-audited.ts` → should decrease by ~10 LOC from current 234.

### Phase 6: Grep Verification (Zero Remaining Workarounds)
- [ ] `grep -rn "listAll.*includeInactive" src/auth/ src/persistence/user-repository-audited.ts` → **expected: zero matches**.
- [ ] `grep -rn "listAll.*includeInactive" src/` → remaining matches must only be in: `src/persistence/user-repository.ts` (`ensureSeedUsers` function uses it for empty-DB check — legitimate) and tests. Document the remaining legitimate uses in commit message.

### Phase 7: Full Regression + Verification Gate
- [ ] `npm run drift:check` → `✅ No drift detected`
- [ ] `npm test` → `pass N, fail 0` where N ≥ 860 (857 baseline + 3 new SQLite tests)
- [ ] `npm run build:check` → 0 TypeScript errors
- [ ] All Spec A, B, C tests still pass unmodified.

### Phase 8: Manual QA (Shell)
- [ ] Backup DB: `cp data/wood_inventory.db data/wood_inventory.db.td002-backup`
- [ ] Via SQL: `UPDATE users SET is_active = 0 WHERE email = 'gudang@timber.id'`
- [ ] Via Node script: issue session token for gudang, call `getAuthenticatedUserDetailed` → verify `reason === 'USER_INACTIVE'` (not `USER_NOT_FOUND`).
- [ ] Via Node script: call `audited.update('usr-warehouse-04', { isActive: true })` → verify USER_REACTIVATED entry emitted + user is active in DB.
- [ ] Via SQL: verify forged session with `userId = 'ghost-nonexistent'` → `getAuthenticatedUserDetailed` returns `USER_NOT_FOUND`.
- [ ] Restore DB from backup.
- [ ] Cleanup backup + any Node script files.

### Phase 9: Documentation & Handoff
- [ ] Append entry to `CHANGELOG.md`:
  ```
  ### Changed
  - **DAO**: Added `findByIdIncludingInactive(id)` method to UserRepository.
    Replaces O(N) listAll scan workaround at 3 call-sites (session.ts
    failure-reason disambiguation + AuditedUserRepository.update +
    AuditedUserRepository.deactivate). Resolves TD-002. Zero behavior
    change from caller perspective; indexed PK lookup.
    Spec: docs/superpowers/specs/2026-10-22-dao-inactive-user-lookup-design.md
    Plan: docs/superpowers/plans/2026-10-22-dao-inactive-user-lookup.md
    Refs: ADR-0013, TD-002
  ```
- [ ] Update `docs/SESSION_STATE.md`:
  - Mark TD-002 as `✅ Resolved in <spec filename>`
  - Add note that both TD-001 and TD-002 now resolved; Spec D unblocked.
- [ ] Change Spec status: `Draft — Pending Approval` → `Accepted — Implemented`.
- [ ] Change Plan status: `DRAFT — Pending Approval` → `Accepted — Implemented`.
- [ ] Commit:
  ```
  refactor(persistence): add findByIdIncludingInactive, resolve TD-002

  Replaces O(N) listAll scan workaround at 3 call-sites (session.ts
  failure-reason disambiguation + AuditedUserRepository update and
  deactivate paths) with O(1) indexed PK lookup. Admin-flow only;
  findById remains active-filtered for auth lookup. Zero behavior
  change externally; zero schema change.

  Spec: docs/superpowers/specs/2026-10-22-dao-inactive-user-lookup-design.md
  Plan: docs/superpowers/plans/2026-10-22-dao-inactive-user-lookup.md
  Refs: ADR-0013, TD-002
  ```

---

## 4. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Supabase impl untested in CI | Document in commit; smoke-test during Spec D in Supabase staging |
| Developer uses new method for auth lookup | JSDoc explicit; grep check added to Spec D plan |
| Session.ts refactor accidentally breaks Spec B behavior | Re-run `test/session-invalidation.test.ts` after Phase 4 (gated) |
| Wrapper refactor breaks Spec C reactivation detection | Re-run `test/user-repository-audited.test.ts` after Phase 5 (gated) |
| LOC budget violation | All deltas small; monitor via `wc -l` after each phase |

---

## 5. Dependencies

- **Blocks:** Spec D (admin UI) — resolving TD-002 before Spec D prevents further propagation of workaround pattern.
- **Blocked by:** None. Spec C (`cd7cc45`) committed; TD-001 resolved in Spec C Phase 4; prerequisites met.
- **Related:**
  - `src/persistence/user-repository.ts` (interface)
  - `src/persistence/user-repository-sqlite.ts` (impl)
  - `src/persistence/user-repository-supabase.ts` (impl)
  - `src/persistence/user-repository-audited.ts` (consumer)
  - `src/auth/session.ts` (consumer)

---

## 6. Rollback Plan

Single `git revert`. Zero data impact. Workaround pattern restored; TD-002 reopens. < 2 minutes.

---

## 7. Done Criteria

- [ ] All Phase 1-9 checkboxes ticked.
- [ ] Verification gate: drift ✅ + test ≥ 860 pass + build ✅.
- [ ] Grep assertion Phase 6: zero `listAll({ includeInactive: true })` in session.ts or audited.ts.
- [ ] Spec + Plan status: `Accepted — Implemented`.
- [ ] TD-002 marked `✅ Resolved` in SESSION_STATE.
- [ ] Commit landed on branch `vicky`.
- [ ] No regression in Spec A/B/C test suites.
