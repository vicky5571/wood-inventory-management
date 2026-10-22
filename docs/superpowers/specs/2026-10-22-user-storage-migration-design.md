# Design Spec: User Storage Migration (PRESET_USERS → DB Table)

**Document:** `docs/superpowers/specs/2026-10-22-user-storage-migration-design.md`
**Date:** 2026-10-22
**Status:** Draft — Pending Approval
**Related Plan:** TBD — `docs/superpowers/plans/YYYY-MM-DD-user-storage-migration.md`
**Related ADR:** ADR-0013 (User Management Architecture) — this is Spec A of 4.
**Position in Sequence:** Spec A of (A→B→C→D). Prerequisite for Spec B, C, D.
**Architecture:** Migrate `PRESET_USERS` hardcoded array (`src/auth/users.ts`) to persistent `users` table in dual-mode storage (SQLite + Supabase). Introduce DAO (`UserRepository`) with CRUD + password hash management. Preserve existing `AuthUser` SSOT shape and `authenticateUser`/`getUserById` API surface. Zero behavior change at auth call-sites.

---

## 1. Executive Summary & Problem Statement

### 1.1 Context
Current user storage is a hardcoded `PRESET_USERS` array in `src/auth/users.ts` (4 users as of commit `d4d05d3`). Changing any user attribute (name, email, role, permission, password) requires editing source and redeploying. Admin UI (Spec D) is impossible without persistence.

### 1.2 Business Problem
Client needs ability to manage users (add, edit, deactivate, rotate password) without engineering intervention. Current workflow blocks every HR event (new hire, role change, offboarding) behind a deploy pipeline.

### 1.3 Scope
- Add `users` table to SQLite (`src/persistence/sqlite/migrations.ts`) and Supabase (migration file in `supabase/`).
- Create `UserRepository` DAO (`src/persistence/user-repository.ts`) with CRUD methods.
- Rewrite `authenticateUser` and `getUserById` in `src/auth/users.ts` to query DAO instead of in-memory array.
- Add seeder (`scripts/seed-users.ts`) that inserts the 4 current `PRESET_USERS` idempotently (ON CONFLICT upsert).
- Preserve `PRESET_USERS` array as **seed source only** (not runtime truth).
- Add `isActive: boolean` field to support soft delete (per ADR-0013 invariant 3).

### 1.4 Non-Goals (YAGNI)
- No admin UI (that is Spec D).
- No session invalidation logic (Spec B).
- No audit log for user mutations (Spec C).
- No password reset flow (Spec D).
- No new permission flags (ADR-0012 governs).
- No change to `AuthUser` SSOT shape (fields unchanged; only storage layer changes).
- No change to login API surface (`POST /api/auth/login` returns same payload).
- No migration of existing JWTs (sessions remain valid).

---

## 2. Design Decisions

### 2.1 Schema (SQLite + Supabase Parity)

**SQLite table `users`:**

```sql
CREATE TABLE IF NOT EXISTS users (
  id             TEXT PRIMARY KEY,
  email          TEXT NOT NULL UNIQUE,
  name           TEXT NOT NULL,
  role_level     INTEGER NOT NULL CHECK (role_level IN (1, 2, 3)),
  title          TEXT NOT NULL,
  permissions    TEXT,                       -- JSON string, nullable
  password_hash  TEXT NOT NULL,
  is_active      INTEGER NOT NULL DEFAULT 1, -- 0 = soft-deleted
  created_at     TEXT NOT NULL,              -- ISO 8601
  updated_at     TEXT NOT NULL               -- ISO 8601
);

CREATE INDEX IF NOT EXISTS idx_users_email_active
  ON users(email) WHERE is_active = 1;
```

**Supabase table `users`:**

```sql
CREATE TABLE IF NOT EXISTS users (
  id             TEXT PRIMARY KEY,
  email          TEXT NOT NULL UNIQUE,
  name           TEXT NOT NULL,
  role_level     SMALLINT NOT NULL CHECK (role_level IN (1, 2, 3)),
  title          TEXT NOT NULL,
  permissions    JSONB,                      -- nullable
  password_hash  TEXT NOT NULL,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email_active
  ON users(email) WHERE is_active = TRUE;
```

