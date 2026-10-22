# Design Spec: Session Invalidation on User State Changes

**Document:** `docs/superpowers/specs/2026-10-22-session-invalidation-design.md`
**Date:** 2026-10-22
**Status:** Accepted — Implemented
**Related Plan:** `docs/superpowers/plans/2026-10-22-session-invalidation.md`
**Related ADR:** ADR-0013 (User Management Architecture) — this is Spec B of 4.
             NEW ADR-0014 (Session Freshness Strategy) — to be written as part of this spec execution.
**Position in Sequence:** Spec B of (A→B→C→D). Depends on Spec A (merged `95a6fd1`). Prerequisite for Spec D (admin UI).
**Architecture:** Augment stateless JWT session verification with a server-side user lookup to enforce user state (active/inactive, role, permissions) at request time. Replaces current pattern where JWT payload is sole source of truth (up to 7-day staleness).

---

## 1. Executive Summary & Problem Statement

### 1.1 Context — Current Session Verification (Pre-Spec B)

`src/auth/session.ts` implements a stateless JWT pattern:

- Session token = `base64url(JSON payload).base64url(HMAC-SHA256 signature)`
- Payload contains full user snapshot: `userId`, `email`, `name`, `roleLevel`, `title`, `permissions`, `exp`
- TTL: 7 days (constant `DEFAULT_TTL_SECONDS`)
- `verifySessionToken(token)` → decodes payload, verifies HMAC, checks expiry. **Zero DB queries.** Returns `AuthUser` directly from JWT.
- `getAuthenticatedUser(request)` → extract cookie → call `verifySessionToken`. All API routes consume this.
- `GET /api/auth/me` → calls `verifySessionToken` and returns payload user as JSON. **Also zero DB queries.**

### 1.2 The Staleness Problem

Three concrete scenarios where current behavior is wrong:

**Scenario 1 — Demoted user retains write access.**
Admin demotes `gudang@timber.id` from Level 2 (`tallyCreate: true`) to Level 3. User's JWT still carries old payload. User continues submitting Tally manifests via `POST /api/records/tally` for up to 7 days until session expires. Guard checks `user.permissions?.tallyCreate` from JWT — passes.

**Scenario 2 — Deactivated user retains full access.**
Admin deactivates (`is_active = false`) a user who was fired. Spec A confirmed `findByEmail` filters out inactive users at login, but **existing sessions remain valid**. User cannot log in again, but their currently-open browser tab continues working for 7 days.

**Scenario 3 — Promoted user cannot access new features.**
Admin promotes `admin@timber.id` from Level 2 to Level 1. New permissions do NOT apply until user logs out + in. User sees "Access Denied" when clicking Settings despite being Level 1 in DB. Confusing UX; support burden.

### 1.3 Business Requirement

For an administrative UI (Spec D) to be production-safe, **user state changes made by admin must take effect within seconds, not days.** Specifically:
- Deactivation = immediate loss of access on next request.
- Role change = immediate reflection in UI permissions.
- Permission grant/revoke = immediate reflection in capability guards.

### 1.4 Scope
- Modify `getAuthenticatedUser` to fetch fresh user record from DAO on every authenticated request.
- Modify `GET /api/auth/me` to return fresh DB user, not JWT payload.
- Define JWT payload role: **identity + session validity only** (userId + exp + signature). Permissions/role carried in JWT remain as fallback hint but server authority is DAO.
- Introduce `AuthenticationError` taxonomy: `TOKEN_INVALID`, `TOKEN_EXPIRED`, `USER_INACTIVE`, `USER_NOT_FOUND`.
- Add integration tests covering staleness scenarios 1-3.
- New ADR-0014 documenting the fresh-lookup-per-request decision vs alternatives.

### 1.5 Non-Goals (YAGNI)
- No change to JWT signing/HMAC/encoding (same wire format, backward-compat tokens).
- No change to `COOKIE_NAME`, cookie flags (httpOnly/sameSite/path).
- No session store (Redis/DB-backed sessions) — stateless JWT remains the transport.
- No refresh token pattern.
- No MFA, SSO, OAuth.
- No rate limiting on auth endpoints (separate concern).
- No change to login flow (`POST /api/auth/login` still issues JWT via `createSessionToken`).
- No change to `UserRepository` DAO (already in Spec A).
- No admin UI (that is Spec D).
- No audit log for session events (that is Spec C scope).

---

## 2. Design Decisions

### 2.1 Fresh Lookup Per Request (ADR-0014 Primary Decision)

**New behavior:** `getAuthenticatedUser(request)` performs fresh DAO lookup on every call.

