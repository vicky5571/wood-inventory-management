# Design Spec: Admin User Management UI

**Document:** `docs/superpowers/specs/2026-10-22-admin-user-management-ui-design.md`
**Date:** 2026-10-22
**Status:** Draft — Pending Approval
**Related Plan:** TBD — `docs/superpowers/plans/YYYY-MM-DD-admin-user-management-ui.md`
**Related ADR:** ADR-0013 (User Management Architecture) — this is Spec D of 4.
**Position in Sequence:** Spec D of (A→B→C→D). Depends on Spec A (`95a6fd1`), Spec B (`d890e27`), Spec C (`cd7cc45`), TD-002 fix (`43b1e3e`). Final spec in the sequence.
**Architecture:** New admin-only page `/users` for Level 1 manager to list, create, edit, deactivate/reactivate, reset password, change role, and grant/revoke permission flags for all users in the system. New admin-only API routes under `/api/users/*` consuming `AuditedUserRepository` from Spec C. Enforces all 8 shared invariants from ADR-0013. Audit log viewer per user via existing `/api/activity` endpoint.

---

## 1. Executive Summary & Problem Statement

### 1.1 Context — Current Admin Workflow

Admin can authenticate and operate system (manager@timber.id, Level 1). Current admin surface:
- `/settings` — app-wide settings (companyName, PPh rate, broker fee, etc.)
- `/activity` — read-only audit log listing

What is MISSING for admin:
- Any UI to see list of all users (4 preset users today, growing).
- Any UI to create new users (requires source edit + redeploy).
- Any UI to change role or permissions (requires DB SQL console).
- Any UI to reset password (requires DB SQL + manual hash computation).
- Any UI to deactivate departing employees (requires DB SQL).
- Any UI to view audit trail scoped to a specific user.

### 1.2 Business Requirement

Client needs admin page for user lifecycle management per original ADR-0013 context. All prerequisites now in place:
- **Spec A** (DB-backed users via DAO) ✅ LIVE
- **Spec B** (fresh-lookup → admin changes take effect in seconds) ✅ LIVE
- **Spec C** (audit trail on every mutation) ✅ LIVE
- **TD-001, TD-002** (DAO patch docs + inactive lookup) ✅ Resolved

Spec D is the UX layer binding all above into a single admin workflow.

### 1.3 Scope

**New page:** `/users` — guarded by `minRoleLevel: 1`.

**New API routes** under `/api/users/*`:
- `GET /api/users` — list all users (admin-only, includes inactive if `?includeInactive=1`)
- `POST /api/users` — create new user
- `GET /api/users/[id]` — single user detail
- `PATCH /api/users/[id]` — update user (name, email, title, roleLevel, permissions)
- `POST /api/users/[id]/password` — reset password
- `POST /api/users/[id]/deactivate` — soft delete
- `POST /api/users/[id]/reactivate` — restore from soft delete
- `GET /api/users/[id]/activity` — audit log entries scoped to this user (filter by `entityId` + user action types)

**New UI components** (atomic, each < 250 LOC):
- `UsersPage` (page coordinator, target < 250 LOC)
- `UserListTable` (table with filter: active/inactive)
- `UserCreateModal` (form: email, name, roleLevel, title, initial permissions, initial password)
- `UserEditModal` (form: name, email, title, roleLevel, permissions)
- `PasswordResetModal` (admin-set new password, 2 fields: new + confirm)
- `DeactivateConfirmModal` (confirm with target email display + optional reason note)
- `PromoteToLevel1ConfirmModal` (special confirmation UI per invariant 4)
- `UserAuditDrawer` (slide-out panel showing activity log filtered by user id)

**Nav addition:** item `{ id: 'users', labelId: 'Pengguna', labelZh: '用户管理', href: '/users', minRoleLevel: 1 }` in `admin` section.

### 1.4 Non-Goals (YAGNI)