**Parity notes:**
- SQLite stores `permissions` as JSON string (`TEXT`); DAO parses on read, stringifies on write.
- SQLite stores `is_active` as INTEGER (0/1); DAO coerces to boolean.
- Both use `id TEXT` to preserve existing `usr-manager-01` format; no auto-increment.
- Partial unique index on `email` only enforces uniqueness among active users (allows soft-deleted users to free up email for reuse — but see §2.7 for policy decision).

### 2.2 DAO Interface (`src/persistence/user-repository.ts`)

```ts
import type { AuthUser } from '../types/index.ts';

export interface UserRecord extends AuthUser {
  passwordHash: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserRepository {
  findByEmail(email: string): Promise<UserRecord | null>;      // active only
  findById(id: string): Promise<UserRecord | null>;            // active only
  listAll(opts?: { includeInactive?: boolean }): Promise<UserRecord[]>;
  create(input: Omit<UserRecord, 'createdAt' | 'updatedAt'>): Promise<UserRecord>;
  update(id: string, patch: Partial<Omit<UserRecord, 'id' | 'createdAt'>>): Promise<UserRecord>;
  deactivate(id: string): Promise<void>;                       // sets is_active = false
  upsertSeed(input: Omit<UserRecord, 'createdAt' | 'updatedAt'>): Promise<void>; // for seeder
}
```

**Factory pattern:** `createUserRepository(mode: 'sqlite' | 'supabase')` returns correct implementation. Follows existing persistence pattern (see `src/persistence/server-record-store.ts`).

**Error handling:** DAO throws typed errors (`UserNotFoundError`, `DuplicateEmailError`); auth layer catches and returns `null` for backward compat with existing `authenticateUser` contract.

### 2.3 Auth Layer Refactor (`src/auth/users.ts`)

Preserve existing exports; rewrite internals:

```ts
import { getUserRepository } from '../persistence/user-repository.ts';

export async function authenticateUser(credentials: LoginCredentials): Promise<AuthUser | null> {
  const email = (credentials.email || '').trim().toLowerCase();
  const user = await getUserRepository().findByEmail(email);  // active only
  if (!user) return null;

  const targetHash = hashPassword(credentials.password || '');
  const inputBuf = Buffer.from(targetHash);
  const userBuf = Buffer.from(user.passwordHash);

  if (inputBuf.length !== userBuf.length) return null;
  if (!timingSafeEqual(inputBuf, userBuf)) return null;

  const { passwordHash, isActive, createdAt, updatedAt, ...cleanUser } = user;
  return cleanUser;
}

export async function getUserById(id: string): Promise<AuthUser | null> {
  const user = await getUserRepository().findById(id);
  if (!user) return null;
  const { passwordHash, isActive, createdAt, updatedAt, ...cleanUser } = user;
  return cleanUser;
}
```

**Breaking change:** `getUserById` signature changes from sync to async (`AuthUser | null` → `Promise<AuthUser | null>`). All callers must be updated. Grep confirms current callers are already in async contexts (middleware, API routes).

**`PRESET_USERS` export:** Kept for backward compat and seeder use, but now explicitly documented as "seed source only, not runtime truth":

```ts
/**
 * SEED SOURCE ONLY — do not read at runtime for authentication.
 * Used by scripts/seed-users.ts to populate the users table on first boot.
 * Runtime user lookups MUST go through UserRepository.
 */
export const PRESET_USERS: UserRecord[] = [ /* unchanged */ ];
```

### 2.4 Seeder (`scripts/seed-users.ts`)

Idempotent upsert per existing pattern (`scripts/seed-db.ts`):

```ts
const repo = createUserRepository(mode);
for (const user of PRESET_USERS) {
  await repo.upsertSeed({
    ...user,
    isActive: true,
  });
}
```

Called automatically by `npm run db:seed` (existing script extended) and `npm run db:seed:supabase` (if exists).

### 2.5 Boot Sequence & Backward Compatibility

**Problem:** Existing deployments have no `users` table. If auth tries to query DAO before table exists, login breaks.

