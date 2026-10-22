/**
 * src/auth/session.ts
 *
 * JWT Session management & fresh user lookup per request.
 * Spec: docs/superpowers/specs/2026-10-22-session-invalidation-design.md
 * ADR: docs/adr/0014-fresh-user-lookup-per-request.md
 *
 * Token Payload Roles (per ADR-0014):
 * - userId & exp: authoritative (session validity & identity proof)
 * - email, name, roleLevel, title, permissions: decorative / hints for backward-compat
 * Database is the sole authority on current user state, role, and permissions.
 */

import { createHmac, timingSafeEqual } from 'crypto';
import type { AuthUser, UserPermissions, UserRoleLevel, AuthFailureReason, AuthResult } from '../types/index.ts';
import { getUserRepository } from '../persistence/user-repository.ts';

export const COOKIE_NAME = 'wood_session';
const DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
function getSecret(): string {
  return process.env.SESSION_SECRET || 'wood-inventory-development-secret-key-32chars-min';
}

interface TokenPayload {
  userId: string;
  email: string;
  name: string;
  roleLevel: UserRoleLevel;
  title: string;
  permissions?: UserPermissions;
  exp: number; // Unix epoch ms
}

function sign(data: string): string {
  return createHmac('sha256', getSecret()).update(data).digest('base64url');
}

export function createSessionToken(user: AuthUser, ttlSeconds: number = DEFAULT_TTL_SECONDS): string {
  const exp = Date.now() + ttlSeconds * 1000;
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    roleLevel: user.roleLevel,
    title: user.title,
    ...(user.permissions ? { permissions: user.permissions } : {}),
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
  if (!payloadB64 || !signature) return null;

  const expectedSignature = sign(payloadB64);

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSignature);

  if (sigBuf.length !== expBuf.length) return null;
  if (!timingSafeEqual(sigBuf, expBuf)) return null;

  try {
    const raw = Buffer.from(payloadB64, 'base64url').toString('utf-8');
    const payload = JSON.parse(raw);
    if (!payload || typeof payload !== 'object') return null;

    if (typeof payload.exp !== 'number' || Date.now() > payload.exp) {
      return null;
    }

    if (!payload.userId || typeof payload.userId !== 'string') {
      return null;
    }

    const user: AuthUser = {
      id: payload.userId,
      email: payload.email,
      name: payload.name,
      roleLevel: payload.roleLevel,
      title: payload.title,
    };
    if (payload.permissions) {
      user.permissions = payload.permissions;
    }

    return user;
  } catch {
    return null;
  }
}

export async function extractToken(request?: Request): Promise<string | undefined> {
  if (!request) return undefined;
  const rawHeader = request.headers.get('cookie') || '';
  const match = rawHeader.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]+)`));
  let token = match ? match[1] : undefined;
  if (!token) {
    try {
      const { cookies } = await import('next/headers');
      token = (await cookies()).get(COOKIE_NAME)?.value;
    } catch {
      token = undefined;
    }
  }
  return token;
}

function parseAndVerifyTokenPayload(token: string): { payload?: TokenPayload; reason?: AuthFailureReason } {
  const parts = token.split('.');
  if (parts.length !== 2) return { reason: 'TOKEN_MALFORMED' };

  const [payloadB64, signature] = parts;
  if (!payloadB64 || !signature) return { reason: 'TOKEN_MALFORMED' };

  const expectedSignature = sign(payloadB64);
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSignature);

  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return { reason: 'TOKEN_INVALID' };
  }

  try {
    const raw = Buffer.from(payloadB64, 'base64url').toString('utf-8');
    const payload = JSON.parse(raw);
    if (!payload || typeof payload !== 'object' || !payload.userId || typeof payload.userId !== 'string') {
      return { reason: 'TOKEN_MALFORMED' };
    }
    if (typeof payload.exp !== 'number' || Date.now() > payload.exp) {
      return { reason: 'TOKEN_EXPIRED' };
    }
    return { payload };
  } catch {
    return { reason: 'TOKEN_MALFORMED' };
  }
}

export async function getAuthenticatedUserDetailed(request: Request): Promise<AuthResult> {
  const token = await extractToken(request);
  if (!token) {
    return { user: null, reason: 'NO_TOKEN' };
  }

  const { payload, reason } = parseAndVerifyTokenPayload(token);
  if (!payload) {
    return { user: null, reason };
  }

  const repo = getUserRepository();
  const dbUser = await repo.findById(payload.userId);
  if (dbUser) {
    const authUser: AuthUser = {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      roleLevel: dbUser.roleLevel,
      title: dbUser.title,
      ...(dbUser.permissions ? { permissions: dbUser.permissions } : {}),
    };
    return { user: authUser };
  }

  try {
    const allUsers = await repo.listAll({ includeInactive: true });
    const userExists = allUsers.some((u) => u.id === payload.userId);
    return { user: null, reason: userExists ? 'USER_INACTIVE' : 'USER_NOT_FOUND' };
  } catch {
    return { user: null, reason: 'USER_NOT_FOUND' };
  }
}

export async function getAuthenticatedUser(request: Request): Promise<AuthUser | null> {
  const result = await getAuthenticatedUserDetailed(request);
  return result.user;
}