- No bulk operations (bulk deactivate, bulk role change) — single-user flow only.
- No user search (listing + client-side filter sufficient for current scale; dozens of users at most).
- No user profile picture / avatar upload.
- No self-service password change (admin-only; user calls admin to reset).
- No email verification flow (admin creates user, admin communicates credentials out of band).
- No pagination (list all users; current scale small).
- No CSV import / export of users.
- No 2FA / MFA setup.
- No OAuth / SSO integration.
- No role expiration or time-bound permissions.
- No bulk audit log export.
- No real-time notifications (admin opens page to see state).

---

## 2. Design Decisions

### 2.1 ADR-0013 Invariants Enforcement

Each of 8 shared invariants from ADR-0013 maps to a specific guard/UX element:

| # | Invariant | Enforcement Location |
|---|---|---|
| 1 | User ID immutable | API `PATCH /api/users/[id]`: ignore `id` field in body if present; schema check |
| 2 | Historical records preserve role-at-time | Already true (Spec C audit log + ADR-0010 operator_role snapshot). No additional work. |
| 3 | Soft delete only | API `POST /api/users/[id]/deactivate` uses `AuditedUserRepository.deactivate` (never DROP/DELETE). No "delete" UI button. |
| 4 | Last-Level-1 guard + no self-demote + promote confirmation | Server-side guard in `PATCH` + UI confirmation modal (details §2.3) |
| 5 | Permission flag auto-reset on role change | Server-side in `PATCH /api/users/[id]`: when `roleLevel` changes, strip all `permissions.*` to defaults. UI shows warning before confirmation. |
| 6 | Permission UI exposed only for applicable role | `UserEditModal`: `tallyCreate` toggle hidden if `roleLevel === 1` (shown as "always true" info) or `roleLevel === 3` (shown with warning if user insists). |
| 7 | No 5th permission flag without RBAC migration ADR | Enforced at type level — `UserPermissions` interface defines only `tallyCreate` currently. New flag = new ADR. |
| 8 | `UserRoleLevel` type unchanged | Enforced by SSOT; UI role selector offers only {1, 2, 3}. |

### 2.2 Server-Side Guards (`/api/users/*`)

All routes require:
```ts
const actor = await getAuthenticatedUser(request);  // Spec B fresh lookup
if (!actor) return 401;
if (actor.roleLevel !== 1) return 403;
```

Then wrap DAO access via `createAuditedUserRepository(actor)` from Spec C (never raw `getUserRepository()` for mutations).

**Additional invariant guards per route:**

**`PATCH /api/users/[id]`:**
- If `patch.roleLevel !== undefined && patch.roleLevel !== existing.roleLevel`:
  - **No self-demote**: `if (id === actor.id) return 403 'Tidak dapat mengubah role sendiri'`
  - **Last Level 1**: `if (existing.roleLevel === 1 && patch.roleLevel !== 1) { count = await repo.listAll().filter(u => u.roleLevel === 1 && u.isActive).length; if (count <= 1) return 409 'Minimal 1 Level 1 aktif harus tersedia' }`
  - **Permission auto-reset**: if role changes, force `patch.permissions = {}` before calling DAO.
- If `patch.permissions !== undefined`:
  - **Schema check**: reject unknown keys (prevent 5th flag). Only `tallyCreate` allowed.

**`POST /api/users/[id]/deactivate`:**
- **No self-deactivate**: `if (id === actor.id) return 403`
- **Last Level 1**: if target is active Level 1, verify count > 1.

**`POST /api/users/[id]/reactivate`:**
- Calls `AuditedUserRepository.update(id, { isActive: true })` → wrapper detects transition and emits `USER_REACTIVATED` (Spec C §2.3).
- No special guard beyond admin check.

**`POST /api/users`:**
- Email uniqueness enforced at DAO layer (Spec A `DuplicateEmailError` → 409).
- Password strength: minimum 8 chars (basic; see §2.5 for rationale on scope).
- Default `isActive: true`.
- `id` generated server-side: `usr-${randomBase36(10)}`.

**`POST /api/users/[id]/password`:**
- Body: `{ newPassword: string }` (minimum 8 chars).
- Server hashes via `src/auth/password.ts` `hashPassword` (preserves SHA-256, consistent with Spec A).
- Calls `AuditedUserRepository.update(id, { passwordHash })` → wrapper emits `USER_PASSWORD_CHANGED` (no plaintext ever logged).

