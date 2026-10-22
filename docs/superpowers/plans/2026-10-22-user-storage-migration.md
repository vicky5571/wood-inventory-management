# Plan: User Storage Migration (PRESET_USERS → DB Table)

**Date:** 2026-10-22
**Priority:** P1 (unblocks Spec B/C/D admin user management)
**Status:** DRAFT — Pending Approval
**Related Spec:** `docs/superpowers/specs/2026-10-22-user-storage-migration-design.md`
**Related ADR:** ADR-0013 (User Management Architecture)
**Position in Sequence:** Plan for Spec A of (A→B→C→D).

---

## 1. Context Summary

Migrate `PRESET_USERS` hardcoded array in `src/auth/users.ts` to a persistent `users` table in dual-mode storage (SQLite + Supabase). Introduce `UserRepository` DAO with CRUD. Preserve `AuthUser` SSOT shape and all auth call-site contracts. `PRESET_USERS` retained as seed source only.

Design details in spec. This plan is implementation steps.

**Pre-flight observations (verified before plan written):**
- `getUserById` has **zero non-test runtime callers** (grep confirmed). Signature change sync→async only affects `test/auth-users.test.ts`.
- Supabase migration naming: `YYYYMMDDHHMMSS_<name>.sql`. Latest = `20261022000000_lembar_tagihan_refactor.sql`. New = `20261022000001_add_users_table.sql`.
- Existing seeder pattern: `scripts/seed-db.ts` + `scripts/seed-supabase.ts`. Extend both, do not create third script.

---

## 2. File Manifest

| File | Action | LOC Estimate | Notes |
|---|---|---|---|
| `src/persistence/sqlite/migrations.ts` | Modify | +20 LOC | Append `users` table DDL + partial unique index |
| `supabase/migrations/20261022000001_add_users_table.sql` | NEW | ~30 LOC | Supabase table + JSONB permissions + partial index |
| `src/persistence/user-repository.ts` | NEW | ~230 LOC | DAO interface + SQLite impl + Supabase impl + factory | Must stay < 250 LOC |
| `src/persistence/user-repository-sqlite.ts` | Optional NEW | ~130 LOC | Extract if user-repository.ts > 250 LOC |
| `src/persistence/user-repository-supabase.ts` | Optional NEW | ~130 LOC | Extract if user-repository.ts > 250 LOC |
| `src/auth/users.ts` | Modify | ~30 LOC changed, ~75 LOC total | Rewrite `authenticateUser` + `getUserById` async, keep `PRESET_USERS` as seed, add JSDoc warnings |
| `scripts/seed-db.ts` | Modify | +15 LOC | Call user seeder in SQLite seed flow |
| `scripts/seed-supabase.ts` | Modify | +15 LOC | Call user seeder in Supabase seed flow |
| `src/persistence/seed/fixtures-users.ts` | NEW | ~20 LOC | Export `PRESET_USERS` → fixture shape, consumed by both seeders (consistent with existing fixtures-*.ts pattern) |
| `test/user-repository.test.ts` | NEW | ~180 LOC | CRUD + soft delete + email reuse + permissions JSON round-trip |
| `test/user-repository-seed.test.ts` | NEW | ~60 LOC | `ensureSeedUsers` idempotency |
| `test/auth-users.test.ts` | Modify | ~20 LOC changed | Convert sync `getUserById` call to `await`, update to use DAO |
| `CHANGELOG.md` | Modify | +8 LOC | New entry under `[Unreleased]` |
| `docs/SESSION_STATE.md` | Modify | ~15 LOC changed | Mark Spec A complete; update pickup |

**Total:** ~730 LOC added, ~65 LOC changed. All new modules under 250 LOC budget.

**God File Risk:** `user-repository.ts` targets 230 LOC. If it crosses 250, Phase 4 splits into `user-repository-sqlite.ts` + `user-repository-supabase.ts` with factory in main file. Decision made during Phase 4 based on actual LOC count.

---

## 3. Implementation Checklist

### Phase 1: SSOT Verification (No Code Change)
- [ ] Confirm `AuthUser` in `src/types/index.ts` matches spec §2.2 shape (no changes needed per spec §2.8).
- [ ] Grep `getUserById` and `authenticateUser` call-sites — document count and files in commit message.
- [ ] Grep `PRESET_USERS` call-sites — document which are runtime vs test vs seeder.

### Phase 2: SQLite Schema Migration
- [ ] Edit `src/persistence/sqlite/migrations.ts`:
  - [ ] Append migration function `createUsersTable()` with DDL from spec §2.1
  - [ ] Add `CREATE INDEX IF NOT EXISTS idx_users_email_active ...` partial index
  - [ ] Register in migration runner (follows existing pattern for other tables)
