# Design Spec: User Audit Log Extension

**Document:** `docs/superpowers/specs/2026-10-22-user-audit-log-extension-design.md`
**Date:** 2026-10-22
**Status:** Accepted — Implemented
**Related Plan:** `docs/superpowers/plans/2026-10-22-user-audit-log-extension.md`
**Related ADR:** ADR-0013 (User Management Architecture) — this is Spec C of 4.
**Position in Sequence:** Spec C of (A→B→C→D). Depends on Spec A (merged `95a6fd1`). Prerequisite for Spec D.
**Architecture:** Extend `ActivityActionType` SSOT with 5 user-lifecycle action types (`USER_CREATED`, `USER_UPDATED`, `USER_ROLE_CHANGED`, `USER_PERMISSION_CHANGED`, `USER_DEACTIVATED`, `USER_REACTIVATED`). Hook `UserRepository` mutation methods to append structured audit log entries capturing admin identity, target user, before/after values, and reason. Zero schema change — existing `activity_logs` table + `metadata_json` column accommodate all new actions.

---

## 1. Executive Summary & Problem Statement

### 1.1 Context — Current Audit Log State

Project has mature activity logging infrastructure:
- SSOT type `ActivityActionType` (40+ existing actions covering records, sales, production, sorting, suppliers, brokers, contracts, payment forms, settings).
- Interface `ActivityLogEntry` (`src/types/index.ts:754`) with `id`, `action`, `entityId`, `entitySummary`, `operatorName`, `operatorRole`, `timestamp`, and open-ended `metadata?: Record<string, unknown>`.
- Dual-mode persistence: SQLite (`appendActivityLogToDb` in `activity-queries.ts`) + Supabase (bridged via `server-master-data-bridge.ts`).
- `metadata_json` column (`TEXT`/`JSONB`) accepts arbitrary payload.
- Historical records preserve `operatorRole` as a string snapshot per ADR-0013 invariant 2.

### 1.2 The Audit Gap for User Mutations

Spec D admin UI will give admins the power to:
- Create new users.
- Change user `roleLevel` (promote/demote).
- Grant/revoke `permissions.tallyCreate` (and future flags).
- Deactivate / reactivate users.
- Rotate passwords.

**Currently none of these actions are logged.** `UserRepository.create/update/deactivate` from Spec A perform the mutation but emit no activity log entry.

Six months after a security incident, the question "who demoted user X on day Y and why?" cannot be answered. Compliance risk; forensics impossible.

### 1.3 Business Requirement

For Spec D (admin UI) to be production-safe:
- Every admin-initiated mutation on a user record MUST produce an audit log entry.
- Log entries MUST capture: who did it, when, what changed (before + after), target user identity, optional reason/note.
- Audit log entries are immutable (consistent with existing `activity_logs` append-only pattern).
- Password values MUST NEVER appear in log metadata (only `passwordChanged: true` flag).

### 1.4 Scope
- Extend `ActivityActionType` enum with 6 new values (see §2.1).
- Define metadata schema per action type (TypeScript interfaces in SSOT, not inline).
- Hook `UserRepository.create/update/deactivate` methods to emit audit log entries via injected logger function.
- Introduce `AuditedUserRepository` wrapper (decorator pattern) that composes DAO + logger — keeps DAO pure/testable.
- Update seeder (`ensureSeedUsers`) to NOT emit audit entries (bootstrap is not an admin action).
- Add tests for each action type and metadata shape.

### 1.5 Non-Goals (YAGNI)
- No changes to `activity_logs` table schema (metadata JSON handles payload).
- No new `/api/activity/*` routes (existing listing endpoint already queries by action filter).
- No admin UI for user audit (Spec D will render it).
- No log export / archival (future spec).
- No log retention policy / cleanup job (future spec).
- No real-time log streaming (future spec).
- No audit of session events (`USER_LOGIN`, `USER_LOGOUT`, `TOKEN_INVALIDATED`) — separate concern; defer unless Spec D requires it.
- No password hash change audit beyond boolean flag (never store password values; hash change itself = flag event).

---

## 2. Design Decisions

### 2.1 New ActivityActionType Values

Append to `src/types/index.ts:707` `ActivityActionType` union:

