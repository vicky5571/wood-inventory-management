# Plan: User Audit Log Extension

**Date:** 2026-10-22
**Priority:** P1 (prerequisite for Spec D admin UI forensic safety)
**Status:** DRAFT — Pending Approval
**Related Spec:** `docs/superpowers/specs/2026-10-22-user-audit-log-extension-design.md`
**Related ADR:** ADR-0013 (User Management Architecture)
**Position in Sequence:** Plan for Spec C of (A→B→C→D). Depends on Spec A (merged `95a6fd1`). Prerequisite for Spec D.

---

## 1. Context Summary

Add 7 new `ActivityActionType` values plus typed metadata interfaces to SSOT. Introduce `AuditedUserRepository` decorator wrapping Spec A DAO. Admin API routes (Spec D) will consume wrapper to automatically emit structured audit entries. Zero schema change.

Design detail in spec. This plan is implementation steps.

**Pre-flight observations (verified before plan written):**
- `src/types/index.ts` currently 1259 LOC. Target addition ~60 LOC → ~1319 LOC. **Not under 250 LOC rule** (SSOT file is explicitly exempted; verified by drift-check history passing with current size).
- `src/persistence/user-repository.ts` currently 90 LOC. Not modified by this spec.
- `src/persistence/sqlite/activity-queries.ts` currently 203 LOC. Not modified (metadata JSON column already accommodates new payloads).
- Logger pattern confirmed: `serverRecordStore.appendActivityLog(entry)` used in 10+ existing API routes (e.g., `app/api/storage-locations/route.ts:80`, `app/api/suppliers/route.ts:69`).
- Existing test baseline: 828 pass, 0 fail. Target after Spec C: 828 + ~22 new tests.

---

## 2. File Manifest

| File | Action | LOC Estimate | Notes |
|---|---|---|---|
| `src/types/index.ts` | Modify | +~60 LOC (1259 → ~1319) | Add 7 action types + 7 metadata interfaces + `UserAuditMetadata` union + `AuditLogger` type |
| `src/utils/user-permission-diff.ts` | NEW | ~45 LOC | Pure `diffPermissions(before, after)` helper + inline unit |
| `src/persistence/user-repository-audited.ts` | NEW | ~220 LOC | `AuditedUserRepository` class extending abstract `UserRepository` + `createAuditedUserRepository` factory |
| `test/user-permission-diff.test.ts` | NEW | ~70 LOC | 7 scenarios for diff helper |
| `test/user-repository-audited.test.ts` | NEW | ~310 LOC | 15 scenarios covering all action types + no-op + actor identity + error paths |
| `CHANGELOG.md` | Modify | +8 LOC | New entry under `[Unreleased]` |
| `docs/SESSION_STATE.md` | Modify | ~15 LOC changed | Mark Spec C complete; update pickup for Spec D |

**Total:** ~725 LOC added, ~23 LOC changed. All new modules under 250 LOC budget.

**God File Risk:**
- `user-repository-audited.ts` target 220 LOC. Contingency: if ≥ 250 LOC, extract `emitUpdateLogs` method body into `src/persistence/user-audit-emitter.ts` helper (~80 LOC) and import.
- `src/types/index.ts` is SSOT; exempt from 250 LOC rule per project convention (verified by drift-baseline).

---

## 3. Implementation Checklist

### Phase 1: SSOT Type Updates (`src/types/index.ts`)
- [ ] Append 7 new values to `ActivityActionType` union (near line 747, after `SORTING_RESTORED`):
  ```ts
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_ROLE_CHANGED'
  | 'USER_PERMISSION_CHANGED'
  | 'USER_DEACTIVATED'
  | 'USER_REACTIVATED'
  | 'USER_PASSWORD_CHANGED';
  ```
- [ ] Add 7 metadata interfaces per spec §2.2 (`UserCreatedMetadata`, `UserUpdatedMetadata`, `UserRoleChangedMetadata`, `UserPermissionChangedMetadata`, `UserDeactivatedMetadata`, `UserReactivatedMetadata`, `UserPasswordChangedMetadata`).
- [ ] Add discriminated union `UserAuditMetadata`.
- [ ] Add `AuditLogger` function type:
  ```ts
  export type AuditLogger = (entry: Omit<ActivityLogEntry, 'id' | 'timestamp'>) => Promise<void>;
  ```
- [ ] Verify `UserPasswordChangedMetadata` has NO `passwordHash`/`password` fields (grep + visual confirm).
- [ ] Grep for any inline `UserAuditMetadata`-like definitions elsewhere: `grep -rn "UserAudit\|UserCreatedMetadata" src/ app/` — expect 1 match in types/index.ts only.