- [ ] Delete `data/wood-inventory.db` and restart app → migration auto-runs, table exists, 0 rows
- [ ] Verify via `sqlite3 data/wood-inventory.db ".schema users"` → matches spec

### Phase 3: Supabase Schema Migration
- [ ] Create `supabase/migrations/20261022000001_add_users_table.sql` with DDL from spec §2.1
- [ ] Dry-run locally if Supabase CLI available: `supabase db reset --local` and verify table
- [ ] If no local Supabase, inspect SQL manually against existing migration patterns
- [ ] Do NOT run on production yet — migration applied in Phase 10 deploy step

### Phase 4: UserRepository DAO (Test-First)
- [ ] Create `test/user-repository.test.ts` with scenarios:
  - [ ] `findByEmail` returns active user with password hash + permissions parsed from JSON
  - [ ] `findByEmail` returns null for inactive user
  - [ ] `findByEmail` returns null for non-existent email
  - [ ] `findByEmail` is case-insensitive on email
  - [ ] `findById` returns active user; null for inactive; null for non-existent
  - [ ] `listAll()` returns active only
  - [ ] `listAll({ includeInactive: true })` returns all
  - [ ] `create` inserts user with `createdAt`/`updatedAt` auto-stamped
  - [ ] `create` with duplicate email on active user → throws `DuplicateEmailError`
  - [ ] `create` with email reused from soft-deleted user → succeeds
  - [ ] `update` modifies specified fields + bumps `updatedAt`; `createdAt` unchanged
  - [ ] `update` on non-existent id → throws `UserNotFoundError`
  - [ ] `deactivate` sets `isActive = false`; subsequent `findById` returns null
  - [ ] `deactivate` is idempotent (second call does not throw)
  - [ ] `upsertSeed` with new id → inserts; with existing id → updates
  - [ ] JSON round-trip: user with `permissions: { tallyCreate: true }` → DB → DAO returns identical object
  - [ ] JSON round-trip: user with `permissions: null` → stored as NULL; DAO returns `permissions: undefined`
  - [ ] Malformed JSON in DB → DAO returns `permissions: {}` + logs warning (defensive)
