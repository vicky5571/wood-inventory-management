# Design Spec: Tally Create Permission Flag

**Document:** `docs/superpowers/specs/2026-10-22-tally-create-permission-design.md`
**Date:** 2026-10-22
**Status:** Draft — Pending Approval
**Related Plan:** `docs/superpowers/plans/2026-10-22-tally-create-permission.md`
**Related ADR:** ADR-0012 (Tally Create Permission Flag)
**Architecture:** Add optional `permissions.tallyCreate` boolean flag on `AuthUser`, orthogonal to existing `roleLevel` hierarchy. Introduce derived `canCreateTally` permission. New API endpoint `POST /api/records/tally` with relaxed guard. Zero changes to existing roleLevel semantics.

---

## 1. Executive Summary & Problem Statement

### 1.1 Context
Client requested that one warehouse staff member (nominally Level 2) be allowed to create Tally Lapangan manifests at `/tally`. Current guard allows only Level 1 (Owner). All other Level 2 restrictions remain unchanged.

### 1.2 Business Problem
Field tally entry currently bottlenecks on the Owner. Warehouse staff receive trucks and perform physical measurement but cannot submit the manifest, forcing Owner to re-enter data from paper notes. Delegation is required for one trusted warehouse user.

### 1.3 Scope
- Add optional `permissions` capability object on `AuthUser` SSOT.
- Add `tallyCreate` boolean flag inside `permissions`.
- Add derived `canCreateTally` permission in `computePermissions`.
- Add new preset user (`gudang@timber.id`) with `permissions: { tallyCreate: true }`.
- Replace `canWrite` guard at `/tally` with `canCreateTally`.
- Add new API endpoint `POST /api/records/tally` with relaxed guard.
- JWT payload carries `permissions` field.

### 1.4 Non-Goals (YAGNI)
- No change to `canWrite`, `canViewAll`, `isMonitorOnly` semantics.
- No change to other write surfaces (`/ledger`, `/sales`, `/pricing`, `/settings`).
- No admin UI for user management or password reset.
- No RBAC migration (deferred until ≥5 flags).
- No role rename or renumbering.
- No change to activity log schema (`operator_role` stays `user.title`).
- No permission for EDIT or DELETE of tally manifests (CREATE only).

---

## 2. Design Decisions

### 2.1 SSOT Schema Change (per ADR-0012)

Extend `AuthUser` with optional `permissions` object:

```ts
// src/types/index.ts
export type UserRoleLevel = 1 | 2 | 3;  // UNCHANGED

export interface UserPermissions {
  tallyCreate?: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  roleLevel: UserRoleLevel;
  title: string;
  permissions?: UserPermissions;  // NEW: optional, defaults to {}
}
```

Rationale for `permissions` as object (not flat `tallyCreate` on AuthUser): grouping anticipates future flags without polluting the top-level user namespace. Named interface `UserPermissions` is exported for guard composition.

### 2.2 Derived Permission (per ADR-0012)

```ts
// src/hooks/useAuth.ts
export function computePermissions(user: AuthUser | null | undefined) {
  const roleLevel = user?.roleLevel;
  return {
    canWrite: roleLevel === 1,                                       // Unchanged
    canViewAll: roleLevel === 1 || roleLevel === 2,                  // Unchanged
    isMonitorOnly: roleLevel === 3,                                  // Unchanged
    canCreateTally: roleLevel === 1 || Boolean(user?.permissions?.tallyCreate),  // NEW
  };
}
```

**Signature change:** `computePermissions(roleLevel)` → `computePermissions(user)`. Callers of the function (currently only `useAuth` itself) must be updated. Function remains pure and testable.

**Precedence rule:** Level 1 Owner always has `canCreateTally: true` regardless of `permissions` field (backward compat — Owner never loses write access).

### 2.3 Preset User

Append to `PRESET_USERS` in `src/auth/users.ts`:

```ts
{
  id: 'usr-warehouse-04',
  email: 'gudang@timber.id',
  name: 'Operator Gudang',
  roleLevel: 2,
  title: 'Level 2 — Operator Gudang',
  permissions: { tallyCreate: true },
  passwordHash: hashPassword('password123'),
}
```

Password identical to other presets (demo-grade). Real password rotation requires file edit + redeploy (acknowledged limitation, see ADR-0012 Follow-up).

### 2.4 Session / JWT Payload

`src/auth/session.ts` must propagate `permissions`:

```ts
interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  roleLevel: UserRoleLevel;
  title: string;
  permissions?: UserPermissions;  // NEW: carried through JWT
  // ... existing fields
}
```

