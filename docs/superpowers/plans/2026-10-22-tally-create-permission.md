# Plan: Tally Create Permission Flag

**Date:** 2026-10-22
**Priority:** P1 (client-requested feature, blocks warehouse workflow)
**Status:** DRAFT — Pending Approval
**Related Spec:** `docs/superpowers/specs/2026-10-22-tally-create-permission-design.md`
**Related ADR:** ADR-0012

---

## 1. Context Summary

Add optional `permissions.tallyCreate` flag on `AuthUser` to let one designated Level 2 warehouse user submit Tally Lapangan manifests. New API endpoint `POST /api/records/tally` carries relaxed guard. All existing `roleLevel` semantics preserved unchanged.

Design detail in spec. This plan is implementation steps.

---

## 2. File Manifest

| File | Change | LOC Estimate | Notes |
|---|---|---|---|
| `src/types/index.ts` | +8 LOC | Add `UserPermissions` interface, add `permissions?` field on `AuthUser` | SSOT — no inline types elsewhere |
| `src/auth/users.ts` | +9 LOC | Append `usr-warehouse-04` preset | File ~62 LOC → ~71 LOC |
| `src/hooks/useAuth.ts` | ~5 LOC changed | Signature change `computePermissions(roleLevel)` → `(user)`, add `canCreateTally` | File ~85 LOC → ~87 LOC |
| `src/auth/session.ts` | +3 LOC | Propagate `permissions` in payload encode/decode | Backward compat for existing JWTs |
| `app/tally/page.tsx` | ~4 LOC changed | Replace `canWrite` → `canCreateTally`, update error message, update banner text, route save to `/api/records/tally` | File ~199 LOC, stays < 250 |
| `src/hooks/useWoodRecords.ts` | ~5 LOC | Add required `source: 'tally' \| 'ledger'` param to `saveManifest`, route endpoint accordingly | Breaking signature — update all callers |
| `app/api/records/tally/route.ts` | NEW ~80 LOC | Dedicated POST handler with relaxed guard, delegates to `serverRecordStore.saveManifest` | Must stay < 250 LOC |
| `test/auth-permissions.test.ts` | NEW ~60 LOC | 6 scenarios for `computePermissions` | Pure function unit tests |
| `test/api-records-tally.test.ts` | NEW ~80 LOC | 5 scenarios for endpoint guard + 201 happy path | HTTP integration test |
| `CHANGELOG.md` | +6 LOC | New entry | Spec/plan/ADR references |
| `docs/SESSION_STATE.md` | ~15 LOC changed | Mark completed, update pickup instructions | At session end |

**Total:** ~270 LOC added, ~15 LOC changed. 2 new modules both < 250 LOC. No existing module crosses god-file threshold.

---

## 3. Implementation Checklist

### Phase 1: SSOT Type Updates (`src/types/index.ts`)
- [x] Add `UserPermissions` interface near existing `AuthUser` (around line 514)
- [x] Add `permissions?: UserPermissions` field on `AuthUser`
- [x] Verify no duplicate inline `permissions` types exist anywhere via `grep -rn "permissions" src/ app/`

### Phase 2: Preset User (`src/auth/users.ts`)
- [x] Append `usr-warehouse-04` entry to `PRESET_USERS` array
- [x] Verify `authenticateUser('gudang@timber.id', 'password123')` returns new user with permissions object

### Phase 3: Permission Computation (Test-First) (`src/hooks/useAuth.ts`)
- [x] Create `test/auth-permissions.test.ts`:
  - [x] Level 1 (no permissions field) → `canCreateTally: true`
  - [x] Level 2 (no permissions field) → `canCreateTally: false`
  - [x] Level 2 (permissions: `{}`) → `canCreateTally: false`
  - [x] Level 2 (permissions: `{ tallyCreate: true }`) → `canCreateTally: true`
  - [x] Level 2 (permissions: `{ tallyCreate: false }`) → `canCreateTally: false`
  - [x] Level 3 (permissions: `{ tallyCreate: true }`) → `canCreateTally: true` (unusual but legal)
  - [x] `null` user → `canCreateTally: false`
  - [x] `undefined` user → `canCreateTally: false`
  - [x] All existing `canWrite`/`canViewAll`/`isMonitorOnly` scenarios still correct
