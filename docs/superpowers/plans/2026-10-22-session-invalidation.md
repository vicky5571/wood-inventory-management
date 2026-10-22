# Plan: Session Invalidation on User State Changes

**Date:** 2026-10-22
**Priority:** P1 (prerequisite for Spec D admin UI production safety)
**Status:** Accepted — Implemented
**Related Spec:** `docs/superpowers/specs/2026-10-22-session-invalidation-design.md`
**Related ADR:** ADR-0013 (User Management Architecture), ADR-0014 (Fresh Lookup — written as Phase 1 of this plan)
**Position in Sequence:** Plan for Spec B of (A→B→C→D). Depends on Spec A (merged `95a6fd1`). Prerequisite for Spec D.

---

## 1. Context Summary

Replace stateless-JWT-as-truth with DAO-authoritative user state. `getAuthenticatedUser` performs fresh `findById` on every call; JWT becomes identity + session-validity proof only. Max staleness drops from 7 days to request duration.

Design detail in spec. ADR-0014 captures the architectural decision. This plan is implementation steps.

**Pre-flight observations (verified before plan written):**
- `src/auth/session.ts` is 100 LOC. Projected +50 LOC → ~150 LOC (safe < 250).
- `src/auth/session.ts` imports zero DB code currently. Will add DAO import.
- Caller grep: `getAuthenticatedUser` consumed by `/api/records/route.ts`, `/api/records/tally/route.ts`, and any future authenticated route. Signature unchanged (still `Promise<AuthUser | null>`), so no caller modifications required.
- `/api/auth/me/route.ts` currently calls `verifySessionToken` directly (not `getAuthenticatedUser`); must be refactored to use `getAuthenticatedUserDetailed` for `reason` field.
- Existing test suite baseline: 807 pass, 0 fail.

---

## 2. File Manifest

| File | Action | LOC Estimate | Notes |
|---|---|---|---|
| `docs/adr/0014-fresh-user-lookup-per-request.md` | NEW | ~130 LOC | Phase 1 output; ADR already drafted alongside this plan |
| `src/auth/session.ts` | Modify | +50 LOC (100 → ~150) | Add DAO lookup to `getAuthenticatedUser`; add `getAuthenticatedUserDetailed`; add `AuthFailureReason` type; keep `verifySessionToken` unchanged |
| `app/api/auth/me/route.ts` | Modify | ~20 LOC changed | Replace `verifySessionToken` with `getAuthenticatedUserDetailed`; include `reason` in 401 response |
| `src/types/index.ts` | Modify | +8 LOC | Export `AuthFailureReason` enum (SSOT per AGENTS.md) |
| `test/session-invalidation.test.ts` | NEW | ~200 LOC | 9 scenarios covering fresh lookup, failure reasons, staleness override |
| `test/api-auth-me-freshness.test.ts` | NEW | ~130 LOC | 4 integration scenarios for `/api/auth/me` behavior change |
| `CHANGELOG.md` | Modify | +8 LOC | New entry under `[Unreleased]` |
| `docs/SESSION_STATE.md` | Modify | ~15 LOC changed | Mark Spec B complete; update pickup for Spec C |

**Total:** ~560 LOC added, ~43 LOC changed. All modules under 250 LOC budget.

**God File Risk:** `src/auth/session.ts` projected 150 LOC after changes. If actual exceeds 200 LOC, Phase 4 contingency: extract `AuthFailureReason` + helpers to `src/auth/session-errors.ts`.

**SSOT Discipline:** `AuthFailureReason` must live in `src/types/index.ts` per AGENTS.md invariant, NOT inline in `session.ts`. Verified in Phase 3.

---

## 3. Implementation Checklist

