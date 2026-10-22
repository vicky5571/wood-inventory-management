# ADR-0014: Fresh User Lookup Per Authenticated Request

**Date:** 2026-10-22
**Status:** Accepted
**Deciders:** Owner + AI pair session

---

## Context

Current session verification (`src/auth/session.ts`) is purely stateless:

- JWT payload carries `userId`, `email`, `name`, `roleLevel`, `title`, `permissions`, `exp`.
- `verifySessionToken` validates HMAC + expiry and returns the payload as `AuthUser`. **Zero DB queries.**
- TTL = 7 days (`DEFAULT_TTL_SECONDS`).

This design predates admin-managed user mutation. Once Spec D (admin UI) ships, admins can deactivate, promote/demote, grant/revoke permissions — but existing JWT tokens continue carrying stale payload for up to 7 days. Three failure modes documented in Spec B §1.2:

1. **Demoted user retains write access** (JWT still has `tallyCreate: true`).
2. **Deactivated user retains full access** (`is_active = false` ignored by stateless verify).
3. **Promoted user cannot access new features** (JWT role not updated).

Spec A (`UserRepository` DAO, merged `95a6fd1`) now provides the ability to perform fresh user lookups by id. The question is how session verification should consume it.

---

## Decision

**Every call to `getAuthenticatedUser(request)` performs a fresh DAO lookup via `UserRepository.findById(jwtUserId)`.** JWT is downgraded from "user data source of truth" to "identity + session-validity proof". User data returned to callers is always the DB record, never the JWT payload.

```ts
export async function getAuthenticatedUser(request: Request): Promise<AuthUser | null> {
  const token = extractToken(request);
  const jwtUser = verifySessionToken(token);   // HMAC + exp check only
  if (!jwtUser) return null;

  const dbUser = await getUserRepository().findById(jwtUser.id);
  if (!dbUser) return null;                     // soft-deleted or deactivated

  const { passwordHash, isActive, createdAt, updatedAt, ...authUser } = dbUser;
  return authUser;                              // DB truth, not JWT snapshot
}
```

**Only two JWT payload fields remain authoritative:**
- `userId` — identifies which user to look up.
- `exp` — expiry; still enforced to prevent indefinite session reuse.

Other payload fields (`email/name/roleLevel/title/permissions`) are kept for wire-format backward compatibility of pre-Spec-B tokens but ignored by authority checks.

**Max staleness window:** request duration (milliseconds), not session TTL (days).

---

## Rejected Alternatives

### Alternative A: Short-expiry JWT with refresh token pattern
**Rejected because:**
- Introduces refresh endpoint, token rotation state machine, race conditions on concurrent refresh, and client-side retry logic.
- OAuth-style complexity for an admin tool with a small user set and non-public API.
- Does not solve the problem instantly — demoted user still has access until next refresh (potentially seconds-to-minutes depending on TTL).
- Fresh lookup is simpler, more immediate, and sufficient for current scale.

### Alternative B: In-memory cache with short TTL (e.g. 10 seconds)
**Rejected because:**
- Reintroduces exactly the staleness window Spec B is designed to eliminate. During the 10-second cache validity, demoted user retains access.
- Cache invalidation on admin mutation would require coupling the admin page (Spec D) to a cache-busting mechanism — adds cross-concern dependency.
- Measured latency without cache is projected acceptable (SQLite < 1ms; Supabase < 50ms). Premature optimization per AGENTS.md YAGNI.
- Can be added later as its own ADR if production measurement shows real impact.

### Alternative C: DB-backed session store (sessions table + cookie session ID)
**Rejected because:**
- Discards the main benefit of stateless JWT (zero session storage).
- Adds write amplification: 1 row per login, cleanup job for expired sessions.
- Requires server-side session invalidation API on logout (currently just clears cookie).
- Fundamentally changes session architecture for marginal gain over fresh lookup.
- Fresh lookup achieves immediate invalidation via the simpler path.

### Alternative D: Status-change broadcast (SSE/WebSocket pushing deactivation to clients)
**Rejected because:**
- Massive infrastructure (persistent connection, broker, fallback) for a problem where next-request freshness is sufficient.
- Only addresses the client-side (UI) staleness, not the server-side guard problem (direct API calls would still bypass).
- Overkill. Defer to post-production if real-time admin feedback becomes a product requirement.