### 2.3 UI Confirmation Flows

**Deactivate confirmation:**
- Modal shows target email + title.
- Admin types `DEACTIVATE` into text field to enable Confirm button (prevent accidental click).
- Optional `reason` note (free text, max 200 chars) stored in `metadata.reason`.

**Promote to Level 1 confirmation:**
- Modal with warning banner: "Level 1 memiliki akses penuh termasuk reset database. Yakin promote [email] ke Level 1?"
- Admin must click "Yakin Promote" (not just OK).
- Logged as `USER_ROLE_CHANGED` with `before: 2, after: 1`.

**Role change (demote 1→2, 1→3, 2→3, 3→2, etc.) confirmation:**
- Modal shows: "Semua permission flag akan di-reset. Admin harus grant ulang jika perlu."
- Standard confirm button.

**Password reset confirmation:**
- Admin enters new password (type=password) + confirmation field.
- Submit disabled until both match + minimum 8 chars.
- Success toast: "Password untuk [email] berhasil direset. Beritahu pengguna out of band."

### 2.4 UI Components Specification

**`UsersPage` (page coordinator, target ~180 LOC):**
- Hook `useAuth` for actor identity.
- Fetch `GET /api/users?includeInactive=1`.
- State: `selectedUser`, `activeModal` (enum: `null | 'create' | 'edit' | 'password' | 'deactivate' | 'promote' | 'audit'`).
- Delegates rendering to `UserListTable` + modals.

**`UserListTable` (~150 LOC):**
- Columns: Email, Nama, Role, Permissions (badges), Status (active/inactive), Last Updated, Actions.
- Row actions: Edit, Reset Password, Deactivate/Reactivate, View Audit.
- Filter toggle: "Tampilkan nonaktif".
- Sort: by email, by roleLevel, by updatedAt.

**`UserCreateModal` (~200 LOC):**
- Form fields: Email, Nama, Title, Role selector (1/2/3), Password + confirm, Permissions checkboxes (only shown if applicable to role).
- Client-side validation: email format, password min 8, confirm match, title non-empty.
- Submit → POST /api/users → close on success + refresh list.

**`UserEditModal` (~200 LOC):**
- Form fields: Name, Email, Title, Role selector, Permissions (per invariant 6 — only applicable).
- Role selector triggers warning modal if demote/promote-to-1.
- Permission section grayed out with info banner if roleLevel === 1 ("Level 1 selalu memiliki semua akses").
- Submit → PATCH /api/users/[id] → close on success + refresh.

**`PasswordResetModal` (~100 LOC):**
- Two password fields + confirm button.
- POST /api/users/[id]/password → success toast.

**`DeactivateConfirmModal` (~100 LOC):**
- Target email display, confirmation text input, reason note.
- POST /api/users/[id]/deactivate → close + refresh.

**`PromoteToLevel1ConfirmModal` (~80 LOC):**
- Dedicated modal invoked by `UserEditModal` when admin selects roleLevel 1 for a non-Level-1 user.
- Returns promise resolving to boolean.

**`UserAuditDrawer` (~150 LOC):**
- Side drawer (not modal) showing activity log entries for the selected user.
- Fetch `GET /api/users/[id]/activity`.
- Renders chronological list with action badge, timestamp, operator, humanized metadata summary.

### 2.5 Password Strength Policy

**MVP:** minimum 8 characters, no additional constraints (no mandatory special char / mixed case).

**Rationale:** Admin-managed system with small user set; threat model = internal misuse not public web attack. Stricter policy = UX friction without proportionate security gain. Hash remains SHA-256 (per Spec A §2.6 and ADR-0012 follow-up; algorithm upgrade is separate future ADR).

**Future hardening:** separate ADR when (a) user count grows significantly, (b) client requires compliance (ISO 27001, SOC 2), or (c) weak passwords cause actual incident.

### 2.6 Audit Log Scoping

`GET /api/users/[id]/activity` filters existing `activity_logs` table:

```sql
SELECT * FROM activity_logs
WHERE tenant_id = 'default-tenant'
  AND entity_id = ?
  AND action LIKE 'USER_%'
ORDER BY timestamp DESC
LIMIT 100
```