```ts
export type ActivityActionType =
  | /* ... existing 40+ values ... */
  | 'USER_CREATED'
  | 'USER_UPDATED'            // non-role, non-permission field changes (name, email, title)
  | 'USER_ROLE_CHANGED'       // explicit role promote/demote (deserves own action)
  | 'USER_PERMISSION_CHANGED' // flag grant or revoke
  | 'USER_DEACTIVATED'        // soft delete (is_active = false)
  | 'USER_REACTIVATED'        // is_active = false → true
  | 'USER_PASSWORD_CHANGED';  // password_hash mutated
```

**Rationale for granularity:** Six specific actions instead of generic `USER_MUTATED` because:
- Admin UI listing filter by action type (existing `listActivityLogsFromDb` supports `actionFilter` param).
- Different actions have different severity (role change > rename; deactivation > permission change).
- Forensic queries ("show all demotions in Q3") become trivial.
- Metadata schema differs per action (role change needs before/after roleLevel; password change needs no values).

### 2.2 Metadata Schemas (SSOT in `src/types/index.ts`)

Each action type has a typed metadata shape:

```ts
export interface UserCreatedMetadata {
  targetUserId: string;
  targetEmail: string;
  targetName: string;
  initialRoleLevel: UserRoleLevel;
  initialPermissions?: UserPermissions;
}

export interface UserUpdatedMetadata {
  targetUserId: string;
  targetEmail: string;
  changedFields: Array<{
    field: 'name' | 'email' | 'title';
    before: string;
    after: string;
  }>;
}

export interface UserRoleChangedMetadata {
  targetUserId: string;
  targetEmail: string;
  before: UserRoleLevel;
  after: UserRoleLevel;
  reason?: string;  // optional admin-supplied note
}

export interface UserPermissionChangedMetadata {
  targetUserId: string;
  targetEmail: string;
  before: UserPermissions | undefined;
  after: UserPermissions | undefined;
  // Human-readable summary of flag deltas, e.g. ["granted: tallyCreate"]
  changes: string[];
  reason?: string;
}

export interface UserDeactivatedMetadata {
  targetUserId: string;
  targetEmail: string;
  previousRoleLevel: UserRoleLevel;
  reason?: string;
}

export interface UserReactivatedMetadata {
  targetUserId: string;
  targetEmail: string;
  roleLevel: UserRoleLevel;
  reason?: string;
}

export interface UserPasswordChangedMetadata {
  targetUserId: string;
  targetEmail: string;
  // NEVER include password value or hash
  reason?: string;  // e.g. "admin reset", "self-change" (future)
}

// Discriminated union for type-safe log reading
export type UserAuditMetadata =
  | UserCreatedMetadata
  | UserUpdatedMetadata
  | UserRoleChangedMetadata
  | UserPermissionChangedMetadata
  | UserDeactivatedMetadata
  | UserReactivatedMetadata
  | UserPasswordChangedMetadata;
```

**Rationale for separate interfaces** (not single generic `UserAuditMetadata` with optional fields): type safety when reading log entries (admin UI differentiates by `action` type and knows exact metadata shape). Follows pattern established in existing codebase.

### 2.3 Audited Repository Wrapper (Decorator Pattern)

**Problem:** `UserRepository` DAO is pure (Spec A). If we embed audit logging inside DAO methods, DAO becomes impure, unit tests need log capture, and bootstrap seeder would also emit entries (unwanted).

**Solution:** Decorator wrapper that holds a reference to inner DAO + logger function. Admin API routes consume wrapper; seeder consumes raw DAO.

