import { createHash, timingSafeEqual } from 'crypto';
import type { AuthUser, LoginCredentials } from '../types/index.ts';

interface UserRecord extends AuthUser {
  passwordHash: string;
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
    title: 'Level 1',
    passwordHash: hashPassword('password123'),
  },
  {
    id: 'usr-admin-02',
    email: 'admin@timber.id',
    name: 'Siti Rahmawati',
    roleLevel: 2,
    title: 'Level 2',
    passwordHash: hashPassword('password123'),
  },
  {
    id: 'usr-viewer-03',
    email: 'viewer@timber.id',
    name: 'Robert Tan',
    roleLevel: 3,
    title: 'Level 3',
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