### Phase 1: ADR-0014 (COMPLETE — Written Alongside This Plan)
- [x] Create `docs/adr/0014-fresh-user-lookup-per-request.md`
- [x] Status: `Proposed`
- [x] Content: decision + 5 rejected alternatives + consequences + follow-ups
- [x] Reference from Spec B §7
- Note: ADR will be flipped to `Accepted` in Phase 10 after implementation verification.

### Phase 2: SSOT Verification (No Code Change)
- [x] Confirm `AuthUser` shape unchanged (per ADR-0013 invariant 8).
- [x] Grep `getAuthenticatedUser` call-sites: `grep -rn "getAuthenticatedUser" app/ src/ test/`. Expected: `/api/records/route.ts`, `/api/records/tally/route.ts`. Document count in commit message.
- [x] Grep `verifySessionToken` call-sites. Expected: `session.ts` (internal), `/api/auth/me/route.ts` (will change in Phase 6), `/api/auth/login/route.ts` (unchanged — token creation path).
- [x] Confirm no caller depends on JWT payload field values that may now differ from DB (e.g., no code reads `authUser.email` and compares to JWT-derived email).

### Phase 3: SSOT Type Update (`src/types/index.ts`)
- [x] Add `AuthFailureReason` type near `AuthUser`:
  ```ts
  export type AuthFailureReason =
    | 'NO_TOKEN'
    | 'TOKEN_MALFORMED'
    | 'TOKEN_INVALID'
    | 'TOKEN_EXPIRED'
    | 'USER_NOT_FOUND'
    | 'USER_INACTIVE';
  ```
- [x] Add `AuthResult` interface:
  ```ts
  export interface AuthResult {
    user: AuthUser | null;
    reason?: AuthFailureReason;
  }
  ```
- [x] Verify no duplicate inline definitions via `grep -rn "AuthFailureReason\|AuthResult" src/ app/`.

### Phase 4: Session Layer Refactor (Test-First)
- [x] Create `test/session-invalidation.test.ts` with scenarios:
  - [x] `verifySessionToken` behavior unchanged (regression — HMAC + exp check only, no DB)
  - [x] `getAuthenticatedUser` with no cookie → returns null
  - [x] `getAuthenticatedUser` with malformed token → returns null
  - [x] `getAuthenticatedUser` with invalid HMAC → returns null
  - [x] `getAuthenticatedUser` with expired exp → returns null
  - [x] `getAuthenticatedUser` with valid JWT + userId not in DB → returns null
  - [x] `getAuthenticatedUser` with valid JWT + inactive user → returns null (fresh lookup wins)
  - [x] `getAuthenticatedUser` with valid JWT + active user → returns DB record (not JWT payload)
  - [x] Staleness override: issue token when user Level 2 → mutate DB to Level 1 → verify returns Level 1
  - [x] Staleness override: issue token when user has no permissions → grant tallyCreate in DB → verify returns with tallyCreate
  - [x] Staleness override: issue token when user has tallyCreate → revoke in DB → verify returns without tallyCreate
  - [x] `getAuthenticatedUserDetailed` returns correct `reason` for each failure mode (6 reasons)
  - [x] `getAuthenticatedUserDetailed` for success returns `{ user, reason: undefined }`
- [x] Run `node --test test/session-invalidation.test.ts` → expect failures (new function missing)
- [x] Edit `src/auth/session.ts`:
  - [x] Keep `verifySessionToken` 100% unchanged (regression protection).
  - [x] Add internal `extractToken(request): Promise<string | undefined>` helper (refactor existing cookie extraction from `getAuthenticatedUser` body).
  - [x] Rewrite `getAuthenticatedUser(request)` per spec §2.1 (JWT verify → DAO findById → return DB user minus internal fields).
  - [x] Add new `getAuthenticatedUserDetailed(request): Promise<AuthResult>` that returns `{ user, reason }`.
  - [x] Import `getUserRepository` from `src/persistence/user-repository.ts`.
  - [x] Import `AuthFailureReason`, `AuthResult` from `src/types/index.ts`.
  - [x] Add file-top comment documenting payload field roles (userId + exp authoritative; rest decorative per ADR-0014).