```ts
// src/persistence/user-repository-audited.ts
export interface AuditLogger {
  (entry: Omit<ActivityLogEntry, 'id' | 'timestamp'>): Promise<void>;
}

export class AuditedUserRepository extends UserRepository {
  constructor(
    private inner: UserRepository,
    private logger: AuditLogger,
    private actor: AuthUser,  // admin performing the action
  ) {
    super();
  }

  async create(input: Omit<UserRecordRow, 'createdAt' | 'updatedAt'>): Promise<UserRecordRow> {
    const created = await this.inner.create(input);
    await this.logger({
      action: 'USER_CREATED',
      entityId: created.id,
      entitySummary: `Created user ${created.email} (${created.title})`,
      operatorName: this.actor.name,
      operatorRole: this.actor.title,
      metadata: {
        targetUserId: created.id,
        targetEmail: created.email,
        targetName: created.name,
        initialRoleLevel: created.roleLevel,
        initialPermissions: created.permissions,
      } satisfies UserCreatedMetadata,
    });
    return created;
  }

  async update(id: string, patch: Partial<...>): Promise<UserRecordRow> {
    const existing = await this.inner.findById(id);
    if (!existing) throw new UserNotFoundError(id);
    const updated = await this.inner.update(id, patch);

    // Emit zero, one, or multiple log entries based on what changed:
    // - roleLevel changed → USER_ROLE_CHANGED
    // - permissions changed → USER_PERMISSION_CHANGED
    // - passwordHash changed → USER_PASSWORD_CHANGED (no values logged)
    // - name/email/title changed → USER_UPDATED (bundled)
    await this.emitUpdateLogs(existing, updated, patch);
    return updated;
  }

  async deactivate(id: string): Promise<void> {
    const existing = await this.inner.findById(id);
    if (!existing) throw new UserNotFoundError(id);
    await this.inner.deactivate(id);
    await this.logger({
      action: 'USER_DEACTIVATED',
      entityId: id,
      entitySummary: `Deactivated user ${existing.email}`,
      operatorName: this.actor.name,
      operatorRole: this.actor.title,
      metadata: {
        targetUserId: id,
        targetEmail: existing.email,
        previousRoleLevel: existing.roleLevel,
      } satisfies UserDeactivatedMetadata,
    });
  }

  // findByEmail, findById, listAll pass through unchanged (read-only).
  // upsertSeed intentionally NOT exposed (bootstrap bypasses audit).
}
```

**Reactivation path:** No explicit `reactivate` method on DAO. Reactivation = `update(id, { isActive: true })`. Wrapper detects transition `existing.isActive === false && patch.isActive === true` and emits `USER_REACTIVATED` instead of generic `USER_UPDATED`.

### 2.4 Permission Change Delta Calculation

Granular change detection for `USER_PERMISSION_CHANGED`:

```ts
function diffPermissions(
  before: UserPermissions | undefined,
  after: UserPermissions | undefined,
): string[] {
  const changes: string[] = [];
  const allKeys = new Set([
    ...Object.keys(before ?? {}),
    ...Object.keys(after ?? {}),
  ]);
  for (const key of allKeys) {
    const b = (before as any)?.[key];
    const a = (after as any)?.[key];
    if (b === a) continue;
    if (b && !a) changes.push(`revoked: ${key}`);
    else if (!b && a) changes.push(`granted: ${key}`);
    else changes.push(`${key}: ${b} → ${a}`);
  }
  return changes;
}
```

Only emit `USER_PERMISSION_CHANGED` when `changes.length > 0` (avoid log noise for no-op patches).

### 2.5 Actor Identity Source

`AuditedUserRepository` requires `actor: AuthUser` constructor param. Admin API routes supply the authenticated user:

```ts
// Example usage in future Spec D admin API route:
const actor = await getAuthenticatedUser(request);
if (!actor || actor.roleLevel !== 1) return 403;

const auditedRepo = new AuditedUserRepository(
  getUserRepository(),
  async (entry) => { await serverRecordStore.appendActivityLog(entry); },
  actor,
);
await auditedRepo.deactivate(targetUserId);
```

**Rationale:** Explicit actor injection makes the audit trail unambiguous. Alternative (threading actor through method params) pollutes DAO signature for every call-site.

### 2.6 Backward Compatibility

