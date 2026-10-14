# Role-Based Authentication & Access Control (RBAC) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement an industrial-grade, 3-tier Role-Based Access Control (RBAC) login and session system gating routes, UI controls, and material ledger mutations.

**Architecture:** Stateless HMAC-SHA256 session token stored in an HTTP-only cookie (`wood_session`) verified via standard Node.js `node:crypto`. Next.js `middleware.ts` enforces route access between `/login` and `/`. A client `useAuth` hook supplies identity and permission flags (`canWrite`, `canViewAll`, `isMonitorOnly`) to conditionally render toolbar actions, table mutation columns, and executive dashboard views.

**Tech Stack:** Next.js 15 (App Router), React 19, Tailwind CSS, Lucide React, Node.js Native Test Runner (`node:test` + `node:assert/strict`), Native `node:crypto`.

**Spec:** [`docs/superpowers/specs/2026-10-15-role-based-login-system-design.md`](file:///Users/mac/Web%20Development/wood-inventory-management/docs/superpowers/specs/2026-10-15-role-based-login-system-design.md)

## Global Constraints
- Node.js runtime: `>=22.0.0` (active version 26.8.1).
- Execution standard: Native ECMAScript Modules (`"type": "module"` in `package.json`).
- God-file limit: Every individual module MUST remain strictly under 200 lines of code.
- Single Source of Truth (SSOT): All interfaces imported exclusively from `src/types/index.ts`.
- Language standard: All source code, interfaces, comments, and commit messages in English. UI labels bilingual (Indonesian + Chinese).
- Test execution: Fast native tests (`node --test`) must run with 0 failures.

---

### Task 1: SSOT Types & User Credential Store

**Files:**
- Modify: `src/types/index.ts`
- Create: `src/auth/users.ts`
- Test: `test/auth-users.test.ts`

**Interfaces:**
- Produces:
  - `UserRoleLevel`: `1 | 2 | 3`
  - `AuthUser`: `{ id: string; email: string; name: string; roleLevel: UserRoleLevel; title: string; }`
  - `AuthSession`: `{ user: AuthUser; expiresAt: number; }`
  - `LoginCredentials`: `{ email: string; password: string; }`
  - `AuthApiResponse`: `{ success: boolean; user?: AuthUser; error?: string; }`
  - `authenticateUser(credentials: LoginCredentials): Promise<AuthUser | null>`
  - `getUserById(id: string): AuthUser | null`

- [ ] **Step 1: Write failing unit test for user authentication**

Create `test/auth-users.test.ts`:
```typescript
import test from 'node:test';
import assert from 'node:assert/strict';
import { authenticateUser, getUserById, PRESET_USERS } from '../src/auth/users.ts';

test('User Store & Authentication Suite', async (t) => {
  await t.test('has 3 pre-configured factory accounts for level 1, 2, and 3', () => {
    assert.equal(PRESET_USERS.length, 3);
    assert.deepEqual(PRESET_USERS.map((u) => u.roleLevel), [1, 2, 3]);
  });

  await t.test('authenticates valid manager credentials (level 1)', async () => {
    const user = await authenticateUser({ email: 'manager@timber.id', password: 'password123' });
    assert.ok(user);
    assert.equal(user.roleLevel, 1);
    assert.equal(user.email, 'manager@timber.id');
  });

  await t.test('authenticates valid admin credentials (level 2)', async () => {
    const user = await authenticateUser({ email: 'admin@timber.id', password: 'password123' });
    assert.ok(user);
    assert.equal(user.roleLevel, 2);
  });

  await t.test('authenticates valid monitor credentials (level 3)', async () => {
    const user = await authenticateUser({ email: 'viewer@timber.id', password: 'password123' });
    assert.ok(user);
    assert.equal(user.roleLevel, 3);
  });

  await t.test('rejects incorrect password', async () => {
    const user = await authenticateUser({ email: 'manager@timber.id', password: 'wrongpassword' });
    assert.equal(user, null);
  });

  await t.test('rejects nonexistent user email', async () => {
    const user = await authenticateUser({ email: 'unknown@timber.id', password: 'password123' });
    assert.equal(user, null);
  });

  await t.test('getUserById retrieves correct user profile without password', () => {
    const user = getUserById('usr-manager-01');
    assert.ok(user);
    assert.equal(user.email, 'manager@timber.id');
    assert.equal((user as any).passwordHash, undefined);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/auth-users.test.ts`  
Expected: FAIL (cannot find module `src/auth/users.ts`).

- [ ] **Step 3: Update `src/types/index.ts` with Auth interfaces**

Append to `src/types/index.ts`:
```typescript
export type UserRoleLevel = 1 | 2 | 3;

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  roleLevel: UserRoleLevel;
  title: string;
}

export interface AuthSession {
  user: AuthUser;
  expiresAt: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthApiResponse {
  success: boolean;
  user?: AuthUser;
  error?: string;
}
```

- [ ] **Step 4: Implement `src/auth/users.ts` (<100 LOC)**

Create `src/auth/users.ts`:
```typescript
import { createHash, timingSafeEqual } from 'node:crypto';
import type { AuthUser, LoginCredentials, UserRoleLevel } from '../types/index.ts';

interface UserRecord extends AuthUser {
  passwordHash: string; // SHA-256 hash of password + static salt
}

const SALT = 'wood_inv_salt_2026';

function hashPassword(password: string): string {
  return createHash('sha256').update(`${password}:${SALT}`).digest('hex');
}

export const PRESET_USERS: UserRecord[] = [
  {
    id: 'usr-manager-01',
    email: 'manager@timber.id',
    name: 'Budi Santoso',
    roleLevel: 1,
    title: 'Kepala Operasional Gudang (Operations Manager)',
    passwordHash: hashPassword('password123'),
  },
  {
    id: 'usr-admin-02',
    email: 'admin@timber.id',
    name: 'Siti Rahmawati',
    roleLevel: 2,
    title: 'Auditor Keuangan & Pajak (Finance Auditor)',
    passwordHash: hashPassword('password123'),
  },
  {
    id: 'usr-viewer-03',
    email: 'viewer@timber.id',
    name: 'Robert Tan',
    roleLevel: 3,
    title: 'Direktur Eksekutif (Executive Director)',
    passwordHash: hashPassword('password123'),
  },
];

export async function authenticateUser(credentials: LoginCredentials): Promise<AuthUser | null> {
  const email = (credentials.email || '').trim().toLowerCase();
  const user = PRESET_USERS.find((u) => u.email.toLowerCase() === email);
  if (!user) return null;

  const targetHash = hashPassword(credentials.password || '');
  const inputBuf = Buffer.from(targetHash);
  const userBuf = Buffer.from(user.passwordHash);

  if (inputBuf.length !== userBuf.length) return null;
  if (!timingSafeEqual(inputBuf, userBuf)) return null;

  const { passwordHash, ...cleanUser } = user;
  return cleanUser;
}

export function getUserById(id: string): AuthUser | null {
  const user = PRESET_USERS.find((u) => u.id === id);
  if (!user) return null;
  const { passwordHash, ...cleanUser } = user;
  return cleanUser;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `node --test test/auth-users.test.ts`  
Expected: PASS (7/7 tests passed).

- [ ] **Step 6: Commit Task 1**

```bash
git add src/types/index.ts src/auth/users.ts test/auth-users.test.ts
git commit -m "feat(auth): define auth types and preset users credential store"
```

---

### Task 2: Stateless HMAC-SHA256 Token & Session Management

**Files:**
- Create: `src/auth/session.ts`
- Test: `test/auth-session.test.ts`

**Interfaces:**
- Consumes: `AuthUser`, `AuthSession` from `src/types/index.ts`
- Produces:
  - `createSessionToken(user: AuthUser, ttlSeconds?: number): string`
  - `verifySessionToken(token: string | undefined | null): AuthUser | null`
  - `COOKIE_NAME`: `'wood_session'`

- [ ] **Step 1: Write failing unit test for session tokens**

Create `test/auth-session.test.ts`:
```typescript
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSessionToken, verifySessionToken, COOKIE_NAME } from '../src/auth/session.ts';
import type { AuthUser } from '../src/types/index.ts';