- [x] Run `node --test test/auth-permissions.test.ts` → expect failures (function not updated yet)
- [x] Update `computePermissions` signature from `(roleLevel: UserRoleLevel | null | undefined)` to `(user: AuthUser | null | undefined)`
- [x] Add `canCreateTally` derivation
- [x] Update `useAuth` call-site to pass `user` instead of `user?.roleLevel`
- [x] Expose `canCreateTally` in hook return
- [x] Run `node --test test/auth-permissions.test.ts` → all pass
- [x] Grep for other callers of `computePermissions`: `grep -rn "computePermissions" src/ app/ test/` — update if any exist

### Phase 4: Session Propagation (`src/auth/session.ts`)
- [x] Add `permissions?: UserPermissions` field to session payload type
- [x] Pass `user.permissions` in `encodeSession` (or equivalent)
- [x] Return `permissions` from `decodeSession` / `getAuthenticatedUser`
- [x] Verify backward compat manually: decode an old JWT without `permissions` field → should return `permissions: undefined` without error

### Phase 5: Hook Signature Change (`src/hooks/useWoodRecords.ts`)
- [x] Change `saveManifest(payload)` signature to `saveManifest(payload, options: { source: 'tally' | 'ledger' })`
- [x] In function body, choose endpoint:
  - `source === 'tally'` → `POST /api/records/tally`
  - `source === 'ledger'` → `POST /api/records` (existing)
- [x] Grep for all callers of `saveManifest`: `grep -rn "saveManifest" src/ app/`
- [x] Update each caller:
  - [x] `app/tally/page.tsx` → `saveManifest(payload, { source: 'tally' })`
  - [x] `app/ledger/**` (if any) → `saveManifest(payload, { source: 'ledger' })`
  - [x] Any other call-site → audit and tag correctly
- [x] TypeScript compile check: `required` param ensures no missed caller

### Phase 6: API Endpoint (Test-First) (`app/api/records/tally/route.ts`)
- [x] Create `test/api-records-tally.test.ts`:
  - [x] POST without session → 401
  - [x] POST with Level 1 session + valid payload → 201, manifest persisted
  - [x] POST with Level 2 session + `tallyCreate: true` + valid payload → 201
  - [x] POST with Level 2 session without permissions → 403
  - [x] POST with Level 3 session → 403
  - [x] POST with Level 1 session + malformed JSON → 400
- [x] Run tests → expect failures (endpoint missing)
- [x] Create `app/api/records/tally/route.ts`:
  - [x] `export const dynamic = 'force-dynamic'`
  - [x] `POST` handler following `app/api/records/route.ts` pattern
  - [x] Guard: `if (user.roleLevel !== 1 && !user.permissions?.tallyCreate) return 403`
  - [x] Delegate to `serverRecordStore.saveManifest`
  - [x] Append activity log with `user.name` / `user.title`
- [x] Run tests → all pass
- [x] Verify LOC: `wc -l app/api/records/tally/route.ts` → < 250

### Phase 7: UI Guard Update (`app/tally/page.tsx`)
- [x] Line 21: destructure `canCreateTally` from `useAuth()` (keep `user`)
- [x] Line 71: `if (!canCreateTally) return toast.error('Akses Ditolak', 'Anda tidak memiliki izin untuk tally lapangan.');`
- [x] Line 87: `await saveManifest(payload, { source: 'tally' });`
- [x] Line 183: `{canCreateTally ? <SubmitButton /> : <MonitorBanner />}`
- [x] Line 191: Banner text → `'Mode Monitor: Anda tidak memiliki izin untuk menyimpan tally lapangan.'`
- [x] Verify `canWrite` is no longer referenced in this file
- [x] Verify LOC: `wc -l app/tally/page.tsx` → < 250