**Solution — two-phase migration safety:**

1. **Migration auto-runs** on first boot (per existing SQLite migration pattern in `src/persistence/sqlite/migrations.ts`). Table created with 0 rows.
2. **Seeder auto-runs if table is empty** (safety net inside DAO initialization):

   ```ts
   async function ensureSeedUsers(repo: UserRepository): Promise<void> {
     const existing = await repo.listAll({ includeInactive: true });
     if (existing.length === 0) {
       for (const user of PRESET_USERS) {
         await repo.upsertSeed({ ...user, isActive: true });
       }
     }
   }
   ```

3. **Call `ensureSeedUsers` once on process start** (lazy init in `getUserRepository` singleton).

**Backward compat for Supabase deployments:** Supabase migration file goes in `supabase/migrations/YYYYMMDDHHMMSS_add_users_table.sql`. Deployment runs migration via Supabase CLI. First login after deploy triggers seed if table empty.

**Rollback plan:** If migration breaks production, revert the deploy. Table remains but auth layer falls back to reading `PRESET_USERS` directly (hidden feature flag `USE_LEGACY_USER_STORE=1`). Documented in plan.

### 2.6 Password Hashing — Unchanged

Keep existing SHA-256 + static salt (`src/auth/users.ts` lines 8-12). Known weakness (not bcrypt/scrypt/argon2), but migrating hashing algorithm is out of scope — would invalidate all existing passwords and require full user re-registration. Flagged as **follow-up** in §6.

### 2.7 Soft Delete Semantics

Per ADR-0013 invariant 3:

- `deactivate(id)` sets `is_active = false`. Record retained forever.
- `findByEmail` / `findById` filter to `is_active = true` by default.
- `listAll({ includeInactive: true })` reveals deactivated users (for Spec D admin UI "show archived" toggle).
- **Email reuse policy:** per index `idx_users_email_active` (partial unique on active rows), a deactivated user's email CAN be reused by a new user. Rationale: `gudang@timber.id` may belong to successive warehouse operators over years.
- Historical FKs (`activity_log.operator_name` string snapshot, `InventoryTransaction.operatorId`) remain valid because `id` is immutable per ADR-0013 invariant 1.

### 2.8 What This Spec Does NOT Change

- `AuthUser` SSOT shape in `src/types/index.ts` — unchanged.
- `src/auth/session.ts` JWT encoding — unchanged.
- `app/api/auth/login/route.ts` response — unchanged.
- `useAuth` hook — unchanged.
- `computePermissions` function — unchanged.
- All existing guards (`canWrite`, `canCreateTally`, etc.) — unchanged.
- All UI components reading `user.*` — unchanged.

---

## 3. API Contract

**No HTTP API changes.** This spec is pure persistence refactor. All existing endpoints (`POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`) retain identical request/response contracts.

Internal DAO contract documented in §2.2.

---

## 4. Acceptance Criteria

### 4.1 Functional
- [ ] Fresh SQLite boot: `users` table created, auto-seeded with 4 users from `PRESET_USERS`.
- [ ] Fresh Supabase deploy: migration creates table; first login seeds if empty.
- [ ] Login with `manager@timber.id / password123` → success (unchanged behavior).
- [ ] Login with `gudang@timber.id / password123` → success, `permissions.tallyCreate: true` present in session.
- [ ] Login with inactive user → returns `null` (401 from API).
- [ ] `getUserById('usr-manager-01')` → returns `AuthUser` (unchanged behavior for all callers).
- [ ] `getUserById('non-existent')` → returns `null`.
- [ ] Deactivating a user via DAO → subsequent login attempt returns `null`.
- [ ] Existing JWT sessions issued before migration remain valid (session.ts unchanged).
- [ ] Running seeder twice is idempotent (ON CONFLICT upsert); no duplicates, no errors.

### 4.2 Non-Functional
- [ ] All 768+ existing tests still pass.
- [ ] `src/auth/users.ts` remains < 250 LOC after refactor.
- [ ] `src/persistence/user-repository.ts` < 250 LOC per implementation (SQLite + Supabase).
- [ ] No new drift violations.
- [ ] Login latency unchanged (< 50ms local, dominated by hash comparison not DAO lookup).
- [ ] `AuthUser` SSOT shape in `src/types/index.ts` unchanged (verify via diff).