const mockUser: AuthUser = {
  id: 'usr-manager-01',
  email: 'manager@timber.id',
  name: 'Budi Santoso',
  roleLevel: 1,
  title: 'Operations Manager',
};

test('Session Token Management Suite', async (t) => {
  await t.test('COOKIE_NAME is wood_session', () => {
    assert.equal(COOKIE_NAME, 'wood_session');
  });

  await t.test('creates and verifies valid session token', () => {
    const token = createSessionToken(mockUser, 3600);
    assert.ok(token.includes('.'));
    const verified = verifySessionToken(token);
    assert.ok(verified);
    assert.equal(verified.email, 'manager@timber.id');
    assert.equal(verified.roleLevel, 1);
  });

  await t.test('rejects tampered token payload', () => {
    const token = createSessionToken(mockUser, 3600);
    const [payloadB64, sig] = token.split('.');
    const tamperedPayload = Buffer.from(
      JSON.stringify({ ...JSON.parse(Buffer.from(payloadB64, 'base64url').toString()), roleLevel: 1 })
    ).toString('base64url');
    // Change signature slightly
    const tamperedToken = `${tamperedPayload}.${sig.slice(0, -2)}aa`;
    assert.equal(verifySessionToken(tamperedToken), null);
  });

  await t.test('rejects expired token', () => {
    // TTL -10 seconds (already expired)
    const token = createSessionToken(mockUser, -10);
    assert.equal(verifySessionToken(token), null);
  });

  await t.test('returns null on null or empty input', () => {
    assert.equal(verifySessionToken(null), null);
    assert.equal(verifySessionToken(''), null);
    assert.equal(verifySessionToken('invalid-format'), null);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/auth-session.test.ts`  
Expected: FAIL (cannot find module `src/auth/session.ts`).

- [ ] **Step 3: Implement `src/auth/session.ts` (<100 LOC)**

Create `src/auth/session.ts`:
```typescript
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { AuthUser, UserRoleLevel } from '../types/index.ts';

export const COOKIE_NAME = 'wood_session';
const DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
const SECRET = process.env.SESSION_SECRET || 'wood-inventory-development-secret-key-32chars-min';

interface TokenPayload {
  userId: string;
  email: string;
  name: string;
  roleLevel: UserRoleLevel;
  title: string;
  exp: number; // Unix epoch ms
}

function sign(data: string): string {
  return createHmac('sha256', SECRET).update(data).digest('base64url');
}

export function createSessionToken(user: AuthUser, ttlSeconds: number = DEFAULT_TTL_SECONDS): string {
  const exp = Date.now() + ttlSeconds * 1000;
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    roleLevel: user.roleLevel,
    title: user.title,
    exp,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = sign(payloadB64);
  return `${payloadB64}.${signature}`;
}

export function verifySessionToken(token: string | undefined | null): AuthUser | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadB64, signature] = parts;
  const expectedSignature = sign(payloadB64);

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSignature);

  if (sigBuf.length !== expBuf.length) return null;
  if (!timingSafeEqual(sigBuf, expBuf)) return null;

  try {
    const raw = Buffer.from(payloadB64, 'base64url').toString('utf-8');
    const payload: TokenPayload = JSON.parse(raw);

    if (Date.now() > payload.exp) {
      return null; // Expired
    }

    return {
      id: payload.userId,
      email: payload.email,
      name: payload.name,
      roleLevel: payload.roleLevel,
      title: payload.title,
    };
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/auth-session.test.ts`  
Expected: PASS (5/5 tests passed).

- [ ] **Step 5: Commit Task 2**

```bash
git add src/auth/session.ts test/auth-session.test.ts
git commit -m "feat(auth): implement HMAC-SHA256 session token creation and verification"
```

---

### Task 3: Authentication API Routes (`/api/auth/login`, `/api/auth/logout`, `/api/auth/me`)

**Files:**
- Create: `app/api/auth/login/route.ts`
- Create: `app/api/auth/logout/route.ts`
- Create: `app/api/auth/me/route.ts`
- Test: `test/auth-api.test.ts`

**Interfaces:**
- Consumes: `authenticateUser` from `src/auth/users.ts`, `createSessionToken`, `verifySessionToken`, `COOKIE_NAME` from `src/auth/session.ts`
- Produces: REST endpoints for authentication and session status.

- [ ] **Step 1: Write integration tests for API handlers**

Create `test/auth-api.test.ts`:
```typescript
import test from 'node:test';
import assert from 'node:assert/strict';
import { POST as loginHandler } from '../app/api/auth/login/route.ts';
import { POST as logoutHandler } from '../app/api/auth/logout/route.ts';
import { GET as meHandler } from '../app/api/auth/me/route.ts';
import { createSessionToken, COOKIE_NAME } from '../src/auth/session.ts';

test('Auth API Route Handlers Suite', async (t) => {
  await t.test('POST /api/auth/login success sets session cookie', async () => {
    const req = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'manager@timber.id', password: 'password123' }),
    });

    const res = await loginHandler(req);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.user.roleLevel, 1);

    const setCookie = res.headers.get('set-cookie');
    assert.ok(setCookie);
    assert.ok(setCookie.includes(`${COOKIE_NAME}=`));
    assert.ok(setCookie.includes('HttpOnly'));
  });

  await t.test('POST /api/auth/login failure returns 401', async () => {
    const req = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'manager@timber.id', password: 'badpassword' }),
    });

    const res = await loginHandler(req);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.success, false);
  });

  await t.test('POST /api/auth/logout clears cookie', async () => {
    const req = new Request('http://localhost:3000/api/auth/logout', { method: 'POST' });
    const res = await logoutHandler(req);
    assert.equal(res.status, 200);
    const setCookie = res.headers.get('set-cookie');
    assert.ok(setCookie);
    assert.ok(setCookie.includes('Max-Age=0'));
  });

  await t.test('GET /api/auth/me returns user for valid cookie', async () => {
    const token = createSessionToken({
      id: 'usr-admin-02',
      email: 'admin@timber.id',
      name: 'Siti Rahmawati',
      roleLevel: 2,
      title: 'Auditor',
    });

    const req = new Request('http://localhost:3000/api/auth/me', {
      headers: { cookie: `${COOKIE_NAME}=${token}` },
    });

    const res = await meHandler(req);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.user.roleLevel, 2);
  });

  await t.test('GET /api/auth/me returns 401 when cookie is missing', async () => {
    const req = new Request('http://localhost:3000/api/auth/me');
    const res = await meHandler(req);
    assert.equal(res.status, 401);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/auth-api.test.ts`  
Expected: FAIL (routes do not exist yet).

- [ ] **Step 3: Implement `app/api/auth/login/route.ts` (<50 LOC)**

Create `app/api/auth/login/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { authenticateUser } from '@/src/auth/users';
import { createSessionToken, COOKIE_NAME } from '@/src/auth/session';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const user = await authenticateUser(body);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Email atau kata sandi tidak valid.' },
        { status: 401 }
      );
    }

    const token = createSessionToken(user);
    const response = NextResponse.json({ success: true, user });

    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (err) {
    return NextResponse.json(
      { success: false, error: 'Format permintaan tidak valid.' },
      { status: 400 }
    );
  }
}
```

- [ ] **Step 4: Implement `app/api/auth/logout/route.ts` (<30 LOC)**

Create `app/api/auth/logout/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { COOKIE_NAME } from '@/src/auth/session';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Berhasil keluar.' });
  response.cookies.set({
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
```

- [ ] **Step 5: Implement `app/api/auth/me/route.ts` (<40 LOC)**

Create `app/api/auth/me/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken, COOKIE_NAME } from '@/src/auth/session';

export async function GET(request: Request) {
  let token: string | undefined;

  // Extract from Next.js cookies or request headers
  try {
    const cookieStore = await cookies();
    token = cookieStore.get(COOKIE_NAME)?.value;
  } catch {
    const rawHeader = request.headers.get('cookie') || '';
    const match = rawHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
    token = match ? match[1] : undefined;
  }

  const user = verifySessionToken(token);
  if (!user) {
    return NextResponse.json({ success: false, error: 'Belum masuk.' }, { status: 401 });
  }

  return NextResponse.json({ success: true, user });
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `node --test test/auth-api.test.ts`  
Expected: PASS (5/5 tests passed).

- [ ] **Step 7: Commit Task 3**

```bash
git add app/api/auth/ test/auth-api.test.ts
git commit -m "feat(api): implement login, logout, and me auth endpoints"
```

---

### Task 4: Next.js Middleware Route Guard

**Files:**
- Create: `middleware.ts`
- Test: `test/middleware-auth.test.ts`

**Interfaces:**
- Guard rule:
  - Any request to `/` or dashboard subpaths without valid `wood_session` cookie -> redirect to `/login`.
  - Any request to `/login` with valid `wood_session` cookie -> redirect to `/`.

- [ ] **Step 1: Write unit test for middleware redirection logic**

Create `test/middleware-auth.test.ts`:
```typescript
import test from 'node:test';
import assert from 'node:assert/strict';
import { middleware } from '../middleware.ts';
import { createSessionToken, COOKIE_NAME } from '../src/auth/session.ts';
import { NextRequest } from 'next/server';

test('Middleware Route Guard Suite', async (t) => {
  await t.test('unauthenticated visitor to / is redirected to /login', () => {
    const req = new NextRequest('http://localhost:3000/');
    const res = middleware(req);
    assert.ok(res);
    assert.equal(res.status, 307);
    assert.equal(new URL(res.headers.get('location')!).pathname, '/login');
  });

  await t.test('authenticated visitor to / is allowed through', () => {
    const token = createSessionToken({
      id: 'usr-1',
      email: 'manager@timber.id',
      name: 'Manager',
      roleLevel: 1,
      title: 'Manager',
    });
    const req = new NextRequest('http://localhost:3000/');
    req.cookies.set(COOKIE_NAME, token);
    const res = middleware(req);
    // NextResponse.next() returns 200 without redirect
    assert.equal(res.headers.get('location'), null);
  });

  await t.test('authenticated visitor to /login is redirected to /', () => {
    const token = createSessionToken({
      id: 'usr-1',
      email: 'manager@timber.id',
      name: 'Manager',
      roleLevel: 1,
      title: 'Manager',
    });
    const req = new NextRequest('http://localhost:3000/login');
    req.cookies.set(COOKIE_NAME, token);
    const res = middleware(req);
    assert.ok(res);
    assert.equal(res.status, 307);
    assert.equal(new URL(res.headers.get('location')!).pathname, '/');
  });

  await t.test('unauthenticated visitor to /login is allowed through', () => {
    const req = new NextRequest('http://localhost:3000/login');
    const res = middleware(req);
    assert.equal(res.headers.get('location'), null);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/middleware-auth.test.ts`  
Expected: FAIL (`middleware.ts` does not exist).

- [ ] **Step 3: Implement `middleware.ts` (<50 LOC)**

Create `middleware.ts`:
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken, COOKIE_NAME } from './src/auth/session';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const user = verifySessionToken(token);

  // If user is accessing /login while already authenticated -> redirect to /
  if (pathname === '/login') {
    if (user) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // If user is accessing protected routes without valid auth -> redirect to /login
  if (!user) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (/api/.*)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/middleware-auth.test.ts`  
Expected: PASS (4/4 tests passed).

- [ ] **Step 5: Commit Task 4**

```bash
git add middleware.ts test/middleware-auth.test.ts
git commit -m "feat(auth): implement middleware route guard for / and /login"
```

---

### Task 5: Client Auth Hook (`useAuth`)

**Files:**
- Create: `src/hooks/useAuth.ts`
- Test: `test/use-auth.test.ts`

**Interfaces:**
- Produces:
  - `useAuth()` hook returning:
    - `user: AuthUser | null`
    - `isLoading: boolean`
    - `canWrite: boolean` (`roleLevel === 1`)
    - `canViewAll: boolean` (`roleLevel === 1 || roleLevel === 2`)
    - `isMonitorOnly: boolean` (`roleLevel === 3`)
    - `login(credentials: LoginCredentials): Promise<{ success: boolean; error?: string }>`
    - `logout(): Promise<void>`

- [ ] **Step 1: Write unit test for useAuth permission logic**

Create `test/use-auth.test.ts`:
```typescript
import test from 'node:test';
import assert from 'node:assert/strict';
import { computePermissions } from '../src/hooks/useAuth.ts';

test('useAuth Permissions Logic Suite', async (t) => {
  await t.test('Level 1 user has full write and view permissions', () => {
    const perms = computePermissions(1);
    assert.equal(perms.canWrite, true);
    assert.equal(perms.canViewAll, true);
    assert.equal(perms.isMonitorOnly, false);
  });

  await t.test('Level 2 user has view permissions without write', () => {
    const perms = computePermissions(2);
    assert.equal(perms.canWrite, false);
    assert.equal(perms.canViewAll, true);
    assert.equal(perms.isMonitorOnly, false);
  });

  await t.test('Level 3 user has monitor only permissions', () => {
    const perms = computePermissions(3);
    assert.equal(perms.canWrite, false);
    assert.equal(perms.canViewAll, false);
    assert.equal(perms.isMonitorOnly, true);
  });

  await t.test('Null user has no permissions', () => {
    const perms = computePermissions(null);
    assert.equal(perms.canWrite, false);
    assert.equal(perms.canViewAll, false);
    assert.equal(perms.isMonitorOnly, false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/use-auth.test.ts`  
Expected: FAIL (`src/hooks/useAuth.ts` does not exist).

- [ ] **Step 3: Implement `src/hooks/useAuth.ts` (<120 LOC)**

Create `src/hooks/useAuth.ts`:
```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { AuthUser, LoginCredentials, UserRoleLevel } from '../types/index.ts';

export function computePermissions(roleLevel: UserRoleLevel | null | undefined) {
  return {
    canWrite: roleLevel === 1,
    canViewAll: roleLevel === 1 || roleLevel === 2,
    isMonitorOnly: roleLevel === 3,
  };
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch current session on mount
  const checkSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUser(data.user);
        return { success: true };
      }
      return { success: false, error: data.error || 'Gagal masuk.' };
    } catch {
      return { success: false, error: 'Terjadi kesalahan jaringan.' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
      setIsLoading(false);
      window.location.href = '/login';
    }
  }, []);

  const permissions = computePermissions(user?.roleLevel);

  return {
    user,
    isLoading,
    ...permissions,
    login,
    logout,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/use-auth.test.ts`  
Expected: PASS (4/4 tests passed).

- [ ] **Step 5: Commit Task 5**

```bash
git add src/hooks/useAuth.ts test/use-auth.test.ts
git commit -m "feat(hook): implement useAuth hook with role permissions evaluation"
```

---

### Task 6: Industrial Login Page (`app/login/page.tsx`)

**Files:**
- Create: `app/login/page.tsx` (<150 LOC)

**Interfaces:**
- Consumes: `useAuth` from `@/src/hooks/useAuth`
- Produces: Clean bilingual authentication UI with email, password, and error handling.

- [ ] **Step 1: Implement `app/login/page.tsx`**

Create `app/login/page.tsx`:
```tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/hooks/useAuth';
import { LogIn, Lock, Mail, AlertCircle, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError('Silakan masukkan email dan kata sandi.');
      return;
    }

    setSubmitting(true);
    const res = await login({ email, password });
    if (res.success) {
      router.push('/');
      router.refresh();
    } else {
      setError(res.error || 'Gagal masuk.');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-amber-800 to-amber-900 p-6 text-white text-center">
          <div className="w-12 h-12 bg-amber-700/50 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-inner">
            <ShieldCheck className="w-6 h-6 text-amber-200" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">
            Penerimaan Kayu & Stok Gudang
          </h1>
          <p className="text-xs text-amber-200 font-medium mt-1">
            木材入库与库存管理系统 · Otorisasi Multi-Level
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 md:p-8 flex flex-col gap-5">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Alamat Email (邮箱账号)
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@timber.id"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Kata Sandi (登录密码)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-amber-700 hover:bg-amber-800 text-white text-sm font-semibold rounded-lg shadow transition disabled:opacity-50"
          >
            <LogIn className="w-4 h-4" />
            <span>{submitting ? 'Memverifikasi...' : 'Masuk Sistem (登录)'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify Next.js build passes**

Run: `npm run build`  
Expected: PASS (generates `/login` page).

- [ ] **Step 3: Commit Task 6**

```bash
git add app/login/page.tsx
git commit -m "feat(ui): implement industrial login page with bilingual headers"
```

---

### Task 7: Header User Navigation & Role Badges (`UserNav.tsx`)

**Files:**
- Create: `src/components/layout/UserNav.tsx` (<80 LOC)

**Interfaces:**
- Consumes: `useAuth` from `@/src/hooks/useAuth`
- Produces: Header navigation badge displaying current user name, level pill, and logout button.

- [ ] **Step 1: Implement `src/components/layout/UserNav.tsx`**

Create `src/components/layout/UserNav.tsx`:
```tsx
'use client';

import React from 'react';
import { useAuth } from '@/src/hooks/useAuth';
import { LogOut, UserCheck } from 'lucide-react';

const ROLE_BADGES = {
  1: { label: 'Level 1: Manager', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  2: { label: 'Level 2: Admin', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  3: { label: 'Level 3: Monitor', color: 'bg-amber-100 text-amber-800 border-amber-300' },
};

export function UserNav() {
  const { user, logout, isLoading } = useAuth();

  if (isLoading || !user) {
    return <div className="h-8 w-24 bg-slate-200 animate-pulse rounded-lg" />;
  }

  const roleMeta = ROLE_BADGES[user.roleLevel] || ROLE_BADGES[3];

  return (
    <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700">
        <UserCheck className="w-4 h-4 text-amber-800" />
      </div>

      <div className="flex flex-col text-left">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-slate-900 leading-tight">
            {user.name}
          </span>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${roleMeta.color}`}>
            {roleMeta.label}
          </span>
        </div>
        <span className="text-[11px] text-slate-500 font-medium">
          {user.title}
        </span>
      </div>

      <button
        onClick={logout}
        title="Keluar dari akun (退出)"
        className="ml-2 p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
      >
        <LogOut className="w-4 h-4" />
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify Next.js build passes**

Run: `npm run build`  
Expected: PASS.

- [ ] **Step 3: Commit Task 7**

```bash
git add src/components/layout/UserNav.tsx
git commit -m "feat(ui): implement UserNav header component with role badges and logout"
```

---

### Task 8: RBAC Gating on Dashboard & Ledger Components

**Files:**
- Modify: `src/components/ledger/Toolbar.tsx` (<100 LOC)
- Modify: `src/components/ledger/RecordTable.tsx` (<120 LOC)
- Modify: `app/page.tsx` (<140 LOC)

**Interfaces:**
- `Toolbar`: accepts `canWrite: boolean` prop. If `false`, hides `+ Input Penerimaan` and `Reset Demo` buttons.
- `RecordTable`: accepts `canWrite: boolean` prop. If `false`, omits the right-most `Aksi (操作)` column and cells.
- `app/page.tsx`: consumes `useAuth()`.
  - Injects `UserNav` in header.
  - If `isMonitorOnly`: renders `KpiCards`, `SpeciesBar`, and a notice banner explaining table is restricted.
  - If `canViewAll`: renders `KpiCards`, `SpeciesBar`, `Toolbar`, and `RecordTable` with `canWrite` passed down.

- [ ] **Step 1: Update `src/components/ledger/Toolbar.tsx`**

Update `Toolbar.tsx` to accept `canWrite?: boolean`:
```tsx
interface ToolbarProps {
  filters: RecordFilterCriteria;
  speciesList: string[];
  canWrite?: boolean;
  onFilterChange: (filters: RecordFilterCriteria) => void;
  onResetDemo: () => void;
  onExportCsv: () => void;
  onNewEntry: () => void;
}
```
Wrap `Reset Demo` and `+ Input Penerimaan` in `{canWrite && (...) }`.

- [ ] **Step 2: Update `src/components/ledger/RecordTable.tsx`**

Update `RecordTable.tsx` to accept `canWrite?: boolean`:
```tsx
interface RecordTableProps {
  records: WoodReceivingRecord[];
  canWrite?: boolean;
  onEdit: (record: WoodReceivingRecord) => void;
  onDelete: (id: string) => void;
}
```
Only render `<th>Aksi (操作)</th>` and the action buttons `<td>` when `canWrite` is true.

- [ ] **Step 3: Update `app/page.tsx` to integrate RBAC**

Update `app/page.tsx`:
- Import `useAuth` and `UserNav`.
- Render `UserNav` in header.
- Conditionally render based on `canWrite` and `isMonitorOnly`.
- If `isMonitorOnly`, show:
```tsx
<div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-xs flex items-center justify-between">
  <div>
    <strong>Mode Monitor (Level 3):</strong> Anda memiliki akses monitoring metrik dan ringkasan spesies. Buku besar penerimaan dan manipulasi data hanya dapat diakses oleh Level 1 & Level 2.
  </div>
</div>
```

- [ ] **Step 4: Run unit tests**

Run: `npm test`  
Expected: PASS (all tests pass).

- [ ] **Step 5: Run Next.js production build**

Run: `npm run build`  
Expected: PASS (all pages build cleanly).

- [ ] **Step 6: Commit Task 8**

```bash
git add src/components/ledger/Toolbar.tsx src/components/ledger/RecordTable.tsx app/page.tsx
git commit -m "feat(app): gate toolbar, table actions, and dashboard view by role level"
```

---

### Task 9: End-to-End Build & Test Verification

**Files:**
- Verification: `npm test` and `npm run build`

- [ ] **Step 1: Run complete test suite**

Run: `npm test`  
Expected: PASS with 0 failures across all 60+ tests.

- [ ] **Step 2: Run Next.js production build**

Run: `npm run build`  
Expected: Next.js build succeeds with 0 TypeScript/lint errors.

- [ ] **Step 3: Commit final release tag**

```bash
git add .
git commit -m "chore(release): complete role-based login and 3-tier access control"
```