### Phase 8: Regression Verification
- [x] `npm run drift:check` → `✅ No drift detected`
- [x] `npm test` → 0 failures, test count ≥ 768 + new tests
- [x] `npm run build:check` → 0 TypeScript errors, Next.js build succeeds
- [x] Manual QA matrix (local dev server `npm run dev`):
  - [x] Login `manager@timber.id` → `/tally` shows Save button → submit works → appears in `/ledger`
  - [x] Login `admin@timber.id` → `/tally` shows Monitor banner, Save hidden
  - [x] Login `viewer@timber.id` → `/tally` shows Monitor banner (unchanged)
  - [x] Login `gudang@timber.id` → `/tally` shows Save button → submit works → appears in `/ledger`
  - [x] Login `gudang@timber.id` → sidebar shows same items as Level 2 (no Settings)
  - [x] Login `gudang@timber.id` → `/settings` direct URL → access denied (page-level RBAC)
  - [x] Activity log entry for warehouse-user manifest shows `operatorName: 'Operator Gudang'`
- [x] Direct API probe (curl or REST client):
  - [x] `POST /api/records/tally` without cookie → 401
  - [x] `POST /api/records/tally` as `admin@timber.id` → 403
  - [x] `POST /api/records/tally` as `gudang@timber.id` → 201
  - [x] `POST /api/records` as `gudang@timber.id` (bypass attempt) → 403

### Phase 9: Documentation & Handoff
- [x] Append entry to `CHANGELOG.md` with spec/plan/ADR refs
- [x] Update `docs/SESSION_STATE.md`:
  - Mark feature complete in "Completed Modules" table (Item #10)
  - Clear "In Progress" if nothing else pending
  - Update "Pickup Instructions" with next suggested action
- [x] Change ADR-0012 status: `Proposed` → `Accepted`
- [x] Commit with message:
  ```
  feat(auth): add tally create permission flag for warehouse operator

  Spec: docs/superpowers/specs/2026-10-22-tally-create-permission-design.md
  Plan: docs/superpowers/plans/2026-10-22-tally-create-permission.md
  Refs: ADR-0012
  ```

---

## 4. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Breaking signature change in `saveManifest` misses a caller | Required `source` param → TypeScript compile catches all call-sites. |
| Existing JWTs become invalid after `permissions` field added to payload | Field is optional in payload type; decode handles missing field as `undefined`. No forced re-login. Smoke test an old session cookie if available. |
| `computePermissions` signature change breaks a hidden caller | `grep -rn "computePermissions"` before and after refactor to confirm only `useAuth` consumes it. Fix any caller found. |
| Activity log `operator_role` TEXT column rejects long title string | Column is TEXT unbounded (migrations.ts:165). No constraint risk. |
| New endpoint file exceeds 250 LOC due to boilerplate | Target ~80 LOC. If approaches limit, extract shared guard helper to `src/auth/api-guards.ts`. |
| Test environment lacks session cookie plumbing for integration tests | If `test/api-records-tally.test.ts` requires auth mocking not yet in test harness, fall back to unit-testing the guard logic separately and skip HTTP integration portion. Document in test comments. |

---

## 5. Dependencies

- No external packages added.
- No DB migration (users still hardcoded in `PRESET_USERS`).
- No Supabase schema change (activity log `operator_role` TEXT already accepts arbitrary strings).

---

## 6. Rollback Plan

If a critical issue surfaces post-deploy:
1. Revert the single commit.
2. `permissions` field becomes dormant (no users have it); existing roleLevel-based guards unaffected.
3. `/api/records/tally` endpoint returns 404 after revert; `/tally` page falls back to toast error if a request fires — low user impact since warehouse user also disappears from preset list.

Full rollback is a single `git revert`. No data cleanup required.
