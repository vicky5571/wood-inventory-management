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
      return null;
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