### Alternative E: Shorten JWT TTL from 7 days to minutes
**Rejected because:**
- Does not actually solve the staleness window; shrinks it (e.g. 15min = 15min window of staleness).
- Degrades UX (users re-login constantly) without achieving true freshness.
- Fresh lookup makes TTL irrelevant for invalidation — orthogonal problem. TTL shortening can be defense-in-depth later.

---

## Consequences

### Positive
- **Immediate effect of admin mutations.** Deactivation, role change, permission grant/revoke take effect on the user's next authenticated request (max latency = request round-trip).
- **All authenticated API routes benefit automatically.** No per-route code change. New routes using `getAuthenticatedUser` inherit the behavior.
- **Zero migration burden on existing tokens.** Pre-Spec-B JWTs decode normally; fresh lookup transparently overrides stale payload.
- **Stateless JWT architecture preserved.** No server-side session store, no refresh token machinery, no broadcast infrastructure.
- **Enables safe Spec D (admin UI).** Admin can toggle users with confidence that changes propagate within seconds.
- **Observability win.** New `AuthFailureReason` taxonomy (Spec B §2.3) distinguishes `TOKEN_EXPIRED`, `USER_INACTIVE`, `USER_NOT_FOUND` for logging and future UX.

### Negative / Trade-offs
- **Added latency per authenticated request.** SQLite: ~0.1-0.5ms (indexed PK lookup). Supabase: ~10-50ms (PostgREST HTTPS). Measurable in Supabase mode, negligible in SQLite.
  - Mitigation: Accepted for current scale. ADR for short-TTL cache deferred until measured impact.
- **Hard dependency on DAO availability.** If DAO returns errors (DB outage), every authenticated request fails with 401.
  - Mitigation: DAO already catches errors per Spec A; transient failures return null (401). Monitor via logs. No new coupling introduced — most API routes already DB-dependent.
- **JWT payload fields `email/name/roleLevel/title/permissions` become decorative.** They stay in wire format for backward compat but are ignored by auth decisions. Could mislead future readers.
  - Mitigation: Code comment in `session.ts` documenting payload field roles. ADR itself serves as reference.
- **Not a complete fix for compromised JWTs.** If an attacker steals a valid session cookie before user deactivation, fresh lookup still returns their valid user (because the attacker holds the valid signed token). This ADR fixes admin-side invalidation, not credential-compromise response.
  - Mitigation: Documented as out of scope. Credential compromise is a separate security problem (requires session revocation list, out-of-band logout).

### Follow-up Obligations
- **If measured `/api/auth/me` latency exceeds target (< 100ms Supabase mode) under production load,** open new ADR for short-TTL (e.g. 5-10s) in-memory cache with explicit staleness acknowledgement.
- **If admin UI (Spec D) requires "force logout user X" button for immediate kick-out of actively-browsing users,** that behavior is already achieved by this ADR — deactivation suffices. No separate mechanism needed.
- **If credential-compromise response (stolen JWT) becomes a requirement,** open new ADR for either (a) session revocation list keyed by JWT ID, or (b) migrate to DB-backed sessions (ADR-0014 Alternative C revisited).
- **If TTL shortening is adopted as defense-in-depth,** separate ADR; does not supersede this one.

---

## References

- Spec: `docs/superpowers/specs/2026-10-22-session-invalidation-design.md` (full design detail, especially §2.1-2.3 and §6 risks)
- Plan: `docs/superpowers/plans/2026-10-22-session-invalidation.md` (to be written)
- Related ADRs:
  - ADR-0013 (User Management Architecture) — this ADR implements invariant "admin mutations take effect within seconds".
  - ADR-0012 (Tally Create Permission Flag) — Spec B regression target: `gudang@timber.id` tallyCreate permission must still work.
- Code paths impacted:
  - `src/auth/session.ts` (primary change)
  - `app/api/auth/me/route.ts` (behavior change, contract additive)
  - All routes calling `getAuthenticatedUser` (behavior change, contract unchanged)
- Code paths NOT impacted:
  - `src/auth/users.ts` (Spec A already DAO-backed)
  - `src/types/index.ts` (AuthUser shape stable per ADR-0013 invariant 8)
  - `src/hooks/useAuth.ts` (client-side; consumes `/api/auth/me` response)
  - JWT wire format (HMAC + base64url, unchanged)