### Phase 2: Permission Diff Helper (Test-First)
- [ ] Create `test/user-permission-diff.test.ts`:
  - [ ] `diffPermissions(undefined, undefined)` → `[]`
  - [ ] `diffPermissions({}, {})` → `[]`
  - [ ] `diffPermissions({ tallyCreate: true }, { tallyCreate: true })` → `[]` (no-op)
  - [ ] `diffPermissions(undefined, { tallyCreate: true })` → `['granted: tallyCreate']`
  - [ ] `diffPermissions({ tallyCreate: true }, undefined)` → `['revoked: tallyCreate']`
  - [ ] `diffPermissions({ tallyCreate: true }, { tallyCreate: false })` → `['tallyCreate: true → false']`
  - [ ] `diffPermissions({ tallyCreate: true }, {})` → `['revoked: tallyCreate']` (empty object = no flags = same as undefined)
- [ ] Run `node --test test/user-permission-diff.test.ts` → expect failures (helper missing).
- [ ] Create `src/utils/user-permission-diff.ts`:
  - [ ] Pure function per spec §2.4
  - [ ] Export typed signature: `(before: UserPermissions | undefined, after: UserPermissions | undefined) => string[]`
  - [ ] Handle edge cases: `undefined`, `{}`, missing keys, value transitions
- [ ] Run tests → all pass.
- [ ] Verify LOC < 250.

### Phase 3: AuditedUserRepository (Test-First)
- [ ] Create `test/user-repository-audited.test.ts` with scenarios:
  - [ ] `create` emits 1 `USER_CREATED` entry; metadata matches `UserCreatedMetadata` shape; actor fields = constructor-supplied actor
  - [ ] `update` with name change only → 1 `USER_UPDATED` entry with `changedFields: [{ field: 'name', before, after }]`
  - [ ] `update` with email + title change (both non-role) → 1 `USER_UPDATED` with 2 changedFields
  - [ ] `update` with roleLevel change only → 1 `USER_ROLE_CHANGED` entry (NOT `USER_UPDATED`)
  - [ ] `update` with permission grant → 1 `USER_PERMISSION_CHANGED`; `changes: ['granted: tallyCreate']`
  - [ ] `update` with permission revoke → 1 `USER_PERMISSION_CHANGED`; `changes: ['revoked: tallyCreate']`
  - [ ] `update` with permissions same before/after → 0 permission entries (no-op suppressed)
  - [ ] `update` with passwordHash → 1 `USER_PASSWORD_CHANGED`; assert metadata has NO `passwordHash` key via `Object.keys(metadata)` check
  - [ ] `update` with role + name + passwordHash in one call → 3 separate entries (one per category: role, update, password)
  - [ ] `update(id, { isActive: true })` where existing.isActive=false → 1 `USER_REACTIVATED` entry (not `USER_UPDATED`)
  - [ ] `update(id, { isActive: true })` where existing.isActive=true already → 0 entries (true no-op)
  - [ ] `update(id, { name: 'x' })` where new name === existing.name → 0 entries (no-op)
  - [ ] `deactivate(id)` → 1 `USER_DEACTIVATED` entry; metadata.previousRoleLevel captured
  - [ ] `deactivate` on non-existent id → throws `UserNotFoundError`; 0 log entries
  - [ ] Logger error during `create` → log emission fails, mutation rolled back? Per spec §6: mutation committed, logger error re-thrown. Test documents actual behavior.
  - [ ] `upsertSeed` is NOT exposed on wrapper (TypeScript signature omits it)
  - [ ] `findByEmail`, `findById`, `listAll` pass through unchanged → 0 log entries for reads
- [ ] Run tests → expect failures (class missing).
- [ ] Create `src/persistence/user-repository-audited.ts`:
  - [ ] Export `AuditedUserRepository extends UserRepository`
  - [ ] Constructor: `(inner: UserRepository, logger: AuditLogger, actor: AuthUser)`
  - [ ] Implement all 7 abstract methods; omit `upsertSeed` or throw on call (document choice)
  - [ ] `emitUpdateLogs(existing, updated, patch)` private method dispatching to the right action type per diff
  - [ ] Export `createAuditedUserRepository(actor: AuthUser): UserRepository` factory using `serverRecordStore.appendActivityLog`
  - [ ] JSDoc at module top: "For admin mutations only. Auth lookup (login, session) uses raw getUserRepository()."
- [ ] Run tests → all pass.
- [ ] Verify LOC: `wc -l src/persistence/user-repository-audited.ts` → < 250. If ≥ 250, Phase 3 contingency: extract `emitUpdateLogs` to `src/persistence/user-audit-emitter.ts`.