- [x] Run tests → all pass.
- [x] Verify LOC: `wc -l src/auth/session.ts` → < 200. If ≥ 200, extract to `src/auth/session-errors.ts` (contingency).

### Phase 5: `/api/auth/me` Refactor (Test-First)
- [x] Create `test/api-auth-me-freshness.test.ts` with scenarios:
  - [x] GET without cookie → 401 with `reason: 'NO_TOKEN'`
  - [x] GET with valid session + active user → 200 with DB user data
  - [x] GET after user deactivated in DB → 401 with `reason: 'USER_INACTIVE'`
  - [x] GET after user role changed in DB → 200 with new role
  - [x] GET after permission granted in DB → 200 with new permission
  - [x] Response body shape for success: `{ success: true, user }` (unchanged)
  - [x] Response body shape for failure: `{ success: false, error: string, reason: AuthFailureReason }`
- [x] Run tests → expect failures.

### Phase 6: `/api/auth/me` Implementation
- [x] Edit `app/api/auth/me/route.ts`:
  - [x] Replace `verifySessionToken(token)` call with `await getAuthenticatedUserDetailed(request)`.
  - [x] Remove inline cookie extraction (now inside `getAuthenticatedUserDetailed`).
  - [x] 401 response body includes `reason` and humanized `error` string per spec §3.1.
- [x] Define humanize mapping:
  - `NO_TOKEN` → `'Belum masuk.'`
  - `TOKEN_MALFORMED` → `'Sesi tidak valid.'`
  - `TOKEN_INVALID` → `'Sesi tidak valid.'`
  - `TOKEN_EXPIRED` → `'Sesi kadaluarsa.'`
  - `USER_NOT_FOUND` → `'Akun tidak ditemukan.'`
  - `USER_INACTIVE` → `'Akun telah dinonaktifkan.'`
- [x] Run tests → all pass.
- [x] Verify LOC: `wc -l app/api/auth/me/route.ts` → < 100 (expected ~50).

### Phase 7: Regression Check on API Routes Using getAuthenticatedUser
- [x] Confirm `app/api/records/route.ts` POST handler still works:
  - Login as `manager@timber.id` → POST /api/records → 201 (regression smoke)
  - Login as `admin@timber.id` → POST /api/records → 403 (unchanged guard)
- [x] Confirm `app/api/records/tally/route.ts` POST handler still works (ADR-0012 regression):
  - Login as `gudang@timber.id` → POST /api/records/tally → 201
  - Login as `admin@timber.id` → POST /api/records/tally → 403
- [x] Add integration test to `test/session-invalidation.test.ts`:
  - Issue valid session for `gudang@timber.id` (tallyCreate: true)
  - Simulate DB mutation: `UPDATE users SET permissions = NULL WHERE id = 'usr-warehouse-04'`
  - Call `getAuthenticatedUser` → verify returned user has no tallyCreate
  - (Documents the critical ADR-0012 interaction)
- [x] Restore DB state after test.

### Phase 8: Full Regression + Verification Gate
- [x] `npm run drift:check` → `✅ No drift detected`
- [x] `npm test` → `pass N, fail 0` where N ≥ 807 + ~17 new tests
- [x] `npm run build:check` → 0 TypeScript errors
- [x] All existing login/session tests still pass unchanged (regression)
- [x] Latency smoke: time `GET /api/auth/me` locally in dev → should be < 20ms SQLite mode

