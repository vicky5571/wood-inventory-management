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
- [ ] Add `UserPermissions` interface near existing `AuthUser` (around line 514)
- [ ] Add `permissions?: UserPermissions` field on `AuthUser`
- [ ] Verify no duplicate inline `permissions` types exist anywhere via `grep -rn "permissions" src/ app/`

### Phase 2: Preset User (`src/auth/users.ts`)
- [ ] Append `usr-warehouse-04` entry to `PRESET_USERS` array
- [ ] Verify `authenticateUser('gudang@timber.id', 'password123')` returns new user with permissions object

### Phase 3: Permission Computation (Test-First) (`src/hooks/useAuth.ts`)
- [ ] Create `test/auth-permissions.test.ts`:
  - [ ] Level 1 (no permissions field) → `canCreateTally: true`
  - [ ] Level 2 (no permissions field) → `canCreateTally: false`
  - [ ] Level 2 (permissions: `{}`) → `canCreateTally: false`
  - [ ] Level 2 (permissions: `{ tallyCreate: true }`) → `canCreateTally: true`
  - [ ] Level 2 (permissions: `{ tallyCreate: false }`) → `canCreateTally: false`
  - [ ] Level 3 (permissions: `{ tallyCreate: true }`) → `canCreateTally: true` (unusual but legal)
  - [ ] `null` user → `canCreateTally: false`
  - [ ] `undefined` user → `canCreateTally: false`
  - [ ] All existing `canWrite`/`canViewAll`/`isMonitorOnly` scenarios still correct
- [ ] Run `node --test test/auth-permissions.test.ts` → expect failures (function not updated yet)
- [ ] Update `computePermissions` signature from `(roleLevel: UserRoleLevel | null | undefined)` to `(user: AuthUser | null | undefined)`
- [ ] Add `canCreateTally` derivation
- [ ] Update `useAuth` call-site to pass `user` instead of `user?.roleLevel`
- [ ] Expose `canCreateTally` in hook return
- [ ] Run `node --test test/auth-permissions.test.ts` → all pass
- [ ] Grep for other callers of `computePermissions`: `grep -rn "computePermissions" src/ app/ test/` — update if any exist

### Phase 4: Session Propagation (`src/auth/session.ts`)
- [ ] Add `permissions?: UserPermissions` field to session payload type
- [ ] Pass `user.permissions` in `encodeSession` (or equivalent)
- [ ] Return `permissions` from `decodeSession` / `getAuthenticatedUser`
- [ ] Verify backward compat manually: decode an old JWT without `permissions` field → should return `permissions: undefined` without error

### Phase 5: Hook Signature Change (`src/hooks/useWoodRecords.ts`)
- [ ] Change `saveManifest(payload)` signature to `saveManifest(payload, options: { source: 'tally' | 'ledger' })`
- [ ] In function body, choose endpoint:
  - `source === 'tally'` → `POST /api/records/tally`
  - `source === 'ledger'` → `POST /api/records` (existing)
- [ ] Grep for all callers of `saveManifest`: `grep -rn "saveManifest" src/ app/`
- [ ] Update each caller:
  - [ ] `app/tally/page.tsx` → `saveManifest(payload, { source: 'tally' })`
  - [ ] `app/ledger/**` (if any) → `saveManifest(payload, { source: 'ledger' })`
  - [ ] Any other call-site → audit and tag correctly
- [ ] TypeScript compile check: `required` param ensures no missed caller

### Phase 6: API Endpoint (Test-First) (`app/api/records/tally/route.ts`)
- [ ] Create `test/api-records-tally.test.ts`:
  - [ ] POST without session → 401
  - [ ] POST with Level 1 session + valid payload → 201, manifest persisted
  - [ ] POST with Level 2 session + `tallyCreate: true` + valid payload → 201
  - [ ] POST with Level 2 session without permissions → 403
  - [ ] POST with Level 3 session → 403
  - [ ] POST with Level 1 session + malformed JSON → 400
- [ ] Run tests → expect failures (endpoint missing)
- [ ] Create `app/api/records/tally/route.ts`:
  - [ ] `export const dynamic = 'force-dynamic'`
  - [ ] `POST` handler following `app/api/records/route.ts` pattern
  - [ ] Guard: `if (user.roleLevel !== 1 && !user.permissions?.tallyCreate) return 403`
  - [ ] Delegate to `serverRecordStore.saveManifest`
  - [ ] Append activity log with `user.name` / `user.title`
- [ ] Run tests → all pass
- [ ] Verify LOC: `wc -l app/api/records/tally/route.ts` → < 250

### Phase 7: UI Guard Update (`app/tally/page.tsx`)
- [ ] Line 21: destructure `canCreateTally` from `useAuth()` (keep `user`)
- [ ] Line 71: `if (!canCreateTally) return toast.error('Akses Ditolak', 'Anda tidak memiliki izin untuk tally lapangan.');`
- [ ] Line 87: `await saveManifest(payload, { source: 'tally' });`
- [ ] Line 183: `{canCreateTally ? <SubmitButton /> : <MonitorBanner />}`
- [ ] Line 191: Banner text → `'Mode Monitor: Anda tidak memiliki izin untuk menyimpan tally lapangan.'`
- [ ] Verify `canWrite` is no longer referenced in this file
- [ ] Verify LOC: `wc -l app/tally/page.tsx` → < 250

### Phase 8: Regression Verification
- [ ] `npm run drift:check` → `✅ No drift detected`
- [ ] `npm test` → 0 failures, test count ≥ 768 + new tests
- [ ] `npm run build:check` → 0 TypeScript errors, Next.js build succeeds
- [ ] Manual QA matrix (local dev server `npm run dev`):
  - [ ] Login `manager@timber.id` → `/tally` shows Save button → submit works → appears in `/ledger`
  - [ ] Login `admin@timber.id` → `/tally` shows Monitor banner, Save hidden
  - [ ] Login `viewer@timber.id` → `/tally` shows Monitor banner (unchanged)
  - [ ] Login `gudang@timber.id` → `/tally` shows Save button → submit works → appears in `/ledger`
  - [ ] Login `gudang@timber.id` → sidebar shows same items as Level 2 (no Settings)
  - [ ] Login `gudang@timber.id` → `/settings` direct URL → access denied (page-level RBAC)
  - [ ] Activity log entry for warehouse-user manifest shows `operatorName: 'Operator Gudang'`
- [ ] Direct API probe (curl or REST client):
  - [ ] `POST /api/records/tally` without cookie → 401
  - [ ] `POST /api/records/tally` as `admin@timber.id` → 403
  - [ ] `POST /api/records/tally` as `gudang@timber.id` → 201
  - [ ] `POST /api/records` as `gudang@timber.id` (bypass attempt) → 403

### Phase 9: Documentation & Handoff
- [ ] Append entry to `CHANGELOG.md` with spec/plan/ADR refs
- [ ] Update `docs/SESSION_STATE.md`:
  - Mark feature complete in "Completed Modules" table (Item #10)
  - Clear "In Progress" if nothing else pending
  - Update "Pickup Instructions" with next suggested action
- [ ] Change ADR-0012 status: `Proposed` → `Accepted`
- [ ] Commit with message:
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
