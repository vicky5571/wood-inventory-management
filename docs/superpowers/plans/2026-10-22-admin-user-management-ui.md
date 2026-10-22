# Admin User Management UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete admin user management capability (Spec D) consisting of 7 dedicated API routes under `/api/users/*` and an admin-only web interface at `/users` for Level 1 managers to list, create, edit, deactivate/reactivate, reset passwords, change role levels, and view user audit logs while strictly enforcing all 8 ADR-0013 invariants.

**Architecture:** The admin UI is backed by 7 dedicated Next.js API routes that consume `AuditedUserRepository` (from Spec C) for all mutations, ensuring every action automatically appends structured audit trail records. Server-side guards enforce Level 1 role access, self-demotion prevention, last-Level-1 protection, and automatic permission flag reset on role changes. The UI is built using atomic components (<250 LOC each) composed by the `UsersPage` coordinator.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript (strict), Node.js native `node:sqlite` + Supabase PostgREST, Tailwind CSS + design tokens, Node.js native test runner (`node:test` + `node:assert/strict`).

**Spec:** `docs/superpowers/specs/2026-10-22-admin-user-management-ui-design.md`
**Status:** Accepted — Implemented

## Global Constraints

- Tech Stack: Next.js 15 App Router, React 19, Node.js 26.8.1 native test runner.
- SSOT Invariant: All domain contracts, request payloads, and API response types MUST reside in `src/types/index.ts`. No duplicate inline interfaces.
- God File Invariant (<250 LOC): Every component, coordinator, and API route handler must strictly remain under 250 LOC.
- Invariant 1 (ID Immutability): `AuthUser.id` never changes after creation; `id` is ignored in PATCH bodies.
- Invariant 3 (Soft Delete Only): Users are deactivated (`isActive: false`), never hard-deleted. No DELETE route exists.
- Invariant 4 (Last Level 1 Guard & No Self-Demotion): Level 1 cannot change their own role or deactivate themselves; at least 1 active Level 1 must always remain. Dedicated confirmation modal required for Level 1 promotions.
- Invariant 5 (Permission Auto-Reset): Role changes automatically clear all permission flags (`permissions = {}`).
- Invariant 6 (Permission UI Scoping): `tallyCreate` toggle only exposed for Level 2 (hidden/disabled for Level 1 and 3).
- Invariant 7 (Strict Permission Schema): Only `tallyCreate` allowed in `UserPermissions` (no ad-hoc 5th flag).
- Invariant 8 (Role Hierarchy Intact): `UserRoleLevel` remains `1 | 2 | 3`.
- Password Security: Minimum 8 characters. Passwords and `passwordHash` MUST NEVER be leaked in any API response or audit log.
- Audit Discipline: All user mutations in API routes MUST use `createAuditedUserRepository(actor)` from Spec C. Raw DAO mutation calls are forbidden.

---

## File Manifest

| File | Action | LOC Est. | Notes |
|---|---|---|---|
| `src/types/index.ts` | Modify | +45 LOC | Add `ManagedUser`, payloads, and API response shapes (SSOT) |
| `src/persistence/sqlite/activity-queries.ts` | Modify | +25 LOC | Add `listUserActivityLogsFromDb(db, userId, limit)` |
| `src/persistence/server-master-data-bridge.ts` | Modify | +20 LOC | Add `getUserActivityLogs(userId, limit)` |
| `src/persistence/server-record-store.ts` | Modify | +10 LOC | Delegate `getUserActivityLogs(userId, limit)` |
| `app/api/users/route.ts` | Create | ~120 LOC | `GET` (list users) & `POST` (create user) |
| `app/api/users/[id]/route.ts` | Create | ~140 LOC | `GET` (detail) & `PATCH` (update profile/role/permissions) |
| `app/api/users/[id]/password/route.ts` | Create | ~80 LOC | `POST` (reset password) |
| `app/api/users/[id]/deactivate/route.ts` | Create | ~80 LOC | `POST` (soft delete) |
| `app/api/users/[id]/reactivate/route.ts` | Create | ~80 LOC | `POST` (restore from soft delete) |
| `app/api/users/[id]/activity/route.ts` | Create | ~60 LOC | `GET` (scoped user audit logs) |
| `src/components/users/UserListTable.tsx` | Create | ~180 LOC | Table with role badges, status, and action buttons |
| `src/components/users/UserCreateModal.tsx` | Create | ~190 LOC | Modal form for creating a new user |
| `src/components/users/PromoteToLevel1ConfirmModal.tsx` | Create | ~80 LOC | Dedicated two-step confirmation modal for Level 1 promotion |
| `src/components/users/UserEditModal.tsx` | Create | ~200 LOC | Modal form for editing user profile & role |
| `src/components/users/PasswordResetModal.tsx` | Create | ~110 LOC | Modal form for setting a new password |
| `src/components/users/DeactivateConfirmModal.tsx` | Create | ~110 LOC | Confirmation modal requiring text input "DEACTIVATE" |
| `src/components/users/UserAuditDrawer.tsx` | Create | ~160 LOC | Slide-out drawer displaying user-scoped audit trail |
| `app/users/page.tsx` | Create | ~190 LOC | Admin users page coordinator (<250 LOC) |
| `src/components/layout/nav-config.ts` | Modify | +4 LOC | Add `users` item to `admin` section with `minRoleLevel: 1` |
| `test/users-ssot-types.test.ts` | Create | ~60 LOC | Type validation tests |
| `test/user-activity-queries.test.ts` | Create | ~90 LOC | Scoped audit query tests |
| `test/api-users-list-create.test.ts` | Create | ~180 LOC | Unit/Integration tests for `GET /api/users` & `POST /api/users` |
| `test/api-users-detail-patch.test.ts` | Create | ~220 LOC | Unit/Integration tests for `GET /api/users/[id]` & `PATCH /api/users/[id]` |
| `test/api-users-password.test.ts` | Create | ~110 LOC | Unit/Integration tests for `POST /api/users/[id]/password` |
| `test/api-users-deactivate-reactivate.test.ts` | Create | ~150 LOC | Unit/Integration tests for deactivation and reactivation |
| `test/api-users-activity.test.ts` | Create | ~100 LOC | Unit/Integration tests for `GET /api/users/[id]/activity` |
| `test/user-components.test.ts` | Create | ~190 LOC | Structural and contract tests for all user management UI components |
| `CHANGELOG.md` | Modify | +15 LOC | Add Spec D entry under `[Unreleased]` |
| `docs/SESSION_STATE.md` | Modify | +25 LOC | Mark Spec D complete and update session state |

---

## 3. Implementation Checklist

### Phase 1: SSOT Type Updates (`src/types/index.ts`)

**Files:**
- Modify: `src/types/index.ts`
- Test: `test/users-ssot-types.test.ts`