### Phase 9: Manual QA Matrix
- [x] Backup `data/wood_inventory.db` → `.phase9-backup`
- [x] Start dev server: `npm run dev`
- [x] Login as `admin@timber.id / password123` in browser
- [x] Verify `/api/auth/me` returns 200 with user data (DevTools Network tab)
- [x] Via SQL console (new terminal): `sqlite3 data/wood_inventory.db "UPDATE users SET is_active = 0 WHERE email = 'admin@timber.id'"`
- [x] Refresh browser tab → expect redirect to login OR 401 on next API call
- [x] Verify `/api/auth/me` now returns 401 with `reason: 'USER_INACTIVE'`
- [x] Via SQL: `sqlite3 data/wood_inventory.db "UPDATE users SET is_active = 1 WHERE email = 'admin@timber.id'"`
- [x] Login again → works
- [x] Login as `gudang@timber.id`, verify `/api/auth/me` returns `permissions.tallyCreate: true`
- [x] Via SQL: `UPDATE users SET permissions = NULL WHERE email = 'gudang@timber.id'`
- [x] Refresh → `/api/auth/me` returns 200 with no `tallyCreate` field
- [x] Attempt `POST /api/records/tally` from browser dev tools → expect 403
- [x] Restore DB from backup: `cp data/wood_inventory.db.phase9-backup data/wood_inventory.db`
- [x] Clean up backup

### Phase 10: Documentation & Handoff
- [x] Change ADR-0014 status: `Proposed` → `Accepted`
- [x] Change Spec B status: `Draft — Pending Approval` → `Accepted — Implemented`
- [x] Change Plan B status: `DRAFT — Pending Approval` → `Accepted — Implemented`
- [ ] Append entry to `CHANGELOG.md`:
  ```
  ### Changed
  - **Auth session**: `getAuthenticatedUser` now performs fresh DAO lookup
    on every call. User state changes (deactivation, role, permissions)
    take effect within one request instead of up to 7-day JWT TTL. JWT
    payload role: identity + session-validity proof only. `/api/auth/me`
    returns DB-fresh user with new `reason` field on 401. Pre-existing
    tokens remain compatible.
    Spec: docs/superpowers/specs/2026-10-22-session-invalidation-design.md
    Plan: docs/superpowers/plans/2026-10-22-session-invalidation.md
    Refs: ADR-0013, ADR-0014
  ```
- [ ] Update `docs/SESSION_STATE.md`:
  - Add Item #12 "Session Invalidation (Spec B)" to Completed Modules table
  - Clear "In Progress" if nothing else active
  - Update "Pickup Instructions": "Spec C (User Audit Log Extension) is next. Prerequisites A + B complete."
- [ ] Commit:
  ```
  feat(auth): enforce fresh user lookup on every authenticated request

  Replaces stateless-JWT-as-truth model with DAO-authoritative user state.
  getAuthenticatedUser now performs findById on every call. Deactivation,
  role changes, and permission updates take effect within one request
  (vs up to 7-day JWT TTL). JWT retains identity + session-validity role;
  user data in payload is now decorative. /api/auth/me returns DB-fresh
  user with new reason field on 401. Pre-existing tokens compatible.

  Spec: docs/superpowers/specs/2026-10-22-session-invalidation-design.md
  Plan: docs/superpowers/plans/2026-10-22-session-invalidation.md
  Refs: ADR-0013, ADR-0014
  ```

---

## 4. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| DAO lookup fails during migration/outage → all requests become 401 | Low | High | DAO error handling per Spec A returns null → 401. Existing routes already DB-dependent. Monitor via logs. |
| Latency regression in Supabase mode exceeds target (<100ms) | Medium | Low | Plan Phase 8 includes smoke timing. Follow-up ADR for short-TTL cache if measured impact. |
| Phase 4 test file misses an edge case → security hole | Medium | High | 13 explicit scenarios covering all 6 failure reasons + 3 staleness overrides. Review before marking Phase 4 done. |
| Changes to `/api/auth/me` break client `useAuth` hook | Low | Medium | Success response shape unchanged. Only 401 response gains `reason` field (additive). `useAuth` ignores unknown fields. |
| Pre-existing JWTs with payload roleLevel diverging from DB cause confusion in logs | Medium | Low | Code comment in session.ts explicitly states payload fields decorative. ADR-0014 is reference. |
| `verifySessionToken` accidentally modified during refactor → breaks regression | Medium | High | Test suite includes explicit "verifySessionToken unchanged" assertion. Function left untouched; only `getAuthenticatedUser` changes. |
| Fresh lookup races with simultaneous admin DB mutation | Low | Low | Request-time snapshot; next request gets updated. SQL isolation handles concurrency. Acceptable. |
| LOC budget for `session.ts` exceeded | Medium | Low | Contingency: extract errors + helpers to `session-errors.ts`. Target ≤ 200 LOC. |

