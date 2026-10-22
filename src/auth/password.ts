/**
 * src/auth/password.ts
 *
 * Password hashing utilities.
 */

import { createHash } from 'crypto';

export const AUTH_SALT = 'wood_inv_salt_2026';

export function hashPassword(password: string): string {
  return createHash('sha256').update(`${password}:${AUTH_SALT}`).digest('hex');
}