```ts
export async function getAuthenticatedUser(request: Request): Promise<AuthUser | null> {
  const token = extractToken(request);
  const jwtUser = verifySessionToken(token);  // unchanged: HMAC + exp check
  if (!jwtUser) return null;                   // invalid / expired JWT

  // NEW: fresh lookup from DAO (Spec A).
  const dbUser = await getUserRepository().findById(jwtUser.id);
  if (!dbUser) return null;                    // user deleted (unlikely) or deactivated

  // Return DB truth, not JWT snapshot.
  const { passwordHash, isActive, createdAt, updatedAt, ...authUser } = dbUser;
  return authUser;
}
```

**Rationale:** Every authenticated request now reflects current DB state. Max staleness = request duration (milliseconds), not session TTL (days). Deactivation and role/permission changes take effect on next request.

### 2.2 JWT Payload Role Redefinition

**Before Spec B:** JWT payload = source of truth for user identity + role + permissions.

**After Spec B:** JWT payload = session validity proof. Fields `email/name/roleLevel/title/permissions` in payload become **hints only** (used nowhere authoritative; kept for backward-compat token decoding).

Only two fields in payload remain authoritative:
- `userId` — identifies which user to look up.
- `exp` — session expiry; still enforced by HMAC + exp check.

Pre-existing tokens (issued before Spec B) continue to decode successfully — fresh lookup overrides their stale payload automatically.

### 2.3 Error Taxonomy

Introduce typed error states for better observability:

```ts
export type AuthFailureReason =
  | 'NO_TOKEN'          // no cookie present
  | 'TOKEN_MALFORMED'   // wrong format / bad base64
  | 'TOKEN_INVALID'     // HMAC mismatch
  | 'TOKEN_EXPIRED'     // exp < now
  | 'USER_NOT_FOUND'    // userId has no DB row
  | 'USER_INACTIVE';    // DB row has is_active = false
```

`getAuthenticatedUser` keeps `Promise<AuthUser | null>` signature for backward compat. A new `getAuthenticatedUserDetailed` returns `{ user: AuthUser | null; reason?: AuthFailureReason }` for callers that want to log/report the failure cause. Current call-sites unchanged; `/api/auth/me` is first adopter.

### 2.4 `/api/auth/me` Behavior Change

**Before:** Returns `verifySessionToken(token)` output (JWT payload user).

**After:**
```ts
const { user, reason } = await getAuthenticatedUserDetailed(request);
if (!user) {
  return NextResponse.json({
    success: false,
    error: humanize(reason),      // e.g. 'Akun Anda telah dinonaktifkan'
    reason,                        // machine-readable for client
  }, { status: 401 });
}
return NextResponse.json({ success: true, user });
```

**Impact:** Client-side `useAuth` hook will get fresh user on every mount (and on manual re-check). When admin changes a user, that user's next page navigation triggers `/api/auth/me` → sees new state. If deactivated: client receives 401 → logout flow kicks in.

### 2.5 All Authenticated API Routes Benefit Automatically

All current API routes that use `getAuthenticatedUser(request)` get fresh lookup for free. No per-route change needed:

- `POST /api/records` (Level 1 only guard)
- `POST /api/records/tally` (Level 1 OR tallyCreate guard)
- Any future route using `getAuthenticatedUser`

Example: deactivated user tries `POST /api/records/tally` → `getAuthenticatedUser` returns null → route returns 401. **Zero route modifications required.**

### 2.6 Performance Impact

Each authenticated request adds 1 DAO lookup (`findById`).

**SQLite:** indexed PK lookup; ~0.1-0.5 ms per call. Negligible.

**Supabase:** 1 PostgREST query over HTTPS; ~10-50 ms per call. Measurable but acceptable for admin-managed system (not high-QPS public API).

**Not mitigated by:** No caching. Spec deliberately avoids introducing in-memory cache because it reintroduces staleness (the problem we are solving). Future spec may add short TTL cache (e.g. 10s) if measured latency is unacceptable.

### 2.7 Backward Compatibility

- Existing JWT tokens in user browsers: continue to work. First request after Spec B deploy triggers fresh lookup; if user still active and ID matches, request succeeds normally.
- Logout flow: unchanged.
- Login flow: unchanged (still issues JWT via `createSessionToken`).
- API route handlers that call `getAuthenticatedUser`: unchanged signatures, now async DAO call under the hood (already async, no caller change needed).

### 2.8 What This Spec Does NOT Change

- `src/types/index.ts` — AuthUser shape stable (per ADR-0013 invariant 8).
- `src/hooks/useAuth.ts` — client-side hook unchanged; it still consumes `/api/auth/me` response.
- `computePermissions` — unchanged (reads from `user` prop).
- `createSessionToken`, `verifySessionToken` HMAC format — unchanged.
- `COOKIE_NAME`, cookie flags — unchanged.
- DAO (`UserRepository`) — unchanged (consumed only).
- Login/logout API routes — unchanged.