- [ ] Run `node --test test/user-repository.test.ts` → expect all fail (DAO doesn't exist)
- [ ] Create `src/persistence/user-repository.ts`:
  - [ ] Export `UserRecord` interface per spec §2.2
  - [ ] Export `UserRepository` interface per spec §2.2
  - [ ] Export `UserNotFoundError` and `DuplicateEmailError` classes
  - [ ] Implement SQLite impl using existing `db.ts` connection
  - [ ] Implement Supabase impl using existing PostgREST client pattern
  - [ ] Export `getUserRepository()` factory based on `PERSISTENCE_MODE` env var (follows `server-record-store.ts` pattern)
- [ ] Run `node --test test/user-repository.test.ts` → all pass
- [ ] Verify LOC: `wc -l src/persistence/user-repository.ts` → if ≥ 250, split per File Manifest optional files
- [ ] Grep for any other call pattern that might need DAO: `grep -rn "PRESET_USERS\|authenticateUser\|getUserById" src/ app/`

### Phase 5: Seed Fixture Extraction
- [ ] Create `src/persistence/seed/fixtures-users.ts`:
  - [ ] Import `PRESET_USERS` from `src/auth/users.ts`
  - [ ] Export typed fixture array matching `UserRecord` shape (adds `isActive: true` to each)
  - [ ] Follow pattern of existing `fixtures-contracts.ts`, `fixtures-receiving.ts`, etc.
- [ ] Update `src/persistence/seed/fixtures.ts` barrel export (if exists) to include users

### Phase 6: Seeder Integration (Test-First)
- [ ] Create `test/user-repository-seed.test.ts`:
  - [ ] Empty DB + `ensureSeedUsers()` → 4 users inserted
  - [ ] Non-empty DB + `ensureSeedUsers()` → no-op, row count unchanged
  - [ ] `ensureSeedUsers()` called twice → idempotent, no errors
  - [ ] Each seeded user has `isActive: true`
  - [ ] Seeded `gudang@timber.id` has `permissions.tallyCreate: true` (round-trip)
- [ ] Run tests → expect fail
- [ ] Add `ensureSeedUsers(repo)` function in `src/persistence/user-repository.ts`:
  - [ ] Signature per spec §2.5
  - [ ] Uses `fixtures-users.ts` as source
- [ ] Wire `ensureSeedUsers` into `getUserRepository()` factory (lazy init on first call)
- [ ] Extend `scripts/seed-db.ts`:
  - [ ] Import `ensureSeedUsers` and `createUserRepository('sqlite')`
  - [ ] Call during seed flow after schema migrations
- [ ] Extend `scripts/seed-supabase.ts`:
  - [ ] Same pattern for Supabase mode
- [ ] Run `npm run db:seed` → exits 0, logs "4 users seeded" (or similar)
- [ ] Run `npm run db:seed` twice → second run no-op, exits 0
- [ ] Run tests → all pass

### Phase 7: Auth Layer Refactor
- [ ] Edit `src/auth/users.ts`:
  - [ ] Add JSDoc comment on `PRESET_USERS` per spec §2.3 ("SEED SOURCE ONLY")
  - [ ] Rewrite `authenticateUser` to use `getUserRepository().findByEmail()`
  - [ ] Rewrite `getUserById` to use `getUserRepository().findById()` and change return type to `Promise<AuthUser | null>`
  - [ ] Remove in-memory array iteration logic
  - [ ] Keep `hashPassword` helper unchanged
  - [ ] Keep `PRESET_USERS` export unchanged (only JSDoc added)
- [ ] Verify LOC: `wc -l src/auth/users.ts` → < 250

### Phase 8: Update Test Callers of getUserById
- [ ] Edit `test/auth-users.test.ts`:
  - [ ] Line 49: `const user = getUserById('usr-manager-01');` → `const user = await getUserById('usr-manager-01');`
  - [ ] Make enclosing test function async if not already
  - [ ] Audit any other call-site revealed by Phase 1 grep
- [ ] Run `node --test test/auth-users.test.ts` → all pass

### Phase 9: Full Regression + Verification Gate
- [ ] `npm run drift:check` → `✅ No drift detected`
- [ ] `npm test` → `pass N, fail 0` where N ≥ 768 + ~25 new tests
- [ ] `npm run build:check` → 0 TypeScript errors
- [ ] Delete `data/wood-inventory.db` → `npm run dev` → auto-migration + auto-seed → login works for all 4 preset users
- [ ] `npm run db:seed` → idempotent, exits 0

### Phase 10: Manual QA Matrix
- [ ] Login as each preset user (`manager`, `admin`, `viewer`, `gudang`) → all succeed with same behavior as before migration
- [ ] Verify `gudang@timber.id` still has `canCreateTally: true` in session (regression check for ADR-0012)
- [ ] Direct DB inspection: `sqlite3 data/wood-inventory.db "SELECT id, email, role_level, is_active, permissions FROM users"` → 4 rows, correct data
- [ ] Deactivate test via SQL console: `UPDATE users SET is_active = 0 WHERE email = 'gudang@timber.id'` → logout + attempt login as gudang → 401
- [ ] Reactivate: `UPDATE users SET is_active = 1 WHERE email = 'gudang@timber.id'` → login succeeds again
- [ ] Verify existing JWT sessions issued before migration still work (open app in private window with old cookie if available)

### Phase 11: Documentation & Handoff
- [ ] Append entry to `CHANGELOG.md`:
  ```
  ### Changed
  - **Auth storage**: migrated `PRESET_USERS` hardcoded array to persistent `users`
    table in SQLite + Supabase. Introduces `UserRepository` DAO. `authenticateUser`
    and `getUserById` now query DAO. `PRESET_USERS` retained as seed source only.
    `getUserById` signature changed from sync to async.
    Spec: docs/superpowers/specs/2026-10-22-user-storage-migration-design.md
    Plan: docs/superpowers/plans/2026-10-22-user-storage-migration.md
    Refs: ADR-0013
  ```
- [ ] Update `docs/SESSION_STATE.md`:
  - Add Item #11 "User Storage Migration (Spec A)" to Completed Modules table
  - Clear "In Progress" if nothing else active
  - Update "Pickup Instructions": "Spec B (Session Invalidation) is next. Prerequisite A complete."
- [ ] Change ADR-0013 status: `Proposed` → `Accepted`
- [ ] Change Spec A status: `Draft — Pending Approval` → `Accepted — Implemented`
- [ ] Commit:
  ```
  feat(auth): migrate user storage from hardcoded array to DB table

  Introduces users table in SQLite + Supabase with UserRepository DAO.
  Preserves AuthUser SSOT shape; all auth call-sites unchanged except
  getUserById signature (now async). PRESET_USERS retained as seed source
  only. Unblocks Spec B (session invalidation), Spec C (user audit log),
  Spec D (admin UI).

  Spec: docs/superpowers/specs/2026-10-22-user-storage-migration-design.md
  Plan: docs/superpowers/plans/2026-10-22-user-storage-migration.md
  Refs: ADR-0013
  ```

---

## 4. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| SQLite migration runs on existing DB with other tables but no `users` table | High (expected) | Low | Migration uses `CREATE TABLE IF NOT EXISTS`; idempotent. Auto-seed only when empty. |
| Supabase migration applied to production without staging test | Low | High | Document explicit "test on staging first" in Phase 3 and Phase 10. Deploy only after smoke-test on preview environment. |
| `getUserById` async signature breaks hidden caller not caught by grep | Low | Medium | TypeScript compile fails loudly on sync-expected contexts. Build gate catches before merge. |
| `permissions` JSON parse fails on legacy row (none exist, but defensive) | Low | Low | DAO wraps JSON.parse in try/catch, returns `permissions: {}` + console.warn. Test coverage in Phase 4. |
| Factory `getUserRepository()` initialized multiple times → multiple `ensureSeedUsers` runs | Medium | Low | Singleton pattern + `ensureSeedUsers` is idempotent anyway. |
| Developer runs `npm run db:seed` on production, overwrites admin changes | Medium | High | `upsertSeed` ON CONFLICT updates all fields → would overwrite admin password changes. **Mitigation:** Seeder documents "DEVELOPMENT ONLY — do not run in production". Future Spec D introduces admin-managed users; seeder becomes obsolete for live users. |
| Test environment lacks dual-mode persistence config | Medium | Low | Tests run against SQLite mode by default (per existing test pattern). Supabase impl tested via mock or deferred to integration suite. |
| LOC budget for `user-repository.ts` exceeded | Medium | Low | Phase 4 contingency: split into 3 files (interface + sqlite impl + supabase impl). File manifest shows paths. |
| JWT sessions issued before migration contain user data copy that drifts from DB | Low | Low | Session payload is already a snapshot (JWT is self-contained). Session unchanged by this spec. Spec B explicitly addresses this. |

---

## 5. Dependencies

- **Blocks:** Spec B (Session Invalidation) implementation, Spec C (User Audit Log), Spec D (Admin UI). None of these can start implementation until Spec A merged.
- **Blocked by:** None. ADR-0013 and Spec A both committed (`d6d9012`).
- **Related code paths (will touch):**
  - `src/auth/users.ts`
  - `src/auth/session.ts` (NOT modified, verified in Phase 10)
  - `src/persistence/sqlite/migrations.ts`
  - `src/persistence/sqlite/db.ts` (consumed)
  - `scripts/seed-db.ts`, `scripts/seed-supabase.ts`
  - `supabase/migrations/` (new file)
  - `test/auth-users.test.ts`
- **Related code paths (will NOT touch):**
  - `src/types/index.ts` — `AuthUser` shape stable
  - `src/hooks/useAuth.ts`
  - `app/api/auth/*` route handlers
  - Any `app/*` page component

---

## 6. Rollback Plan

If critical issue surfaces post-merge:

1. **Revert the commit** → `src/auth/users.ts` back to in-memory `PRESET_USERS` iteration. Auth works as before.
2. **`users` table in SQLite remains** → harmless (unused). Can drop manually: `DROP TABLE users;`.
3. **Supabase migration remains applied** → table unused. Drop via new reverse migration if cleanup needed.
4. **No data loss** → users table only contains seed data; no admin-created users yet (Spec D not shipped).

Rollback is single `git revert` + optional DB cleanup. Takes < 5 minutes.

---

## 7. Done Criteria

- [ ] All Phase 1-11 checkboxes ticked.
- [ ] Verification gate passes: `drift:check ✅` + `npm test` 0 failures + `build:check` 0 errors.
- [ ] Manual QA matrix (Phase 10) passes.
- [ ] Spec A status updated to `Accepted — Implemented`.
- [ ] ADR-0013 status updated to `Accepted`.
- [ ] CHANGELOG entry committed.
- [ ] SESSION_STATE updated with Item #11.
- [ ] Commit landed on branch `vicky` with proper spec/plan/ADR references.
- [ ] No regression in any existing login flow or role-based guard.
- [ ] `gudang@timber.id` login + `/tally` manifest create still works end-to-end (ADR-0012 regression check).

---

## 8. Open Questions (None Blocking)

- Should `UserRepository` live under `src/persistence/` (chosen) or `src/auth/` (alternative)? Chose persistence for consistency with `server-record-store.ts`.
- Should Supabase impl use PostgREST client or raw SQL? Choose PostgREST for consistency with existing adapters (verified in Phase 4 implementation).
- Should factory select mode via env var or runtime config? Follow existing `server-record-store.ts` pattern (whichever it uses — verified in Phase 4).