Backward compat: existing JWTs without `permissions` field decode as `permissions: undefined` → `canCreateTally` falls back to `roleLevel === 1` check only. No forced re-login.

### 2.5 API Endpoint — `POST /api/records/tally`

**New file:** `app/api/records/tally/route.ts`

Guard:
```ts
if (!user) return 401;
if (user.roleLevel !== 1 && !user.permissions?.tallyCreate) {
  return 403 'Akses ditolak: Anda tidak memiliki izin untuk tally lapangan';
}
```

Accepts same payload shape as `POST /api/records` for `action: undefined` (create manifest). Payload validation reuses existing `validateDiscrepancyInputs`. Delegates to `serverRecordStore.saveManifest()`.

**Rationale for separate endpoint (not branching in existing route):**
- Isolates relaxed guard to one surface. Existing `/api/records` keeps strict `roleLevel !== 1 → 403` guard untouched, preventing accidental privilege escalation on `action: 'reset'` or other non-tally POST payloads.
- Audit trail clearer: endpoint name indicates intent.
- Trade-off: slight code duplication for manifest-create path (~20 LOC); acceptable per ADR-0012.

### 2.6 UI Guard at `/tally`

In `app/tally/page.tsx`:
- Line 21: `const { canCreateTally, user } = useAuth();` (replace `canWrite`)
- Line 71: `if (!canCreateTally) return toast.error('Akses Ditolak', 'Anda tidak memiliki izin untuk tally lapangan.');`
- Line 183: `{canCreateTally ? <SubmitButton /> : <MonitorModeBanner />}`
- Line 191: Update banner text: `'Mode Monitor: Anda tidak memiliki izin untuk menyimpan tally lapangan.'`
- Fetch target changed from `POST /api/records` to `POST /api/records/tally` (in `useWoodRecords.saveManifest` or inline).

### 2.7 `useWoodRecords.saveManifest` Routing

**Decision needed in plan phase:** two options:

**Option A — route all manifest saves to `/tally` endpoint:**
Hook unchanged; endpoint determined by hook. Risk: non-tally manifest creation (e.g., future `/ledger` create flow) would hit relaxed guard.

**Option B — differentiate by call-site:**
Add optional `endpoint` parameter: `saveManifest(payload, { source: 'tally' | 'ledger' })`. `/tally/page.tsx` passes `source: 'tally'`; hook chooses `/api/records/tally` vs `/api/records`.

**Recommendation:** Option B. Explicit source prevents accidental privilege leak if other pages add manifest-create later. Plan will implement Option B.

---

## 3. API Contract

### 3.1 `POST /api/records/tally`

**Request:**
```http
POST /api/records/tally
Content-Type: application/json
Cookie: <auth session>

{
  "id": "MF-...",
  "receiptDate": "2026-10-22",
  "truckPlateNumber": "KB 8888 XX",
  "supplierName": "...",
  "forestryDocNumber": "SKSHH-...",
  "receiptNumber": "RCP-...",
  "contractNumber": "CTR-...",
  "freightRatePerM3": 0,
  "brokerFee": 0,
  "paymentStatus": "UNPAID",
  "items": [{ ... ManifestFormInput items ... }]
}
```

**Responses:**
| Status | Body | Trigger |
|---|---|---|
| 201 | `{ success: true, data: ManifestWithItems }` | Guard passed, manifest persisted |
| 400 | `{ success: false, error: 'Invalid JSON payload' }` | Malformed body |
| 400 | `{ success: false, error: 'Invalid payload' }` | Not an object |
| 400 | `{ success: false, error: '<validation message>' }` | Discrepancy validation failed |
| 401 | `{ success: false, error: 'Unauthorized: Sesi tidak ditemukan atau kadaluarsa' }` | No valid session |
| 403 | `{ success: false, error: 'Akses ditolak: Anda tidak memiliki izin untuk tally lapangan' }` | Level 2/3 without `tallyCreate` |
| 500 | `{ success: false, error: '<message>' }` | Persistence error |

### 3.2 `POST /api/records` (UNCHANGED)

Existing endpoint keeps strict guard `user.roleLevel !== 1 → 403`. No modification.

### 3.3 `POST /api/auth/login` Response

Response body now includes `permissions` when present:
```json
{ "success": true, "user": { ..., "permissions": { "tallyCreate": true } } }
```

Absent for users without permissions (backward compat).

---

## 4. Acceptance Criteria