---

## 3. API Contract

### 3.1 `GET /api/auth/me` (CHANGED)

**Request:** unchanged (cookie-based).

**Responses:**

| Status | Body | Trigger |
|---|---|---|
| 200 | `{ success: true, user: AuthUser }` | Valid session + user active in DB |
| 401 | `{ success: false, error: 'Belum masuk.', reason: 'NO_TOKEN' }` | No cookie |
| 401 | `{ success: false, error: 'Sesi tidak valid.', reason: 'TOKEN_INVALID' }` | HMAC mismatch |
| 401 | `{ success: false, error: 'Sesi kadaluarsa.', reason: 'TOKEN_EXPIRED' }` | exp < now |
| 401 | `{ success: false, error: 'Akun tidak ditemukan.', reason: 'USER_NOT_FOUND' }` | userId has no DB row |
| 401 | `{ success: false, error: 'Akun telah dinonaktifkan.', reason: 'USER_INACTIVE' }` | DB `is_active = false` |

Client treats all 401 responses identically for current UX (redirect to login). `reason` field is additive for future client UX enhancements (e.g. show different message for deactivation) and server-side logging.

### 3.2 All Other Authenticated Endpoints (BEHAVIOR CHANGE, Contract UNCHANGED)

Endpoints returning 401 for `getAuthenticatedUser === null` will now **also** return 401 when:
- User deactivated between JWT issuance and request time.
- User deleted (edge case; soft-delete is default per ADR-0013).

Response body shape unchanged. Impact: deactivated user experiences same 401 flow as expired-session user.

### 3.3 `POST /api/auth/login` (UNCHANGED)

Login flow unchanged. User authenticates, DAO returns active user, `createSessionToken(user)` issues JWT.

---

## 4. Acceptance Criteria

### 4.1 Functional
- [ ] Scenario 1 (demote): user demoted from Level 2+tallyCreate to Level 3 → next `POST /api/records/tally` returns 403 (DB authority wins over JWT snapshot).
- [ ] Scenario 2 (deactivate): user deactivated → next request from existing session returns 401 with reason `USER_INACTIVE`.
- [ ] Scenario 3 (promote): user promoted Level 2 → Level 1 → next `/api/auth/me` returns new roleLevel; UI permission guards re-evaluate.
- [ ] Pre-existing JWT tokens (issued before Spec B) continue to work normally for active users.
- [ ] Login flow unchanged (POST /api/auth/login still issues JWT).
- [ ] Logout flow unchanged.
- [ ] `GET /api/auth/me` for valid active user returns DB-fresh data (not JWT snapshot).
- [ ] `/api/auth/me` 401 responses include `reason` field.

### 4.2 Non-Functional
- [ ] All 807+ existing tests still pass.
- [ ] `src/auth/session.ts` remains < 250 LOC after refactor (currently 100 LOC; projected +50 LOC).
- [ ] `app/api/auth/me/route.ts` remains < 250 LOC (currently ~30 LOC).
- [ ] No new drift violations.
- [ ] SQLite-mode `/api/auth/me` latency < 50ms (DB lookup < 1ms).
- [ ] Supabase-mode `/api/auth/me` latency < 100ms (DB lookup via PostgREST).

### 4.3 Backward Compatibility
- [ ] JWT payload format unchanged on wire — pre-Spec-B tokens decode successfully.
- [ ] `AuthUser` SSOT shape unchanged (per ADR-0013 invariant 8).
- [ ] All existing API routes behave identically for active users with unchanged state.
- [ ] `COOKIE_NAME` and cookie flags unchanged.

---

## 5. Verification Checklist

- [ ] `npm run drift:check` → `✅ No drift detected`
- [ ] `npm test` → `pass N, fail 0` where N ≥ 807 + new tests
- [ ] `npm run build:check` → 0 TypeScript errors
- [ ] New test file `test/session-invalidation.test.ts`:
  - [ ] Valid JWT + active user → returns user with DB fields
  - [ ] Valid JWT + inactive user (soft-deleted) → returns null with reason `USER_INACTIVE`
  - [ ] Valid JWT + userId not in DB → returns null with reason `USER_NOT_FOUND`
  - [ ] Invalid HMAC → returns null with reason `TOKEN_INVALID`
  - [ ] Expired exp → returns null with reason `TOKEN_EXPIRED`
  - [ ] No cookie → returns null with reason `NO_TOKEN`
  - [ ] JWT payload role mismatch with DB (user promoted) → returned user has DB role
  - [ ] JWT payload permissions mismatch with DB (admin granted tallyCreate) → returned user has DB permissions
  - [ ] Round-trip: issue token with Level 2 → demote user to Level 3 in DB → verify returns Level 3