Returns array of `ActivityLogEntry`. UI renders via `UserAuditDrawer` with humanized labels (e.g. `USER_ROLE_CHANGED` → "Role diubah: Level 2 → Level 1 oleh Budi Santoso").

Zero schema change.

### 2.7 What This Spec Does NOT Change

- `AuthUser` SSOT shape — unchanged.
- `UserRoleLevel` type — unchanged (invariant 8).
- `UserPermissions` interface — unchanged (invariant 7).
- `UserRepository` DAO methods — unchanged (consumed via `AuditedUserRepository` only).
- `activity_logs` table schema — unchanged.
- Login/logout/session routes — unchanged.
- Existing admin pages (`/settings`, `/activity`) — unchanged.
- `/tally`, `/ledger`, other operational pages — unchanged.
- Nav sidebar section structure — only 1 item added to existing `admin` section.

---

## 3. API Contract

### 3.1 `GET /api/users`

**Query:** `?includeInactive=1` (optional) — if present, return all users; otherwise active only.

**Guard:** 401 if no session; 403 if `actor.roleLevel !== 1`.

**Response 200:**
```json
{ "success": true, "data": [{ "id": "...", "email": "...", "name": "...", "roleLevel": 2, "title": "...", "permissions": { "tallyCreate": true }, "isActive": true, "createdAt": "...", "updatedAt": "..." }, ...] }
```

Response excludes `passwordHash` from each user (never leak hashes).

### 3.2 `POST /api/users`

**Body:**
```json
{ "email": "newuser@timber.id", "name": "New User", "title": "Level 2", "roleLevel": 2, "password": "secure123", "permissions": { "tallyCreate": true } }
```

**Responses:**
| Status | Body | Trigger |
|---|---|---|
| 201 | `{ success: true, data: AuthUser }` | Created |
| 400 | `{ success: false, error: 'Email format invalid' }` | Validation |
| 400 | `{ success: false, error: 'Password minimum 8 karakter' }` | Validation |
| 401 | `{ success: false, error: 'Unauthorized' }` | No session |
| 403 | `{ success: false, error: 'Hanya Level 1 yang dapat membuat user' }` | Not Level 1 |
| 409 | `{ success: false, error: 'Email sudah digunakan oleh user aktif' }` | DAO `DuplicateEmailError` |
| 500 | `{ success: false, error: '...' }` | DB error |

### 3.3 `PATCH /api/users/[id]`

**Body:** partial update. Only `name`, `email`, `title`, `roleLevel`, `permissions` accepted. `id`, `isActive`, `passwordHash` rejected.

**Responses:**
| Status | Body | Trigger |
|---|---|---|
| 200 | `{ success: true, data: AuthUser }` | Updated |
| 400 | `{ success: false, error: 'Field X tidak dapat diubah via endpoint ini' }` | Forbidden field |
| 403 | `{ success: false, error: 'Tidak dapat mengubah role sendiri' }` | Self-demote attempt |
| 404 | `{ success: false, error: 'User tidak ditemukan' }` | DAO `UserNotFoundError` |
| 409 | `{ success: false, error: 'Minimal 1 Level 1 aktif harus tersedia' }` | Last Level 1 guard |
| 409 | `{ success: false, error: 'Email sudah digunakan oleh user aktif' }` | DAO `DuplicateEmailError` |

### 3.4 `POST /api/users/[id]/password`

**Body:** `{ "newPassword": "newsecret123" }`

**Responses:**
| Status | Body | Trigger |
|---|---|---|
| 200 | `{ success: true, data: { id: "..." } }` | Reset ok |
| 400 | `{ success: false, error: 'Password minimum 8 karakter' }` | Validation |

Audit log entry `USER_PASSWORD_CHANGED` emitted with no password values.

### 3.5 `POST /api/users/[id]/deactivate`

**Body:** `{ "reason": "Pegawai mengundurkan diri" }` (optional)

**Responses:**
| Status | Body | Trigger |
|---|---|---|
| 200 | `{ success: true }` | Deactivated |
| 403 | `{ success: false, error: 'Tidak dapat menonaktifkan akun sendiri' }` | Self-deactivate |
| 409 | `{ success: false, error: 'Minimal 1 Level 1 aktif harus tersedia' }` | Last Level 1 guard |