- Existing `activity_logs` schema unchanged.
- Existing `appendActivityLogToDb` function unchanged.
- Existing 40+ `ActivityActionType` values unchanged.
- Spec A `UserRepository` interface unchanged (wrapper composes it, doesn't modify).
- Current `/api/activity` listing endpoint automatically renders new action types once admin UI (Spec D) ships.
- Seeder path (`ensureSeedUsers` → `upsertSeed`) remains unlogged (consistent — seed is not an admin action).

### 2.7 What This Spec Does NOT Change

- `UserRepository` abstract class and existing implementations — unchanged.
- `ActivityLogEntry` interface — unchanged.
- `activity_logs` table schema — unchanged.
- Dual-mode persistence bridge — unchanged.
- Any existing API route — unchanged.
- `src/hooks/useActivityLog.ts` — unchanged (admin UI will consume existing listing endpoint).

---

## 3. API Contract

### 3.1 No New HTTP Endpoints

This spec is pure backend / DAO extension. All audit entries flow through existing `/api/activity` listing endpoint for Spec D consumption.

### 3.2 AuditedUserRepository Public Interface

Same as `UserRepository` (Spec A) for CRUD methods. Additional constructor signature:

```ts
new AuditedUserRepository(
  inner: UserRepository,
  logger: AuditLogger,
  actor: AuthUser,
): UserRepository
```

Factory helper for standard usage:

```ts
export function createAuditedUserRepository(actor: AuthUser): UserRepository {
  const inner = getUserRepository();
  const logger: AuditLogger = async (entry) => {
    await serverRecordStore.appendActivityLog(entry);
  };
  return new AuditedUserRepository(inner, logger, actor);
}
```

### 3.3 Existing Endpoints (UNCHANGED)

- `GET /api/activity` — automatically returns new action types in listings.
- `GET /api/activity?action=USER_DEACTIVATED` — filter works out of the box.

---

## 4. Acceptance Criteria

### 4.1 Functional
- [ ] Creating a user via `AuditedUserRepository.create` → one `USER_CREATED` entry logged with correct metadata.
- [ ] Updating user name only → one `USER_UPDATED` entry with `changedFields: [{ field: 'name', before, after }]`.
- [ ] Updating user roleLevel only → one `USER_ROLE_CHANGED` entry (NOT `USER_UPDATED`).
- [ ] Updating user permissions only → one `USER_PERMISSION_CHANGED` entry with correct `changes` array.
- [ ] Updating password only → one `USER_PASSWORD_CHANGED` entry; metadata contains NO password / hash values.
- [ ] Updating multiple fields (role + name + password) in one call → emits 3 separate entries, one per category.
- [ ] Deactivating user → one `USER_DEACTIVATED` entry.
- [ ] Reactivating user (`update(id, { isActive: true })` from inactive) → one `USER_REACTIVATED` entry (NOT `USER_UPDATED`).
- [ ] No-op update (patch same as existing) → zero log entries.
- [ ] Permission patch with identical before/after → zero entries (diffPermissions returns `[]`).
- [ ] Seeder (`ensureSeedUsers`) → zero user-audit entries (bypasses wrapper).
- [ ] Audit entry `operatorName` and `operatorRole` match the admin actor, NOT the target user.

### 4.2 Non-Functional
- [ ] All existing 828+ tests still pass.
- [ ] `src/persistence/user-repository-audited.ts` < 250 LOC.
- [ ] `src/types/index.ts` added LOC ~60 (metadata interfaces).
- [ ] No new drift violations.
- [ ] No breaking change to existing `UserRepository` interface.
- [ ] No password or password hash value ever present in any log entry metadata.

### 4.3 Backward Compatibility
- [ ] `activity_logs` schema unchanged.
- [ ] Existing `/api/activity` listing continues working.
- [ ] Seeder behavior unchanged.
- [ ] Raw `getUserRepository()` continues to be used by auth layer (login, session lookup) without wrapping — read ops do not need audit.

---

## 5. Verification Checklist

- [ ] `npm run drift:check` → `✅ No drift detected`
- [ ] `npm test` → `pass N, fail 0` where N ≥ 828 + new tests
- [ ] `npm run build:check` → 0 TypeScript errors
- [ ] New test file `test/user-repository-audited.test.ts`:
  - [ ] `create` emits one `USER_CREATED` entry; metadata shape matches `UserCreatedMetadata`
  - [ ] `update` with name change only → one `USER_UPDATED`; changedFields correct
  - [ ] `update` with roleLevel change only → one `USER_ROLE_CHANGED`
  - [ ] `update` with permissions grant only → one `USER_PERMISSION_CHANGED` with `changes: ['granted: tallyCreate']`
  - [ ] `update` with permissions revoke → `changes: ['revoked: tallyCreate']`
  - [ ] `update` with permissions no-op (same before/after) → zero entries
  - [ ] `update` with passwordHash → one `USER_PASSWORD_CHANGED`; metadata keys match `UserPasswordChangedMetadata`; no `passwordHash` field anywhere in metadata
  - [ ] `update` with role + name + password simultaneously → 3 entries (one per category)
  - [ ] `update(id, { isActive: true })` where existing.isActive=false → `USER_REACTIVATED` (not `USER_UPDATED`)
  - [ ] `deactivate` → one `USER_DEACTIVATED` entry
  - [ ] `deactivate` on non-existent id → throws `UserNotFoundError`; zero log entries
  - [ ] Actor identity in log matches constructor-supplied `actor`, not target
  - [ ] Logger is called exactly once per logical operation (not per DB call)
- [ ] New test file `test/activity-log-user-metadata.test.ts`:
  - [ ] Each `UserAuditMetadata` variant serializes to JSON and round-trips through `activity_logs.metadata_json`
  - [ ] `diffPermissions` returns `[]` for identical inputs
  - [ ] `diffPermissions` returns `['granted: X']` for new flag
  - [ ] `diffPermissions` returns `['revoked: X']` for removed flag
  - [ ] `diffPermissions` returns `['X: true → false']` for value change
- [ ] Manual QA:
  - Instantiate `AuditedUserRepository` via Node script
  - Create → update role → revoke permission → deactivate
  - Query `GET /api/activity?action=USER_ROLE_CHANGED` → verify entry present with correct metadata

---

## 6. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Logger throws error → DAO mutation already committed but no audit trail | Medium | High | Wrapper catches logger errors, logs to `console.error`, re-throws. Admin UI gets 500; user re-tries. Alternative (wrap in transaction) rejected: dual-mode persistence makes cross-store transactions impractical. |
| Developer uses raw `getUserRepository()` in admin API route (bypasses audit) | Medium | High | Code review discipline. Add JSDoc on raw getter: "For auth lookup only. Admin mutations MUST use `createAuditedUserRepository(actor)`." Spec D plan includes grep check. |
| Password hash accidentally leaked into metadata | Low | Critical | `UserPasswordChangedMetadata` interface has NO `passwordHash` field. TypeScript compile prevents inclusion. Test explicitly asserts no `passwordHash` key in metadata. |
| Permission diff produces massive `changes` array for complex permissions object | Low (now) | Low | Current scope = 1 flag (`tallyCreate`). Will revisit when 5-flag RBAC migration triggers (per ADR-0012). |
| Log table bloat from frequent updates | Low | Low | Admin mutations are rare events (not high-QPS). Existing log retention policy applies (not in this spec). |
| Reactivation detection miss when patch includes `isActive: true` but existing already active | Low | Low | Wrapper checks `existing.isActive === false && patch.isActive === true` strict condition. Idempotent reactivation = `USER_UPDATED` with no changedFields = zero entries. |
| Actor identity spoofing (admin claims to be someone else) | Low | High | `actor` injected from `getAuthenticatedUser` which is DB-authoritative post-Spec-B. Cannot be forged client-side. |
| Metadata JSON schema evolution breaks old log reads | Medium (future) | Low | Discriminated union means new fields = optional additions; old entries still readable. Breaking changes require versioned schema field — flagged for future ADR if needed. |

---

## 7. Open Questions (None Blocking)

- Should `reason?: string` field be mandatory for destructive actions (deactivate, role change)? Deferred to Spec D UX decision — DB accepts optional, UI can enforce.
- Should login/logout events also be logged (`USER_LOGIN`, `USER_LOGOUT`)? Deferred — not required for admin audit scope; separate security concern.
- Should permission grant include "effective guard impact" (e.g. "user can now access `/tally`")? Deferred — admin UI (Spec D) can compute from `changes` field at render time; not needed in persisted data.

---

## 8. Change Log Entry Preview

```
feat(auth): extend activity log with 7 user-lifecycle action types

Adds USER_CREATED, USER_UPDATED, USER_ROLE_CHANGED,
USER_PERMISSION_CHANGED, USER_DEACTIVATED, USER_REACTIVATED,
USER_PASSWORD_CHANGED to ActivityActionType SSOT. Introduces
AuditedUserRepository decorator wrapping UserRepository DAO to emit
structured audit entries on admin mutations. Metadata schemas typed
per action for forensic clarity. Password values never logged.
Zero schema change; uses existing activity_logs.metadata_json column.

Spec: docs/superpowers/specs/2026-10-22-user-audit-log-extension-design.md
Plan: docs/superpowers/plans/YYYY-MM-DD-user-audit-log-extension.md
Refs: ADR-0013
```