**Interfaces:**
- Produces: `ManagedUser`, `CreateUserPayload`, `UpdateUserPayload`, `ResetPasswordPayload`, `DeactivateUserPayload`, `ReactivateUserPayload`, `UsersApiResponse`, `UserApiResponse`.

- [x] **Step 1: Write failing test for SSOT types**

```ts
// test/users-ssot-types.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import type {
  ManagedUser,
  CreateUserPayload,
  UpdateUserPayload,
  ResetPasswordPayload,
  DeactivateUserPayload,
  ReactivateUserPayload,
  UsersApiResponse,
  UserApiResponse,
} from '../src/types/index.ts';

test('SSOT Admin User Management Types Suite', async (t) => {
  await t.test('ManagedUser structure conforms to AuthUser without passwordHash', () => {
    const user: ManagedUser = {
      id: 'usr-1',
      email: 'admin@timber.id',
      name: 'Admin',
      roleLevel: 1,
      title: 'Director',
      isActive: true,
      createdAt: '2026-10-22T00:00:00Z',
      updatedAt: '2026-10-22T00:00:00Z',
    };
    assert.equal(user.id, 'usr-1');
    assert.equal(user.isActive, true);
    // @ts-expect-error passwordHash should not exist on ManagedUser
    assert.equal(user.passwordHash, undefined);
  });

  await t.test('CreateUserPayload accepts required fields and optional permissions', () => {
    const payload: CreateUserPayload = {
      email: 'test@timber.id',
      name: 'Test User',
      title: 'Staff',
      roleLevel: 2,
      password: 'password123',
      permissions: { tallyCreate: true },
    };
    assert.equal(payload.roleLevel, 2);
  });

  await t.test('UpdateUserPayload allows partial updates without id, isActive, or password', () => {
    const patch: UpdateUserPayload = {
      name: 'Updated Name',
      roleLevel: 2,
    };
    // @ts-expect-error id is immutable and cannot be patched
    patch.id = 'usr-2';
    // @ts-expect-error isActive must use dedicated deactivate/reactivate endpoints
    patch.isActive = false;
    assert.equal(patch.name, 'Updated Name');
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test test/users-ssot-types.test.ts`
Expected: FAIL with compilation error (types not exported).

- [x] **Step 3: Add type definitions to `src/types/index.ts`**

Add near `AuthUser` in `src/types/index.ts`:

```ts
export interface ManagedUser extends AuthUser {
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserPayload {
  email: string;
  name: string;
  title: string;
  roleLevel: UserRoleLevel;
  password: string;
  permissions?: UserPermissions;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  title?: string;
  roleLevel?: UserRoleLevel;
  permissions?: UserPermissions;
}

export interface ResetPasswordPayload {
  newPassword: string;
}

export interface DeactivateUserPayload {
  reason?: string;
}

export interface ReactivateUserPayload {
  reason?: string;
}

export interface UsersApiResponse {
  success: boolean;
  data?: ManagedUser[];
  error?: string;
}

export interface UserApiResponse {
  success: boolean;
  data?: ManagedUser;
  error?: string;
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `node --test test/users-ssot-types.test.ts`
Expected: PASS (3 tests passing).

---

### Phase 2: Scoped User Activity Query Layer

**Files:**
- Modify: `src/persistence/sqlite/activity-queries.ts`
- Modify: `src/persistence/server-master-data-bridge.ts`
- Modify: `src/persistence/server-record-store.ts`
- Test: `test/user-activity-queries.test.ts`

**Interfaces:**
- Produces: `listUserActivityLogsFromDb(db, userId, limit): ActivityLogEntry[]`, `serverRecordStore.getUserActivityLogs(userId, limit): Promise<ActivityLogEntry[]>`.

- [x] **Step 1: Write failing test for user-scoped activity queries**

```ts
// test/user-activity-queries.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { runMigrations } from '../src/persistence/sqlite/migrations.ts';
import { appendActivityLogToDb, listUserActivityLogsFromDb } from '../src/persistence/sqlite/activity-queries.ts';
import { serverRecordStore } from '../src/persistence/server-record-store.ts';