### Phase 4: Factory Consumer Documentation
- [ ] Add JSDoc on `getUserRepository()` in `src/persistence/user-repository.ts`:
  ```
  /**
   * Returns raw UserRepository singleton.
   *
   * For auth lookup only (login, session verification).
   * Admin mutations MUST wrap this via createAuditedUserRepository(actor)
   * from user-repository-audited.ts to ensure audit trail.
   * Seeder (ensureSeedUsers) uses raw repo intentionally — bootstrap is
   * not an admin action.
   */
  ```

### Phase 5: Regression Check (Seeder + Auth Must NOT Emit User-Audit Entries)
- [ ] Add regression test to `test/user-repository-seed.test.ts` (or new section):
  - [ ] Fresh DB + `ensureSeedUsers()` → query `activity_logs WHERE action LIKE 'USER_%'` → 0 rows
- [ ] Add regression test:
  - [ ] `getAuthenticatedUser` call (which triggers `findById`) → 0 USER_* log entries
- [ ] Grep audit: `grep -rn "appendActivityLog" src/auth/ src/persistence/user-repository*.ts` — expect zero matches (auth and raw DAO must not touch logger).
- [ ] Confirm no existing test file uses `createAuditedUserRepository` yet (it's for Spec D consumption).

### Phase 6: Verification Gate
- [ ] `npm run drift:check` → `✅ No drift detected`
- [ ] `npm test` → `pass N, fail 0` where N ≥ 828 + ~22 new tests (= 850+)
- [ ] `npm run build:check` → 0 TypeScript errors
- [ ] Grep assertion: `grep -r "passwordHash" test/user-repository-audited.test.ts` — must appear only in test setup, never in asserted log metadata
- [ ] Backward compat smoke:
  - Login flow still works (`manager@timber.id`, `admin@timber.id`, `gudang@timber.id`)
  - Existing `/api/activity` listing endpoint returns successfully
  - Seeder (`npm run db:seed`) runs with no USER_* entries added

### Phase 7: Documentation & Handoff
- [ ] Append entry to `CHANGELOG.md`:
  ```
  ### Added
  - **Auth audit**: Extended ActivityActionType with 7 user-lifecycle
    actions (USER_CREATED, USER_UPDATED, USER_ROLE_CHANGED,
    USER_PERMISSION_CHANGED, USER_DEACTIVATED, USER_REACTIVATED,
    USER_PASSWORD_CHANGED). AuditedUserRepository decorator wraps
    Spec A DAO to emit structured audit entries on admin mutations.
    Password values never logged. Zero schema change.
    Spec: docs/superpowers/specs/2026-10-22-user-audit-log-extension-design.md
    Plan: docs/superpowers/plans/2026-10-22-user-audit-log-extension.md
    Refs: ADR-0013
  ```
- [ ] Update `docs/SESSION_STATE.md`:
  - Add Item #13 "User Audit Log Extension (Spec C)" to Completed Modules
  - Clear "In Progress" if nothing else active
  - Update "Pickup Instructions": "Spec D (Admin UI) is next. Prerequisites A + B + C complete. TD-001 recommended before starting."
- [ ] Change Spec C status: `Draft — Pending Approval` → `Accepted — Implemented`
- [ ] Change Plan C status: `DRAFT — Pending Approval` → `Accepted — Implemented`
- [ ] Commit:
  ```
  feat(auth): add 7 user-lifecycle audit action types + AuditedUserRepository

  Introduces decorator wrapping Spec A UserRepository DAO to emit
  structured audit log entries on admin mutations. Metadata typed per
  action; password values never logged. Seeder and auth lookup use
  raw DAO (intentional bypass). Zero schema change. Unblocks Spec D.

  Spec: docs/superpowers/specs/2026-10-22-user-audit-log-extension-design.md
  Plan: docs/superpowers/plans/2026-10-22-user-audit-log-extension.md
  Refs: ADR-0013
  ```

---

## 4. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Password hash leaked into log metadata | Low | Critical | TypeScript interface `UserPasswordChangedMetadata` has no password field; test asserts `Object.keys(metadata)` excludes `passwordHash`. Grep assertion in Phase 6. |
| Developer bypasses wrapper in future admin API route | Medium | High | JSDoc on raw `getUserRepository()` + grep check in Spec D plan. Code review discipline. |
| Logger error aborts admin mutation (bad UX) vs silent swallow (lost audit) | Medium | Medium | Current spec: log then throw if logger fails AFTER mutation commits. Document explicitly in test. Admin UI gets 500 but mutation already persisted. Trade-off accepted; alternative (transactional log) blocked by dual-mode persistence. |
| Multiple entries from one update() confuse log readers | Medium | Low | Documented in spec §2.3. Admin UI (Spec D) renders per-entry timeline naturally. 3-entry case (role+name+password) is explicit forensic signal, not noise. |
| diffPermissions handles only `tallyCreate` currently; breaks with future flags | Low | Low | Diff is generic (iterates all keys of `UserPermissions`). New flags automatically supported. Current test uses only `tallyCreate` but logic is key-agnostic. |
| Reactivation detection miss when caller passes `isActive: true` to already-active user | Low | Low | Strict condition `existing.isActive === false && patch.isActive === true` means already-active case → 0 entries (correct no-op). |
| LOC budget exceeded for `user-repository-audited.ts` | Medium | Low | Target 220. Contingency Phase 3: extract `emitUpdateLogs` helper (~80 LOC) to `src/persistence/user-audit-emitter.ts`. |
| Test environment lacks real `serverRecordStore` → logger always fails | Medium | Low | Tests inject mock `AuditLogger` (not production factory). Factory `createAuditedUserRepository` tested separately with real store. |
| ActivityActionType grep hit in existing filter UI breaks when 7 new values added | Low | Low | Existing `/api/activity?action=X` filter accepts any string; UI displays all actions. New values additive. |

---

## 5. Dependencies

- **Blocks:** Spec D (admin UI) requires this spec implementation for forensic trail compliance.
- **Blocked by:** None. ADR-0013 (`d6d9012`), Spec A impl (`95a6fd1`), Spec C (`274af5f`) all committed.
- **Related code paths (will touch):**
  - `src/types/index.ts` (append types + metadata interfaces)
  - `src/utils/user-permission-diff.ts` (new)
  - `src/persistence/user-repository-audited.ts` (new)
  - `src/persistence/user-repository.ts` (JSDoc only, Phase 4)
  - `test/user-permission-diff.test.ts` (new)
  - `test/user-repository-audited.test.ts` (new)
  - `test/user-repository-seed.test.ts` (regression assertion added, Phase 5)
- **Related code paths (will NOT touch):**
  - `src/auth/users.ts` — unchanged
  - `src/auth/session.ts` — unchanged
  - `src/persistence/user-repository-sqlite.ts` — unchanged (wrapped, not modified)
  - `src/persistence/user-repository-supabase.ts` — unchanged
  - `src/persistence/sqlite/activity-queries.ts` — unchanged (metadata JSON column already accepts arbitrary payload)
  - `activity_logs` table schema (SQLite + Supabase) — unchanged
  - Any `/api/auth/*` or `/api/activity/*` route handler — unchanged
  - Any existing API route calling `appendActivityLog` — unchanged
  - `useActivityLog` hook — unchanged

---

## 6. Rollback Plan

If critical issue surfaces post-merge:

1. **Revert the commit** → types reverted, wrapper file deleted, tests removed.
2. **DB side:** no schema change in this spec; nothing to roll back.
3. **Historical USER_* log entries (if any from testing):** harmless. `activity_logs` is append-only. New action type strings persist but `/api/activity` listing renders them as-is (no breakage).
4. **Spec D (if partially started):** unaffected if not yet merged. If Spec D depends on wrapper and both revert together, no inconsistency.

Rollback = single `git revert`. < 2 minutes. Zero data cleanup required.

---

## 7. Done Criteria

- [ ] All Phase 1-7 checkboxes ticked.
- [ ] Verification gate: `drift:check ✅` + `npm test` 0 failures (N ≥ 850) + `build:check` 0 errors.
- [ ] Grep assertion: `grep -r "passwordHash\|password" src/types/index.ts | grep -i "metadata"` returns zero hits (no password field in any metadata interface).
- [ ] Spec C status: `Accepted — Implemented`.
- [ ] Plan C status: `Accepted — Implemented`.
- [ ] CHANGELOG entry committed.
- [ ] SESSION_STATE updated with Item #13.
- [ ] Commit landed on branch `vicky` with proper references.
- [ ] No regression in: login flow, logout flow, tally permission (ADR-0012), session invalidation (Spec B), seeder (no USER_* entries emitted), existing activity log entries.

---

## 8. Open Questions (None Blocking)

- Should wrapper's `upsertSeed` throw explicitly or just be absent from type signature? Decision at Phase 3: absent from type (TypeScript enforces call-site discipline).
- Should factory `createAuditedUserRepository` cache per-actor or always construct new? Decision: always new (actor identity varies per request; caching risks actor leak).
- Should metadata include `timestamp` of mutation separate from log entry timestamp? Decision: no (log entry timestamp is sufficient; redundant data).