### 3.6 `POST /api/users/[id]/reactivate`

**Body:** `{ "reason": "Pegawai kembali" }` (optional)

**Responses:**
| Status | Body |
|---|---|
| 200 | `{ success: true, data: AuthUser }` |
| 404 | `{ success: false, error: 'User tidak ditemukan' }` |

### 3.7 `GET /api/users/[id]/activity`

**Query:** `?limit=100` (default 100, max 500)

**Response 200:** `{ success: true, data: ActivityLogEntry[] }` filtered to actions matching `USER_%` and `entity_id === id`.

### 3.8 Existing Endpoints (UNCHANGED)

- `GET /api/activity` — continues working; admin UI can filter via existing query params for user-wide view.
- All other `/api/*` endpoints — unchanged.

---

## 4. Acceptance Criteria

### 4.1 Functional
- [ ] Nav sidebar shows "Pengguna" item under Admin section ONLY for Level 1 user.
- [ ] `/users` page requires Level 1 session (redirect to `/` or show 403 for others).
- [ ] Level 1 can list all users (default: active only; toggle shows inactive too).
- [ ] Level 1 can create new user with required fields; email uniqueness enforced.
- [ ] Level 1 can edit user name/email/title.
- [ ] Level 1 can change role level with promote-to-1 confirmation modal.
- [ ] Level 1 cannot demote themselves (UI disabled + server 403).
- [ ] Level 1 cannot deactivate themselves (UI disabled + server 403).
- [ ] Attempt to demote last Level 1 → 409 with clear error message.
- [ ] Attempt to deactivate last Level 1 → 409 with clear error message.
- [ ] Role change auto-resets `permissions` to empty (visible in UI + confirmed in DB).
- [ ] Permission `tallyCreate` toggle only shown for Level 2 (hidden/disabled for Level 1 and 3).
- [ ] Password reset: new password hashed and stored; no plaintext ever in log metadata.
- [ ] Deactivate user → user cannot login (next attempt returns 401 USER_INACTIVE per Spec B).
- [ ] Reactivate user → login works again.
- [ ] Audit drawer shows chronological USER_* entries for selected user with humanized text.
- [ ] All admin mutations create entries via `AuditedUserRepository` (not raw DAO).

### 4.2 Non-Functional
- [ ] All 860+ existing tests still pass.
- [ ] Each new UI component < 250 LOC (coordinator page < 250 enforced strictly).
- [ ] Each new API route handler file < 250 LOC.
- [ ] No new drift violations.
- [ ] Response time `GET /api/users` < 100ms SQLite mode (indexed scan + 10 users).
- [ ] Password strength validation at client AND server (defense in depth).
- [ ] No `passwordHash` field in any API response.

### 4.3 Backward Compatibility
- [ ] Existing user sessions remain valid.
- [ ] Existing `/api/activity` endpoint continues working.
- [ ] `AuthUser` SSOT shape unchanged.
- [ ] `UserRoleLevel`, `UserPermissions` unchanged.
- [ ] Nav sidebar for Level 2/3 users unchanged (users item hidden via `minRoleLevel: 1`).
- [ ] Login/logout flow unchanged.

---

## 5. Verification Checklist

- [ ] `npm run drift:check` → `✅ No drift detected`
- [ ] `npm test` → `pass N, fail 0` where N ≥ 860 + ~40 new tests
- [ ] `npm run build:check` → 0 TypeScript errors, 1 new route group under `/users` in build output
- [ ] API test file `test/api-users.test.ts`:
  - [ ] All 7 endpoints: happy path + 401/403/409/404 scenarios
  - [ ] Guard: non-Level-1 → 403 on every endpoint
  - [ ] Last Level 1 guard: cannot demote via PATCH, cannot deactivate
  - [ ] Self-demote guard: Level 1 cannot change own role
  - [ ] Self-deactivate guard: Level 1 cannot deactivate self
  - [ ] Permission auto-reset: PATCH with roleLevel change clears permissions
  - [ ] Password response never includes `passwordHash`
  - [ ] Audit log emitted via `AuditedUserRepository` (verified via listing endpoint)