- [ ] New test file `test/api-auth-me-freshness.test.ts`:
  - [ ] GET /api/auth/me as active user → 200 with DB data
  - [ ] Deactivate user → next GET /api/auth/me → 401 with reason `USER_INACTIVE`
  - [ ] Change role in DB → next GET /api/auth/me → 200 with new role
  - [ ] Grant permission in DB → next GET /api/auth/me → 200 with new permissions
- [ ] Manual QA:
  - Login as `admin@timber.id`
  - Via SQL: `UPDATE users SET is_active = 0 WHERE email = 'admin@timber.id'`
  - Refresh browser tab → should redirect to login (401)
  - Via SQL: `UPDATE users SET is_active = 1 WHERE email = 'admin@timber.id'`
  - Login again → works

---

## 6. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Added DAO lookup per request causes measurable latency | High (expected) | Low | SQLite PK lookup < 1ms; Supabase ~10-50ms. Acceptable for admin-tool scale. Future cache spec if needed. |
| DAO lookup fails due to DB outage → all requests become 401 | Low | High | `findById` already catches errors (per Spec A). Transient DB errors return null → 401; recoverable by retry. Monitor via logs. |
| Deactivated user mid-request causes race condition (request in flight) | Low | Low | Fresh lookup is per-request start; in-flight requests complete normally. Next request fails. Acceptable. |
| `/api/auth/me` becomes DB-dependent → cannot serve during migration/outage | Medium | Medium | Existing behavior: endpoint failed stateless anyway if DB unreachable (other routes needed DB). No new coupling. |
| Attacker with stolen JWT can enumerate user IDs | Low | Low | `findById` with non-existent ID returns `USER_NOT_FOUND`; same timing as valid lookup. No enumeration leak. |
| Pre-Spec-B JWT contains obsolete `permissions` field for a user that was later granted new ones | Expected | Zero | Fresh lookup overrides JWT snapshot. The point of this spec. |
| Session TTL still 7 days — long-abandoned sessions outlive deactivation window | By design | Low | Fresh lookup makes TTL irrelevant for inactive-user protection. Short TTL would be defense-in-depth; deferred as follow-up. |
| Load test uncovers unexpected N+1 at admin page listing all users (Spec D) | Medium | Low (future) | Spec D will batch-fetch or paginate. Not Spec B's concern. |

---

## 7. ADR-0014 Preview

This spec introduces one architectural decision substantial enough for its own ADR:

**ADR-0014: Fresh User Lookup Per Authenticated Request**

- **Decision:** Every call to `getAuthenticatedUser` performs a DAO lookup. JWT is identity + session-validity proof only; user state is DB-authoritative.
- **Rejected alternatives:**
  - *Short-expiry JWT with refresh token:* Adds complexity (refresh endpoint, token rotation, race conditions) for marginal gain over simple fresh lookup. Overkill for admin-tool scale.
  - *In-memory cache with short TTL (e.g. 10s):* Reintroduces staleness window during which the problem persists. Can be added later as perf optimization if measured need.
  - *DB-backed session store (sessions table):* Discards stateless JWT advantage, adds write amplification per login/logout, requires session cleanup job. YAGNI for current scale.
  - *Status-change broadcast (SSE/WebSocket pushing deactivation events to clients):* Massive infrastructure for a case where next-request freshness is sufficient.
- **Consequence:** All authenticated routes gain user-state freshness for free. Minor latency added. Spec D (admin UI) can safely toggle users with confidence that changes take effect immediately.
- **Follow-up:** If latency becomes measurable concern, open ADR for short-TTL cache (10s target) as perf optimization.

Full ADR document to be written as Phase 1 of Plan B.

---

## 8. Open Questions (None Blocking)

- Should `AuthFailureReason` be user-facing or internal only? Chose both — `reason` field in response for client UX, humanized `error` field for display. Client decides which to show.
- Should we shorten default TTL to e.g. 24 hours as defense-in-depth? Deferred — fresh lookup is the primary guard; TTL shortening can be separate spec.
- Should admin have "force logout user X" button? Deferred to Spec D UX decision.

---

## 9. Change Log Entry Preview

```
feat(auth): enforce fresh user lookup on every authenticated request

Replaces stateless JWT-as-truth model with DAO-authoritative user state.
getAuthenticatedUser now performs DB findById on every call, ensuring
deactivation, role changes, and permission updates take effect within one
request (vs up to 7 days under previous JWT-cached model). JWT retains
identity+session-validity role; user data in payload is now a hint only.
/api/auth/me returns DB-fresh user. Pre-existing tokens remain compatible.

Spec: docs/superpowers/specs/2026-10-22-session-invalidation-design.md
Plan: docs/superpowers/plans/YYYY-MM-DD-session-invalidation.md
Refs: ADR-0013, ADR-0014
```