---

## 5. Dependencies

- **Blocks:** Spec C (user audit log extension) can proceed in parallel but should merge after this spec; Spec D (admin UI) requires both A + B + C.
- **Blocked by:** None. ADR-0013 (`d6d9012`), Spec A implementation (`95a6fd1`), Spec B (`d65d5ec`) all committed.
- **Related code paths (will touch):**
  - `src/auth/session.ts` (primary)
  - `app/api/auth/me/route.ts`
  - `src/types/index.ts` (add AuthFailureReason, AuthResult)
  - `test/session-invalidation.test.ts` (new)
  - `test/api-auth-me-freshness.test.ts` (new)
- **Related code paths (will NOT touch):**
  - `src/auth/users.ts` (DAO calls already in place from Spec A)
  - `src/persistence/user-repository*.ts` (DAO consumed, not modified)
  - `src/hooks/useAuth.ts` (client-side; consumes `/api/auth/me` response — additive change)
  - `app/api/auth/login/route.ts` (login flow unchanged)
  - `app/api/auth/logout/route.ts` (logout flow unchanged)
  - `app/api/records/route.ts` (benefit propagates automatically)
  - `app/api/records/tally/route.ts` (benefit propagates automatically)

---

## 6. Rollback Plan

If critical issue surfaces post-merge:

1. **Revert the commit** → `src/auth/session.ts` back to stateless JWT verify.
2. **DB side:** no schema change in this spec; nothing to roll back in DB.
3. **Client side:** `useAuth` reverts to accepting payload-cached user (no change needed; client never relied on `reason` field).
4. **In-flight sessions:** continue working with old stateless behavior. No session invalidation.

Rollback = single `git revert`. < 2 minutes.

**Caveat:** During the window between Spec B merge and potential revert, deactivated users will see 401. If reverted, deactivated users regain access for TTL remainder. This is the pre-Spec-B behavior; acceptable fallback.

---

## 7. Done Criteria

- [ ] All Phase 1-10 checkboxes ticked.
- [ ] Verification gate: `drift:check ✅` + `npm test` 0 failures (N ≥ 824) + `build:check` 0 errors.
- [ ] Manual QA matrix (Phase 9) all 6 steps pass with real browser session.
- [ ] ADR-0014 status: `Accepted`.
- [ ] Spec B status: `Accepted — Implemented`.
- [ ] Plan B status: `Accepted — Implemented`.
- [ ] CHANGELOG entry committed.
- [ ] SESSION_STATE updated with Item #12.
- [ ] Commit landed on branch `vicky` with proper references.
- [ ] No regression in: login flow, logout flow, tally permission flag (ADR-0012), any existing API route guard.
- [ ] Latency observed `GET /api/auth/me` < 20ms in SQLite dev mode.

---

## 8. Open Questions (None Blocking)

- Should `extractToken` be exported for potential reuse by other middleware? Defer — only session.ts uses it currently; export if second consumer appears.
- Should humanize mapping live in `session.ts`, `me/route.ts`, or `src/utils/`? Chose `me/route.ts` inline for now — single caller. Extract if second route uses it.
- Should `AuthResult.reason` be mandatory (always present even on success as e.g. `'OK'`)? Chose optional — success case has no reason semantically. TypeScript union covers it.