### 4.3 Backward Compatibility
- [ ] Deployments without the new table do NOT crash on boot — migration creates table before first query.
- [ ] Deployments with existing JWT cookies continue to work (session layer untouched).
- [ ] Removing `PRESET_USERS` runtime read path does NOT break any caller (grep confirms seeder is only non-test consumer).

---

## 5. Verification Checklist

- [ ] `npm run drift:check` → `✅ No drift detected`
- [ ] `npm test` → `pass N, fail 0` where N ≥ 768 + new tests
- [ ] `npm run build:check` → 0 TypeScript errors
- [ ] `npm run db:seed` → idempotent, exits 0
- [ ] New test file `test/user-repository.test.ts`:
  - CRUD operations (create, read, update, soft delete)
  - `findByEmail` filters inactive by default
  - `listAll({ includeInactive: true })` returns all
  - Duplicate email on active user → throws
  - Email reuse after deactivation → succeeds
- [ ] New test file `test/user-repository-seed.test.ts`:
  - Empty DB → seed inserts 4 users
  - Non-empty DB → `ensureSeedUsers` no-op
  - Seeder run twice → idempotent (same row count, no errors)
- [ ] Existing `test/auth-permissions.test.ts` (from ADR-0012) still passes without modification.
- [ ] Manual QA:
  - Delete `data/wood-inventory.db`, start app → 4 users seeded, login works for all 4.
  - Login as `manager`, deactivate `gudang` via DAO console (`npm run db:console`), logout + attempt login as `gudang` → fails with 401.

---

## 6. Risks & Follow-up

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Supabase migration fails mid-deploy | Low | High | Migration is additive (new table only); rollback deletes table. Test on staging first. |
| SQLite users table lock during migration on live DB | Low | Medium | Migration runs on boot before serving requests; brief lock acceptable. |
| `PRESET_USERS` drift from DB after seed | Medium | Low | Document seeder as one-time bootstrap. Admin UI (Spec D) becomes source of truth. Add CI check comparing `PRESET_USERS` schema shape to table shape. |
| Developer forgets `getUserById` is now async | Medium | Medium | TypeScript enforces `Promise<T>` return; compile fails loudly. Grep + fix all call-sites in Plan. |
| JSON parse error on `permissions` column | Low | Medium | DAO wraps JSON.parse in try/catch, returns empty permissions on parse failure + logs warning. |
| Password hash algorithm (SHA-256) remains weak | High | Medium | **Out of scope.** Flagged for future ADR: migrate to bcrypt/argon2 with rolling re-hash on next login. |
| Admin accidentally deactivates last Level 1 user via DAO | Medium | High | **Out of scope for Spec A** — guard belongs to Spec D UI layer per ADR-0013 invariant 4. Plan documents this explicitly. |

### Follow-up Items (New ADRs or Specs)
- **ADR-TBD:** Password hash migration (SHA-256 → bcrypt/argon2) with rolling re-hash strategy.
- **Spec B:** Session invalidation (fresh lookup vs short-expiry refresh) — unblocked by this spec.
- **Spec C:** Audit log extension for user mutations — unblocked by this spec.
- **Spec D:** Admin UI — unblocked by this spec + B + C.

---

## 7. Open Questions

None blocking. Password hash upgrade deferred to future ADR per §6.

---

## 8. Change Log Entry Preview

```
feat(auth): migrate user storage from hardcoded array to DB table

Introduces `users` table in SQLite + Supabase with UserRepository DAO.
Preserves existing AuthUser SSOT shape and all auth call-site contracts.
PRESET_USERS retained as seed source only. Enables Spec B/C/D (session
invalidation, audit log, admin UI).

Spec: docs/superpowers/specs/2026-10-22-user-storage-migration-design.md
Plan: docs/superpowers/plans/YYYY-MM-DD-user-storage-migration.md
Refs: ADR-0013
```