### 4.1 Functional
- [ ] Login as `gudang@timber.id / password123` succeeds; session carries `permissions.tallyCreate: true`.
- [ ] At `/tally`, warehouse user sees Save button (not Monitor Mode banner).
- [ ] Warehouse user submits valid tally payload → 201, manifest persisted, visible in `/ledger`.
- [ ] Warehouse user attempts `POST /api/records` directly (bypass tally endpoint) → 403.
- [ ] Level 2 user without `permissions.tallyCreate` (existing `admin@timber.id`) sees Monitor Mode banner at `/tally`.
- [ ] Level 2 user without permission posting to `/api/records/tally` directly → 403.
- [ ] Level 3 user at `/tally` → Monitor Mode banner (unchanged).
- [ ] Level 1 Owner at `/tally` → Save button works (unchanged).
- [ ] Activity log entry for warehouse-user-created manifest shows `operatorName: 'Operator Gudang'`, `operatorRole: 'Level 2 — Operator Gudang'`.
- [ ] Logout + login as `admin@timber.id` → no behavior change anywhere (regression check).

### 4.2 Non-Functional
- [ ] Session cookie backward compat: existing JWT without `permissions` field decodes without error.
- [ ] All existing 768 tests still pass.
- [ ] No new drift violations.
- [ ] `app/tally/page.tsx` remains < 250 LOC.
- [ ] `app/api/records/tally/route.ts` remains < 250 LOC.
- [ ] `src/hooks/useAuth.ts` remains < 250 LOC.

---

## 5. Verification Checklist

- [ ] `npm run drift:check` → `✅ No drift detected`
- [ ] `npm test` → `pass N, fail 0` where N ≥ 768 (new tests added)
- [ ] `npm run build:check` → 0 errors, Next.js build clean
- [ ] New test file `test/auth-permissions.test.ts` — `computePermissions` covers 5 scenarios:
  - Level 1 Owner → `canCreateTally: true`
  - Level 2 without permissions → `canCreateTally: false`
  - Level 2 with `permissions.tallyCreate: true` → `canCreateTally: true`
  - Level 2 with `permissions: {}` → `canCreateTally: false`
  - Level 3 with `permissions.tallyCreate: true` (unusual but legal) → `canCreateTally: true`
  - `null` user → `canCreateTally: false`
- [ ] New test file `test/api-records-tally.test.ts` — endpoint guard:
  - No session → 401
  - Level 1 → 201
  - Level 2 with permission → 201
  - Level 2 without permission → 403
  - Level 3 → 403
- [ ] Manual QA: login as each preset user, verify sidebar + `/tally` + `/ledger` behavior per matrix in Section 4.1.

---

## 6. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Existing JWT sessions lack `permissions` field after deploy | High | Low | Field is optional; `computePermissions` handles undefined gracefully. No forced re-login. |
| Developer adds future manifest-create page using `saveManifest` without `source` param → accidentally hits relaxed endpoint | Medium | Medium | Make `source` parameter required (TypeScript enforcement). Document in hook JSDoc. |
| Flag proliferation (next capability added as `permissions.X` without discipline) | Medium | Medium | ADR-0012 Follow-up: 5th flag triggers mandatory RBAC migration ADR. |
| Warehouse user leaves company; password rotation requires deploy | High | Low (acknowledged) | Documented in ADR-0012. Future admin UI is separate spec. |
| Supabase/SQLite `operator_role` column receives new string `'Level 2 — Operator Gudang'` | Low | Low | Column is `TEXT`, no enum constraint. Verified in `src/persistence/sqlite/migrations.ts:165`. |
| User gudang bypasses UI, POSTs directly to `/api/records` for non-tally action | Low | Low | `/api/records` guard unchanged (`roleLevel !== 1 → 403`); warehouse user still blocked there. |

---

## 7. Open Questions (None Blocking)

- Should `permissions.tallyCreate` eventually allow EDIT of own tally manifest (not just CREATE)? **Deferred.** Client confirmed CREATE-only sufficient.
- Should audit log include a dedicated `permissionsSnapshot` field for forensics? **Deferred.** Current `operatorName`/`operatorRole` sufficient.

---

## 8. Change Log Entry Preview

```
feat(auth): add tally create permission flag for warehouse operator

Introduces optional `AuthUser.permissions.tallyCreate` boolean flag,
orthogonal to roleLevel hierarchy, allowing designated Level 2 users to
create Tally Lapangan manifests. New endpoint POST /api/records/tally
isolates relaxed guard. Existing roleLevel semantics unchanged.

Spec: docs/superpowers/specs/2026-10-22-tally-create-permission-design.md
Plan: docs/superpowers/plans/2026-10-22-tally-create-permission.md
Refs: ADR-0012
```