- [ ] Component test file `test/users-page-permission-visibility.test.ts`:
  - [ ] `tallyCreate` toggle hidden when roleLevel === 1
  - [ ] `tallyCreate` toggle hidden/warned when roleLevel === 3
  - [ ] `tallyCreate` toggle visible when roleLevel === 2
- [ ] Manual QA matrix (browser):
  - Login as `manager@timber.id` → sidebar shows Pengguna → `/users` works
  - Login as `admin@timber.id` → sidebar hides Pengguna → `/users` direct URL redirects/403
  - Create new user `test@test.id` Level 2 with tallyCreate → login works → `/tally` works
  - Edit user: promote `admin@timber.id` to Level 1 → confirmation modal → confirm → verify role in DB
  - Demote the newly-promoted Level 1 → system blocks (only 1 Level 1 scenario) if applicable
  - Reset password for `gudang@timber.id` → login with old fails, new succeeds
  - Deactivate `gudang@timber.id` → login fails → reactivate → login works
  - Open audit drawer for any user → entries show with correct humanized text

---

## 6. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Admin UI call uses raw `getUserRepository()` bypassing audit | Medium | High | JSDoc on raw getter (already from Spec C); grep check in Plan Phase 7. API route template reviewed. |
| Password leaked in API response or log | Low | Critical | Response shape omits `passwordHash` via destructure; grep assertion in Plan. Server never echoes password back. |
| Last-Level-1 guard race condition (two concurrent demotes) | Low | High | Server guard reads count at check time; subsequent demote fails. SQLite serializes; Supabase postgres row-level consistency sufficient. |
| Admin accidentally promotes someone to Level 1 and locks themselves out | Low | Medium | Promote-to-1 confirmation modal with explicit warning. Admin can re-demote later via another Level 1 (now exists). |
| User count grows → listing endpoint becomes slow | Low (now) | Low | Current scale ~10 users. Pagination deferred (non-goal). Trigger: >50 users = add pagination spec. |
| TypeScript strict mode breaks when new metadata interfaces consumed in UI | Medium | Low | Discriminated union from Spec C already type-safe. UI casts via `switch(entry.action)`. |
| Modal LOC exceeds 250 limit | Medium | Low | Extract sub-components (confirmation body, form section). Supplier pattern as reference. |
| Nav filter from ADR-0010 doesn't hide user item for Level 2 | Low | Medium | Explicit `minRoleLevel: 1` on nav item; existing `filterNavSections` handles rest. Smoke test. |
| Supabase mode untested in CI | Medium | Low | Document; smoke test in Supabase staging after merge. |
| `isActive` field accidentally exposed as patchable → bypass deactivate flow | Low | Medium | PATCH endpoint rejects `isActive` in body (dedicated POST routes for de/reactivate). Explicit in handler. |

---

## 7. Open Questions (None Blocking)

- Should `reason` field be mandatory for destructive actions (deactivate, role change)? MVP: optional. Spec D UX can enforce later via server-side 400 if desired.
- Should audit drawer show operator avatar / highlight actor identity vs target? Deferred — plain text sufficient for MVP.
- Should listing endpoint support search box? Deferred — client-side filter in `UserListTable` sufficient at current scale.

---

## 8. Change Log Entry Preview

```
feat(auth): add admin user management UI with 7 user lifecycle API routes

Introduces /users page (Level 1 only) + /api/users/* routes consuming
AuditedUserRepository from Spec C. Enforces all 8 ADR-0013 invariants:
soft delete only, no self-demote, last-Level-1 guard, promote-to-1
confirmation UI, permission auto-reset on role change, permission UI
exposed per applicable role. Audit drawer scoped per user. Password
hashing via existing SHA-256 utility; no plaintext in responses or
logs. Finalizes user management roadmap (Specs A→B→C→D).

Spec: docs/superpowers/specs/2026-10-22-admin-user-management-ui-design.md
Plan: docs/superpowers/plans/YYYY-MM-DD-admin-user-management-ui.md
Refs: ADR-0013
```