test('User Activity Queries Scoping Suite', async (t) => {
  const db = new DatabaseSync(':memory:');
  runMigrations(db);

  const targetUserId = 'usr-target-audit-01';
  const otherUserId = 'usr-other-02';

  appendActivityLogToDb(db, {
    action: 'USER_CREATED',
    entityId: targetUserId,
    entitySummary: 'Created user target',
    operatorName: 'Admin',
    operatorRole: 'Director',
  });

  appendActivityLogToDb(db, {
    action: 'USER_ROLE_CHANGED',
    entityId: targetUserId,
    entitySummary: 'Promoted target user',
    operatorName: 'Admin',
    operatorRole: 'Director',
  });

  appendActivityLogToDb(db, {
    action: 'RECORD_CREATED',
    entityId: targetUserId,
    entitySummary: 'Target user created record',
    operatorName: 'Target',
    operatorRole: 'Staff',
  });

  appendActivityLogToDb(db, {
    action: 'USER_DEACTIVATED',
    entityId: otherUserId,
    entitySummary: 'Other user deactivated',
    operatorName: 'Admin',
    operatorRole: 'Director',
  });

  await t.test('listUserActivityLogsFromDb returns only USER_* actions matching entityId', () => {
    const logs = listUserActivityLogsFromDb(db, targetUserId, 50);
    assert.equal(logs.length, 2);
    assert.ok(logs.every((l) => l.entityId === targetUserId));
    assert.ok(logs.every((l) => l.action.startsWith('USER_')));
  });

  await t.test('serverRecordStore.getUserActivityLogs delegates successfully', async () => {
    const logs = await serverRecordStore.getUserActivityLogs(targetUserId, 10);
    assert.ok(Array.isArray(logs));
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test test/user-activity-queries.test.ts`
Expected: FAIL (`listUserActivityLogsFromDb` is not defined).

- [x] **Step 3: Implement `listUserActivityLogsFromDb` and bridge methods**

In `src/persistence/sqlite/activity-queries.ts`:
```ts
export function listUserActivityLogsFromDb(
  db: DatabaseSync,
  userId: string,
  limit: number = 100
): ActivityLogEntry[] {
  const safeLimit = Math.max(1, Math.min(limit, 500));
  const rows = db.prepare(`
    SELECT * FROM activity_logs
    WHERE tenant_id = 'default-tenant'
      AND entity_id = ?
      AND action LIKE 'USER_%'
    ORDER BY timestamp DESC
    LIMIT ?
  `).all(userId, safeLimit) as unknown as SqliteActivityLogRow[];
  return rows.map(mapActivityRow);
}
```

In `src/persistence/server-master-data-bridge.ts`:
```ts
async getUserActivityLogs(userId: string, limit: number = 100): Promise<ActivityLogEntry[]> {
  if (this.isSupabaseMode()) {
    try {
      const rows = await supabaseFetch<SupabaseActivityLogRow[]>(
        `activity_logs?tenant_id=eq.default-tenant&entity_id=eq.${encodeURIComponent(userId)}&action=like.USER_*&order=timestamp.desc&limit=${limit}`
      );
      return rows.map(mapSupabaseActivityRow);
    } catch (err) {
      console.warn('[ServerRecordStore] Supabase getUserActivityLogs failed, falling back to SQLite:', err);
    }
  }
  return listUserActivityLogsFromDb(this.getSqliteStore().getDatabaseSync(), userId, limit);
}
```

In `src/persistence/server-record-store.ts`:
```ts
getUserActivityLogs(userId: string, limit?: number): Promise<ActivityLogEntry[]> {
  return this.masterDataBridge.getUserActivityLogs(userId, limit);
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `node --test test/user-activity-queries.test.ts`
Expected: PASS. Verify `wc -l` on modified files (< 250 LOC).

---

### Phase 3: API Route `GET /api/users` & `POST /api/users`

**Files:**
- Create: `app/api/users/route.ts`
- Test: `test/api-users-list-create.test.ts`

**Interfaces:**
- Produces: `GET(request): Promise<NextResponse>`, `POST(request): Promise<NextResponse>`.

- [x] **Step 1: Write failing test for `GET /api/users` and `POST /api/users`**

```ts
// test/api-users-list-create.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { GET, POST } from '../app/api/users/route.ts';
import { COOKIE_NAME, createSessionToken } from '../src/auth/session.ts';
import type { AuthUser } from '../src/types/index.ts';

function createAuthReq(url: string, user?: AuthUser, body?: unknown, method = 'GET'): Request {
  const headers = new Headers();
  if (user) {
    headers.set('cookie', `${COOKIE_NAME}=${createSessionToken(user)}`);
  }
  if (body) {
    headers.set('content-type', 'application/json');
  }
  return new Request(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

const adminUser: AuthUser = { id: 'usr-admin-01', email: 'admin@timber.id', name: 'Admin', roleLevel: 1, title: 'Director' };
const staffUser: AuthUser = { id: 'usr-staff-01', email: 'staff@timber.id', name: 'Staff', roleLevel: 2, title: 'Operator' };

test('API /api/users List and Create Suite', async (t) => {
  await t.test('GET /api/users returns 401 when unauthorized', async () => {
    const res = await GET(createAuthReq('https://timber.test/api/users'));
    assert.equal(res.status, 401);
  });

  await t.test('GET /api/users returns 403 when user is Level 2', async () => {
    const res = await GET(createAuthReq('https://timber.test/api/users', staffUser));
    assert.equal(res.status, 403);
  });

  await t.test('GET /api/users returns 200 with user list without passwordHash', async () => {
    const res = await GET(createAuthReq('https://timber.test/api/users', adminUser));
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.every((u: Record<string, unknown>) => u.passwordHash === undefined));
  });

  await t.test('POST /api/users rejects password shorter than 8 chars', async () => {
    const res = await POST(createAuthReq('https://timber.test/api/users', adminUser, {
      email: 'short@timber.id',
      name: 'Short Pass',
      title: 'Staff',
      roleLevel: 2,
      password: 'short',
    }, 'POST'));
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /8 karakter/);
  });

  await t.test('POST /api/users creates user and returns 201 without passwordHash', async () => {
    const email = `created-${Date.now()}@timber.id`;
    const res = await POST(createAuthReq('https://timber.test/api/users', adminUser, {
      email,
      name: 'New Person',
      title: 'Operator',
      roleLevel: 2,
      password: 'strongPassword123',
      permissions: { tallyCreate: true },
    }, 'POST'));
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.email, email);
    assert.equal(body.data.passwordHash, undefined);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test test/api-users-list-create.test.ts`
Expected: FAIL (`app/api/users/route.ts` not found).

- [x] **Step 3: Implement `app/api/users/route.ts`**

```ts
// app/api/users/route.ts
import { NextResponse } from 'next/server.js';
import { getAuthenticatedUser } from '../../../src/auth/session.ts';
import { getUserRepository } from '../../../src/persistence/user-repository.ts';
import { createAuditedUserRepository } from '../../../src/persistence/user-repository-audited.ts';
import { hashPassword } from '../../../src/auth/password.ts';
import type { CreateUserPayload, ManagedUser } from '../../../src/types/index.ts';

export const dynamic = 'force-dynamic';

function toManagedUser(user: { id: string; email: string; name: string; roleLevel: 1 | 2 | 3; title: string; permissions?: Record<string, boolean>; isActive: boolean; createdAt: string; updatedAt: string }): ManagedUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    roleLevel: user.roleLevel,
    title: user.title,
    permissions: user.permissions,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function GET(request: Request) {
  try {
    const actor = await getAuthenticatedUser(request);
    if (!actor) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    if (actor.roleLevel !== 1) return NextResponse.json({ success: false, error: 'Akses ditolak: Hanya Level 1' }, { status: 403 });

    const url = new URL(request.url, 'http://localhost');
    const includeInactive = url.searchParams.get('includeInactive') === '1';

    const repo = getUserRepository();
    const rows = await repo.listAll({ includeInactive });
    return NextResponse.json({ success: true, data: rows.map(toManagedUser) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve users';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const actor = await getAuthenticatedUser(request);
    if (!actor) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    if (actor.roleLevel !== 1) return NextResponse.json({ success: false, error: 'Akses ditolak: Hanya Level 1' }, { status: 403 });

    const body = (await request.json()) as CreateUserPayload;
    if (!body.email || !body.email.includes('@')) {
      return NextResponse.json({ success: false, error: 'Email format invalid' }, { status: 400 });
    }
    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ success: false, error: 'Nama wajib diisi' }, { status: 400 });
    }
    if (!body.title || !body.title.trim()) {
      return NextResponse.json({ success: false, error: 'Title / Jabatan wajib diisi' }, { status: 400 });
    }
    if (![1, 2, 3].includes(body.roleLevel)) {
      return NextResponse.json({ success: false, error: 'Role level harus 1, 2, atau 3' }, { status: 400 });
    }
    if (!body.password || body.password.length < 8) {
      return NextResponse.json({ success: false, error: 'Password minimum 8 karakter' }, { status: 400 });
    }

    const auditedRepo = createAuditedUserRepository(actor);
    const id = `usr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const passwordHash = hashPassword(body.password);

    try {
      const created = await auditedRepo.create({
        id,
        email: body.email.trim().toLowerCase(),
        name: body.name.trim(),
        title: body.title.trim(),
        roleLevel: body.roleLevel,
        permissions: body.permissions,
        passwordHash,
        isActive: true,
      });

      return NextResponse.json({ success: true, data: toManagedUser(created) }, { status: 201 });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'DuplicateEmailError') {
        return NextResponse.json({ success: false, error: 'Email sudah digunakan oleh user aktif' }, { status: 409 });
      }
      throw err;
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create user';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `node --test test/api-users-list-create.test.ts`
Expected: PASS. Check line count (`wc -l app/api/users/route.ts` < 200).

---

### Phase 4: API Route `GET /api/users/[id]` & `PATCH /api/users/[id]`

**Files:**
- Create: `app/api/users/[id]/route.ts`
- Test: `test/api-users-detail-patch.test.ts`

**Interfaces:**
- Produces: `GET(request, { params })`, `PATCH(request, { params })`.
- Enforces Invariant 1 (ID immutable), Invariant 4 (Self-demote guard & Last Level 1 guard), Invariant 5 (Auto-reset permissions on role change), Invariant 7 (strict permissions keys).

- [x] **Step 1: Write failing test for `GET /api/users/[id]` and `PATCH /api/users/[id]`**

```ts
// test/api-users-detail-patch.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { GET, PATCH } from '../app/api/users/[id]/route.ts';
import { COOKIE_NAME, createSessionToken } from '../src/auth/session.ts';
import { getUserRepository } from '../src/persistence/user-repository.ts';
import type { AuthUser } from '../src/types/index.ts';

function createReq(url: string, user: AuthUser, body?: unknown, method = 'GET'): Request {
  const headers = new Headers();
  headers.set('cookie', `${COOKIE_NAME}=${createSessionToken(user)}`);
  if (body) headers.set('content-type', 'application/json');
  return new Request(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
}

test('API /api/users/[id] Detail & Patch Suite', async (t) => {
  const repo = getUserRepository();
  const adminActor: AuthUser = { id: 'usr-admin-actor', email: 'admin-actor@timber.id', name: 'Admin Actor', roleLevel: 1, title: 'Director' };
  await repo.upsertSeed({ ...adminActor, passwordHash: 'h', isActive: true });

  const targetUser: AuthUser = { id: 'usr-target-patch', email: 'target-patch@timber.id', name: 'Target User', roleLevel: 2, title: 'Staff' };
  await repo.upsertSeed({ ...targetUser, passwordHash: 'h', isActive: true, permissions: { tallyCreate: true } });

  await t.test('GET returns user details without passwordHash', async () => {
    const res = await GET(createReq('https://timber.test/api/users/usr-target-patch', adminActor), { params: Promise.resolve({ id: 'usr-target-patch' }) });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.id, 'usr-target-patch');
    assert.equal(body.data.passwordHash, undefined);
  });

  await t.test('PATCH rejects forbidden fields (isActive, passwordHash)', async () => {
    const res = await PATCH(createReq('https://timber.test/api/users/usr-target-patch', adminActor, { isActive: false }, 'PATCH'), { params: Promise.resolve({ id: 'usr-target-patch' }) });
    assert.equal(res.status, 400);
  });

  await t.test('PATCH blocks self-demote (Invariant 4)', async () => {
    const res = await PATCH(createReq('https://timber.test/api/users/usr-admin-actor', adminActor, { roleLevel: 2 }, 'PATCH'), { params: Promise.resolve({ id: 'usr-admin-actor' }) });
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.match(body.error, /role sendiri/);
  });

  await t.test('PATCH auto-resets permissions on role change (Invariant 5)', async () => {
    const res = await PATCH(createReq('https://timber.test/api/users/usr-target-patch', adminActor, { roleLevel: 3 }, 'PATCH'), { params: Promise.resolve({ id: 'usr-target-patch' }) });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.roleLevel, 3);
    assert.deepEqual(body.data.permissions, {});
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test test/api-users-detail-patch.test.ts`
Expected: FAIL (`app/api/users/[id]/route.ts` missing).

- [x] **Step 3: Implement `app/api/users/[id]/route.ts`**

Implement `GET` and `PATCH` handling:
- Check `actor.roleLevel === 1`.
- Reject `isActive` or `passwordHash` in PATCH body.
- Guard against self-demote.
- Guard against demoting the last Level 1 (`const l1Count = (await repo.listAll()).filter(u => u.roleLevel === 1 && u.isActive).length; if (l1Count <= 1) return 409`).
- Auto-reset permissions to `{}` if `patch.roleLevel !== undefined && patch.roleLevel !== existing.roleLevel`.
- Strip forbidden permission keys (only `tallyCreate` allowed).
- Update via `createAuditedUserRepository(actor)`.

- [x] **Step 4: Run test to verify it passes**

Run: `node --test test/api-users-detail-patch.test.ts`
Expected: PASS. Check line count (< 200 LOC).

---

### Phase 5: API Route `POST /api/users/[id]/password`

**Files:**
- Create: `app/api/users/[id]/password/route.ts`
- Test: `test/api-users-password.test.ts`

**Interfaces:**
- Produces: `POST(request, { params })`.

- [x] **Step 1: Write failing test for password reset**

```ts
// test/api-users-password.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { POST } from '../app/api/users/[id]/password/route.ts';
import { COOKIE_NAME, createSessionToken } from '../src/auth/session.ts';
import { getUserRepository } from '../src/persistence/user-repository.ts';
import { hashPassword } from '../src/auth/password.ts';
import type { AuthUser } from '../src/types/index.ts';

test('API /api/users/[id]/password Suite', async (t) => {
  const repo = getUserRepository();
  const adminActor: AuthUser = { id: 'usr-admin-pass', email: 'admin-pass@timber.id', name: 'Admin', roleLevel: 1, title: 'Director' };
  await repo.upsertSeed({ ...adminActor, passwordHash: 'h', isActive: true });

  const targetUser: AuthUser = { id: 'usr-target-pw', email: 'target-pw@timber.id', name: 'Target', roleLevel: 2, title: 'Staff' };
  await repo.upsertSeed({ ...targetUser, passwordHash: hashPassword('oldPassword123'), isActive: true });

  function makeReq(body: unknown): Request {
    return new Request('https://timber.test/api/users/usr-target-pw/password', {
      method: 'POST',
      headers: {
        cookie: `${COOKIE_NAME}=${createSessionToken(adminActor)}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  }

  await t.test('rejects password < 8 chars', async () => {
    const res = await POST(makeReq({ newPassword: '123' }), { params: Promise.resolve({ id: 'usr-target-pw' }) });
    assert.equal(res.status, 400);
  });

  await t.test('resets password and response never includes passwordHash', async () => {
    const res = await POST(makeReq({ newPassword: 'brandNewPassword123' }), { params: Promise.resolve({ id: 'usr-target-pw' }) });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.passwordHash, undefined);

    const updated = await repo.findByIdIncludingInactive('usr-target-pw');
    assert.equal(updated?.passwordHash, hashPassword('brandNewPassword123'));
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test test/api-users-password.test.ts`
Expected: FAIL.

- [x] **Step 3: Implement `app/api/users/[id]/password/route.ts`**

```ts
import { NextResponse } from 'next/server.js';
import { getAuthenticatedUser } from '../../../../src/auth/session.ts';
import { createAuditedUserRepository } from '../../../../src/persistence/user-repository-audited.ts';
import { hashPassword } from '../../../../src/auth/password.ts';
import type { ResetPasswordPayload } from '../../../../src/types/index.ts';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await getAuthenticatedUser(request);
    if (!actor) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    if (actor.roleLevel !== 1) return NextResponse.json({ success: false, error: 'Akses ditolak: Hanya Level 1' }, { status: 403 });

    const { id } = await params;
    const body = (await request.json()) as ResetPasswordPayload;
    if (!body.newPassword || body.newPassword.length < 8) {
      return NextResponse.json({ success: false, error: 'Password minimum 8 karakter' }, { status: 400 });
    }

    const auditedRepo = createAuditedUserRepository(actor);
    const passwordHash = hashPassword(body.newPassword);
    await auditedRepo.update(id, { passwordHash });

    return NextResponse.json({ success: true, data: { id } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to reset password';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `node --test test/api-users-password.test.ts`
Expected: PASS. Check line count (< 80 LOC).

---

### Phase 6: API Routes `POST /api/users/[id]/deactivate` & `POST /api/users/[id]/reactivate`

**Files:**
- Create: `app/api/users/[id]/deactivate/route.ts`
- Create: `app/api/users/[id]/reactivate/route.ts`
- Test: `test/api-users-deactivate-reactivate.test.ts`

**Interfaces:**
- Produces: `POST` handlers for deactivate and reactivate endpoints.
- Enforces self-deactivate guard & last-Level-1 guard.

- [x] **Step 1: Write failing test for deactivate and reactivate**

```ts
// test/api-users-deactivate-reactivate.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { POST as deactivateHandler } from '../app/api/users/[id]/deactivate/route.ts';
import { POST as reactivateHandler } from '../app/api/users/[id]/reactivate/route.ts';
import { COOKIE_NAME, createSessionToken } from '../src/auth/session.ts';
import { getUserRepository } from '../src/persistence/user-repository.ts';
import type { AuthUser } from '../src/types/index.ts';

test('API Deactivate & Reactivate Suite', async (t) => {
  const repo = getUserRepository();
  const adminActor: AuthUser = { id: 'usr-admin-deact-actor', email: 'admin-deact@timber.id', name: 'Admin', roleLevel: 1, title: 'Director' };
  await repo.upsertSeed({ ...adminActor, passwordHash: 'h', isActive: true });

  const target: AuthUser = { id: 'usr-target-deact', email: 'target-deact@timber.id', name: 'Target', roleLevel: 2, title: 'Staff' };
  await repo.upsertSeed({ ...target, passwordHash: 'h', isActive: true });

  function makeReq(url: string, actor: AuthUser, body?: unknown) {
    return new Request(url, {
      method: 'POST',
      headers: {
        cookie: `${COOKIE_NAME}=${createSessionToken(actor)}`,
        'content-type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  await t.test('deactivate blocks self-deactivate (Invariant 4)', async () => {
    const res = await deactivateHandler(
      makeReq('https://timber.test/api/users/usr-admin-deact-actor/deactivate', adminActor),
      { params: Promise.resolve({ id: 'usr-admin-deact-actor' }) }
    );
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.match(body.error, /akun sendiri/);
  });

  await t.test('deactivate successfully deactivates user', async () => {
    const res = await deactivateHandler(
      makeReq('https://timber.test/api/users/usr-target-deact/deactivate', adminActor, { reason: 'Resigned' }),
      { params: Promise.resolve({ id: 'usr-target-deact' }) }
    );
    assert.equal(res.status, 200);

    const user = await repo.findByIdIncludingInactive('usr-target-deact');
    assert.equal(user?.isActive, false);
  });

  await t.test('reactivate successfully restores user', async () => {
    const res = await reactivateHandler(
      makeReq('https://timber.test/api/users/usr-target-deact/reactivate', adminActor, { reason: 'Rehired' }),
      { params: Promise.resolve({ id: 'usr-target-deact' }) }
    );
    assert.equal(res.status, 200);

    const user = await repo.findById('usr-target-deact');
    assert.ok(user);
    assert.equal(user?.isActive, true);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test test/api-users-deactivate-reactivate.test.ts`
Expected: FAIL.

- [x] **Step 3: Implement `app/api/users/[id]/deactivate/route.ts` & `app/api/users/[id]/reactivate/route.ts`**

In `app/api/users/[id]/deactivate/route.ts`:
- Check actor Level 1.
- If `id === actor.id` return 403 `Tidak dapat menonaktifkan akun sendiri`.
- Check if target is Level 1; if so, count active Level 1s. If <= 1, return 409 `Minimal 1 Level 1 aktif harus tersedia`.
- Call `createAuditedUserRepository(actor).deactivate(id)`.
- Return `{ success: true }`.

In `app/api/users/[id]/reactivate/route.ts`:
- Check actor Level 1.
- Call `createAuditedUserRepository(actor).update(id, { isActive: true, reason: body.reason })`.
- Return `{ success: true, data: toManagedUser(updated) }`.

- [x] **Step 4: Run test to verify it passes**

Run: `node --test test/api-users-deactivate-reactivate.test.ts`
Expected: PASS. Check LOC for both files (< 90 LOC each).

---

### Phase 7: API Route `GET /api/users/[id]/activity`

**Files:**
- Create: `app/api/users/[id]/activity/route.ts`
- Test: `test/api-users-activity.test.ts`

**Interfaces:**
- Produces: `GET(request, { params })`.

- [x] **Step 1: Write failing test for user activity route**

```ts
// test/api-users-activity.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { GET } from '../app/api/users/[id]/activity/route.ts';
import { COOKIE_NAME, createSessionToken } from '../src/auth/session.ts';
import type { AuthUser } from '../src/types/index.ts';

test('API /api/users/[id]/activity Suite', async (t) => {
  const adminActor: AuthUser = { id: 'usr-admin-act', email: 'admin@timber.id', name: 'Admin', roleLevel: 1, title: 'Director' };
  const staffActor: AuthUser = { id: 'usr-staff-act', email: 'staff@timber.id', name: 'Staff', roleLevel: 2, title: 'Staff' };

  await t.test('returns 403 if actor is not Level 1', async () => {
    const req = new Request('https://timber.test/api/users/usr-1/activity', {
      headers: { cookie: `${COOKIE_NAME}=${createSessionToken(staffActor)}` },
    });
    const res = await GET(req, { params: Promise.resolve({ id: 'usr-1' }) });
    assert.equal(res.status, 403);
  });

  await t.test('returns 200 with activity list for Level 1', async () => {
    const req = new Request('https://timber.test/api/users/usr-1/activity', {
      headers: { cookie: `${COOKIE_NAME}=${createSessionToken(adminActor)}` },
    });
    const res = await GET(req, { params: Promise.resolve({ id: 'usr-1' }) });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data));
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test test/api-users-activity.test.ts`
Expected: FAIL.

- [x] **Step 3: Implement `app/api/users/[id]/activity/route.ts`**

```ts
import { NextResponse } from 'next/server.js';
import { getAuthenticatedUser } from '../../../../src/auth/session.ts';
import { serverRecordStore } from '../../../../src/persistence/server-record-store.ts';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await getAuthenticatedUser(request);
    if (!actor) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    if (actor.roleLevel !== 1) return NextResponse.json({ success: false, error: 'Akses ditolak: Hanya Level 1' }, { status: 403 });

    const { id } = await params;
    const url = new URL(request.url, 'http://localhost');
    const limit = parseInt(url.searchParams.get('limit') || '100', 10);

    const data = await serverRecordStore.getUserActivityLogs(id, limit);
    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve user activity';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `node --test test/api-users-activity.test.ts`
Expected: PASS. Check line count (< 60 LOC).

---

### Phase 8: UI Component `UserListTable`

**Files:**
- Create: `src/components/users/UserListTable.tsx`
- Test: `test/user-components.test.ts` (suite start)

**Interfaces:**
- Produces: `UserListTable({ users, currentActorId, onEdit, onResetPassword, onDeactivate, onReactivate, onViewAudit })`.

- [x] **Step 1: Write failing component contract test**

In `test/user-components.test.ts`:
```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Admin User Management Components Suite', async (t) => {
  const tablePath = path.resolve(process.cwd(), 'src/components/users/UserListTable.tsx');

  await t.test('UserListTable exists and stays under 220 LOC', () => {
    assert.ok(fs.existsSync(tablePath));
    const lines = fs.readFileSync(tablePath, 'utf-8').split('\n');
    assert.ok(lines.length <= 220, `UserListTable.tsx exceeded LOC: ${lines.length}`);
  });

  await t.test('UserListTable exports interface and renders columns', () => {
    const content = fs.readFileSync(tablePath, 'utf-8');
    assert.match(content, /export interface UserListTableProps/);
    assert.match(content, /export function UserListTable/);
    assert.match(content, /tallyCreate/);
    assert.match(content, /Nonaktif|Aktif/);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test test/user-components.test.ts`
Expected: FAIL (`UserListTable.tsx` missing).

- [x] **Step 3: Implement `src/components/users/UserListTable.tsx`**

Implement `UserListTable` (< 200 LOC):
- Props: `users: ManagedUser[]`, `currentActorId: string`, callbacks for action buttons.
- Search / filter toggle "Tampilkan nonaktif".
- Badges for Level 1 (Manager), Level 2 (Staff), Level 3 (Monitor).
- Permissions badge for `tallyCreate`.
- Status pill (Green: Aktif, Gray: Nonaktif).
- Action buttons: "Edit", "Reset Password", "Nonaktifkan" (disabled if `user.id === currentActorId`), "Aktifkan", "Audit".

- [x] **Step 4: Run test to verify it passes**

Run: `node --test test/user-components.test.ts`
Expected: PASS.

---

### Phase 9: UI Component `UserCreateModal`

**Files:**
- Create: `src/components/users/UserCreateModal.tsx`
- Test: Append to `test/user-components.test.ts`

**Interfaces:**
- Produces: `UserCreateModal({ isOpen, onClose, onSuccess })`.
- Enforces Invariant 6: `tallyCreate` checkbox only visible if `roleLevel === 2`.

- [x] **Step 1: Add test assertions for `UserCreateModal`**

Append to `test/user-components.test.ts`:
```ts
  const createModalPath = path.resolve(process.cwd(), 'src/components/users/UserCreateModal.tsx');
  await t.test('UserCreateModal exists and respects < 230 LOC', () => {
    assert.ok(fs.existsSync(createModalPath));
    const lines = fs.readFileSync(createModalPath, 'utf-8').split('\n');
    assert.ok(lines.length <= 230, `UserCreateModal.tsx exceeded LOC: ${lines.length}`);
  });
  await t.test('UserCreateModal conditions tallyCreate on roleLevel 2', () => {
    const content = fs.readFileSync(createModalPath, 'utf-8');
    assert.match(content, /roleLevel\s*===?\s*2/);
    assert.match(content, /password/);
  });
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test test/user-components.test.ts`
Expected: FAIL.

- [x] **Step 3: Implement `src/components/users/UserCreateModal.tsx`**

Implement `UserCreateModal` (< 220 LOC):
- Email, Name, Title, Role Level selector (1, 2, 3), Password + Confirm Password.
- When `roleLevel === 2`, show checkbox for `tallyCreate` ("Izin Buat Tally Lapangan").
- Client-side validation: password length >= 8, passwords match, non-empty fields.
- POST to `/api/users`.

- [x] **Step 4: Run test to verify it passes**

Run: `node --test test/user-components.test.ts`
Expected: PASS.

---

### Phase 10: UI Components `PromoteToLevel1ConfirmModal` & `UserEditModal`

**Files:**
- Create: `src/components/users/PromoteToLevel1ConfirmModal.tsx`
- Create: `src/components/users/UserEditModal.tsx`
- Test: Append to `test/user-components.test.ts`

**Interfaces:**
- Produces: `PromoteToLevel1ConfirmModal({ isOpen, targetUser, onConfirm, onCancel })`, `UserEditModal({ isOpen, user, currentActorId, onClose, onSuccess })`.
- Enforces Invariant 4 (Promote-to-Level-1 confirmation modal) & Invariant 6 (Permission scoping).

- [x] **Step 1: Add test assertions for `PromoteToLevel1ConfirmModal` and `UserEditModal`**

Append to `test/user-components.test.ts`:
```ts
  const promoteModalPath = path.resolve(process.cwd(), 'src/components/users/PromoteToLevel1ConfirmModal.tsx');
  const editModalPath = path.resolve(process.cwd(), 'src/components/users/UserEditModal.tsx');

  await t.test('PromoteToLevel1ConfirmModal exists and respects < 100 LOC', () => {
    assert.ok(fs.existsSync(promoteModalPath));
    const lines = fs.readFileSync(promoteModalPath, 'utf-8').split('\n');
    assert.ok(lines.length <= 100);
  });

  await t.test('UserEditModal exists and respects < 230 LOC', () => {
    assert.ok(fs.existsSync(editModalPath));
    const lines = fs.readFileSync(editModalPath, 'utf-8').split('\n');
    assert.ok(lines.length <= 230);
  });
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test test/user-components.test.ts`
Expected: FAIL.

- [x] **Step 3: Implement `PromoteToLevel1ConfirmModal.tsx` and `UserEditModal.tsx`**

Implement `PromoteToLevel1ConfirmModal.tsx` (< 90 LOC):
- Explicit warning: "Level 1 memiliki akses penuh termasuk reset database. Yakin promote [email] ke Level 1?".
- Action button "Yakin Promote".

Implement `UserEditModal.tsx` (< 210 LOC):
- Name, Email, Title, Role selector, Permissions.
- If actor is the current user (`user.id === currentActorId`), disable the role selector with notice "Tidak dapat mengubah role sendiri".
- If selecting Level 1 for a non-Level-1 user, trigger `PromoteToLevel1ConfirmModal`.
- Warning message if changing role will reset permissions.
- PATCH to `/api/users/[id]`.

- [x] **Step 4: Run test to verify it passes**

Run: `node --test test/user-components.test.ts`
Expected: PASS.

---

### Phase 11: UI Components `PasswordResetModal` & `DeactivateConfirmModal`

**Files:**
- Create: `src/components/users/PasswordResetModal.tsx`
- Create: `src/components/users/DeactivateConfirmModal.tsx`
- Test: Append to `test/user-components.test.ts`

**Interfaces:**
- Produces: `PasswordResetModal({ isOpen, user, onClose, onSuccess })`, `DeactivateConfirmModal({ isOpen, user, onClose, onSuccess })`.

- [x] **Step 1: Add test assertions for action modals**

Append to `test/user-components.test.ts`:
```ts
  const pwModalPath = path.resolve(process.cwd(), 'src/components/users/PasswordResetModal.tsx');
  const deactModalPath = path.resolve(process.cwd(), 'src/components/users/DeactivateConfirmModal.tsx');

  await t.test('PasswordResetModal exists and respects < 130 LOC', () => {
    assert.ok(fs.existsSync(pwModalPath));
    const lines = fs.readFileSync(pwModalPath, 'utf-8').split('\n');
    assert.ok(lines.length <= 130);
  });

  await t.test('DeactivateConfirmModal exists and requires typing DEACTIVATE', () => {
    assert.ok(fs.existsSync(deactModalPath));
    const content = fs.readFileSync(deactModalPath, 'utf-8');
    assert.match(content, /DEACTIVATE/);
  });
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test test/user-components.test.ts`
Expected: FAIL.

- [x] **Step 3: Implement `PasswordResetModal.tsx` & `DeactivateConfirmModal.tsx`**

Implement `PasswordResetModal.tsx` (< 120 LOC):
- New password & Confirm password inputs (type="password", min 8 chars).
- POST to `/api/users/[id]/password`.

Implement `DeactivateConfirmModal.tsx` (< 120 LOC):
- Target user email display.
- Input requiring user to type "DEACTIVATE" to enable submit button.
- Optional reason input field.
- POST to `/api/users/[id]/deactivate`.

- [x] **Step 4: Run test to verify it passes**

Run: `node --test test/user-components.test.ts`
Expected: PASS.

---

### Phase 12: UI Component `UserAuditDrawer`

**Files:**
- Create: `src/components/users/UserAuditDrawer.tsx`
- Test: Append to `test/user-components.test.ts`

**Interfaces:**
- Produces: `UserAuditDrawer({ isOpen, user, onClose })`.

- [x] **Step 1: Add test assertions for `UserAuditDrawer`**

Append to `test/user-components.test.ts`:
```ts
  const drawerPath = path.resolve(process.cwd(), 'src/components/users/UserAuditDrawer.tsx');
  await t.test('UserAuditDrawer exists and respects < 200 LOC', () => {
    assert.ok(fs.existsSync(drawerPath));
    const lines = fs.readFileSync(drawerPath, 'utf-8').split('\n');
    assert.ok(lines.length <= 200);
  });
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test test/user-components.test.ts`
Expected: FAIL.

- [x] **Step 3: Implement `src/components/users/UserAuditDrawer.tsx`**

Implement `UserAuditDrawer` (< 180 LOC):
- Slide-out drawer fetching `GET /api/users/[id]/activity`.
- Humanized action badges:
  - `USER_CREATED`: "User Dibuat"
  - `USER_UPDATED`: "Profil Diperbarui"
  - `USER_ROLE_CHANGED`: "Role Diubah"
  - `USER_PERMISSION_CHANGED`: "Izin Diubah"
  - `USER_DEACTIVATED`: "Dinonaktifkan"
  - `USER_REACTIVATED`: "Diaktifkan Kembali"
  - `USER_PASSWORD_CHANGED`: "Password Direset"
- Formatted timestamp, operator name, and metadata details.

- [x] **Step 4: Run test to verify it passes**

Run: `node --test test/user-components.test.ts`
Expected: PASS.

---

### Phase 13: UI Coordinator `UsersPage` (`app/users/page.tsx`)

**Files:**
- Create: `app/users/page.tsx`
- Test: `test/users-page.test.ts`

**Interfaces:**
- Produces: default export React component for `/users` page (< 250 LOC).

- [x] **Step 1: Write failing test for `UsersPage` coordinator**

```ts
// test/users-page.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('UsersPage Coordinator Suite', async (t) => {
  const pagePath = path.resolve(process.cwd(), 'app/users/page.tsx');

  await t.test('UsersPage exists and strictly respects < 250 LOC God File invariant', () => {
    assert.ok(fs.existsSync(pagePath));
    const lines = fs.readFileSync(pagePath, 'utf-8').split('\n');
    assert.ok(lines.length <= 250, `UsersPage exceeded 250 LOC (currently ${lines.length})`);
  });

  await t.test('UsersPage integrates useAuth and modals', () => {
    const content = fs.readFileSync(pagePath, 'utf-8');
    assert.match(content, /useAuth/);
    assert.match(content, /UserListTable/);
    assert.match(content, /UserCreateModal/);
    assert.match(content, /UserEditModal/);
    assert.match(content, /PasswordResetModal/);
    assert.match(content, /DeactivateConfirmModal/);
    assert.match(content, /UserAuditDrawer/);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test test/users-page.test.ts`
Expected: FAIL.

- [x] **Step 3: Implement `app/users/page.tsx`**

Implement `UsersPage` (< 220 LOC):
- 'use client'.
- Consumes `useAuth()`. If `user && user.roleLevel !== 1`, render access denied state.
- Fetches `GET /api/users?includeInactive=1`.
- State for selected user and active modal (`create`, `edit`, `password`, `deactivate`, `audit`).
- Toast notifications on mutation success.
- Render layout with Header ("Manajemen Pengguna"), "Tambah Pengguna" button, `UserListTable`, and modals.

- [x] **Step 4: Run test to verify it passes**

Run: `node --test test/users-page.test.ts`
Expected: PASS. Check line count (< 250 LOC).

---

### Phase 14: Navigation Addition & Role Filter Smoke Test

**Files:**
- Modify: `src/components/layout/nav-config.ts`
- Test: `test/nav-config.test.ts`

- [x] **Step 1: Add unit test assertion for `users` item in `nav-config.test.ts`**

In `test/nav-config.test.ts`:
- Assert `users` item exists in `admin` section with `minRoleLevel: 1`.
- Assert `filterNavSections(NAV_SECTIONS, 1)` includes `users`.
- Assert `filterNavSections(NAV_SECTIONS, 2)` excludes `users`.
- Assert `filterNavSections(NAV_SECTIONS, 3)` excludes `users`.

- [x] **Step 2: Run test to verify it fails**

Run: `node --test test/nav-config.test.ts`
Expected: FAIL (item not in config).

- [x] **Step 3: Add `users` item to `src/components/layout/nav-config.ts`**

In `admin` section:
```ts
{ id: 'users', labelId: 'Pengguna', labelZh: '用户管理', href: '/users', minRoleLevel: 1 },
```

- [x] **Step 4: Run test to verify it passes**

Run: `node --test test/nav-config.test.ts`
Expected: PASS.

---

### Phase 15: Cross-Cutting Regression Suite

**Files:**
- Verify: `test/user-repository.test.ts`, `test/session-invalidation.test.ts`, `test/user-repository-audited.test.ts`, `test/api-auth-me-freshness.test.ts`.

- [x] **Step 1: Run Spec A, B, C and TD-002 test suites**

Run:
```bash
node --test test/user-repository.test.ts test/session-invalidation.test.ts test/user-repository-audited.test.ts test/api-auth-me-freshness.test.ts
```
Expected: All suites PASS with 0 failures.

---

### Phase 16: Verification Gate (Drift, Tests, Build, Grep)

- [x] **Step 1: Run drift check**
```bash
npm run drift:check
```
Expected: `✅ No drift detected` (all files < 250 LOC, SSOT compliant).

- [x] **Step 2: Run TypeScript & Next.js production build check**
```bash
npm run build:check
```
Expected: 0 errors, routes compiled cleanly including `/users` and `/api/users/*`.

- [x] **Step 3: Run full test suite**
```bash
npm test
```
Expected: `pass N, fail 0` where N >= 900.

- [x] **Step 4: Grep security assertions**
```bash
# Verify no passwordHash in API responses
grep -rn "passwordHash" app/api/users/
# Must only appear as rejected field check in PATCH handler, never in response payload

# Verify no raw getUserRepository mutation in app/api/users/
grep -rn "getUserRepository().\(create\|update\|deactivate\)" app/api/users/
# Must be 0 matches (all mutations must use createAuditedUserRepository)
```

---

### Phase 17: Manual QA Matrix (Browser)

- [x] Scenario 1: Login as `manager@timber.id` (Level 1) → verify "Pengguna" visible in Admin sidebar → navigate to `/users`.
- [x] Scenario 2: Login as `admin@timber.id` (Level 2) → verify "Pengguna" hidden in sidebar → direct navigation to `/users` shows Access Denied.
- [x] Scenario 3: Create new user (`newbie@timber.id`, Level 2, with `tallyCreate: true`) → verify shows in table → login as new user → `/tally` is accessible.
- [x] Scenario 4: Edit user role from Level 2 to Level 1 → verify `PromoteToLevel1ConfirmModal` appears with explicit warning → confirm → verify role updated in table.
- [x] Scenario 5: Try to demote self as Level 1 → verify UI disables role dropdown and server returns 403 on tampering.
- [x] Scenario 6: Reset password for user → verify modal accepts min 8 chars → login with new password succeeds.
- [x] Scenario 7: Deactivate user → verify requires typing "DEACTIVATE" → verify user immediately cannot authenticate (401 USER_INACTIVE) → reactivate user → login works again.
- [x] Scenario 8: Open Audit Drawer on user → verify all actions appear chronologically with humanized badges and operator names.

---

### Phase 18: Documentation, SESSION_STATE, CHANGELOG & Handoff

- [x] Append changelog entry to `CHANGELOG.md` under `[Unreleased]`:
```markdown
- **Admin User Management UI (Spec D)**: Complete user lifecycle management for Level 1 managers at `/users` and 7 dedicated `/api/users/*` endpoints. Backed by `AuditedUserRepository` with ADR-0013 invariant enforcement (soft delete only, self-demote guard, last Level 1 protection, promote-to-1 confirmation modal, permission auto-reset). Includes slide-out user audit log drawer.
  - Spec: `docs/superpowers/specs/2026-10-22-admin-user-management-ui-design.md`
  - Plan: `docs/superpowers/plans/2026-10-22-admin-user-management-ui.md`
  - Refs: ADR-0013, ADR-0014
```
- [x] Update `docs/SESSION_STATE.md`:
  - Mark Spec D as `✅ Completed` in table.
  - Update test pass count.
  - Update "Recently Completed" with Spec D details.
  - Update "Pickup Instructions".
- [x] Update `docs/superpowers/specs/2026-10-22-admin-user-management-ui-design.md` status to `Accepted — Implemented`.
- [x] Update `docs/superpowers/plans/2026-10-22-admin-user-management-ui.md` status to `Accepted — Implemented`.
- [x] Land git commit:
```bash
git add -A && git commit -m "feat(auth): add admin user management UI with 7 user lifecycle API routes

Introduces /users page (Level 1 only) + /api/users/* routes consuming
AuditedUserRepository from Spec C. Enforces all 8 ADR-0013 invariants:
soft delete only, no self-demote, last-Level-1 guard, promote-to-1
confirmation UI, permission auto-reset on role change, permission UI
exposed per applicable role. Audit drawer scoped per user. Password
hashing via existing SHA-256 utility; no plaintext in responses or
logs. Finalizes user management roadmap (Specs A→B→C→D).

Spec: docs/superpowers/specs/2026-10-22-admin-user-management-ui-design.md
Plan: docs/superpowers/plans/2026-10-22-admin-user-management-ui.md
Refs: ADR-0013, ADR-0014"
```

---

## 4. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Modal LOC overflow (>250 LOC limit)** | Medium | High | Atomic decomposition: each modal is a dedicated file; dedicated `PromoteToLevel1ConfirmModal` (<100 LOC); `UsersPage` delegates all table and dialog rendering to separate sub-components. Contingency: extract form sections if any modal exceeds 200 LOC. |
| **Password leak in response or logs** | Low | Critical | Strict SSOT type `ManagedUser` explicitly omits `passwordHash`; API routes use object destructuring to strip hash before responding; grep assertion in Phase 16 guarantees zero leak; audit metadata explicitly omits password values. |
| **Last-Level-1 race condition** | Low | High | Server-side guard in `PATCH` and `deactivate` handlers checks live count of active Level 1 users at transaction/request time; if count <= 1, aborts with 409 error. |
| **Admin bypass audit via raw DAO** | Medium | High | All API route handlers must instantiate and use `createAuditedUserRepository(actor)` for mutations; Phase 16 includes an automated grep check ensuring raw `getUserRepository().(create\|update\|deactivate)` does not appear in `app/api/users/`. |
| **User role change demotes operator while in session** | Low | Low | ADR-0014 (Spec B fresh user lookup) guarantees that demotion or deactivation takes effect immediately on the operator's next request without waiting for token TTL. |
