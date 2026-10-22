import { timingSafeEqual } from 'crypto';
import type { AuthUser, LoginCredentials } from '../types/index.ts';
import { getUserRepository } from '../persistence/user-repository.ts';
import { hashPassword } from './password.ts';
import { PRESET_USERS } from '../persistence/seed/fixtures-users.ts';

export { hashPassword, PRESET_USERS };

export async function authenticateUser(credentials: LoginCredentials): Promise<AuthUser | null> {
  const email = (credentials.email || '').trim().toLowerCase();
  const user = await getUserRepository().findByEmail(email);
  if (!user) return null;

  const targetHash = hashPassword(credentials.password || '');
  const inputBuf = Buffer.from(targetHash);
  const userBuf = Buffer.from(user.passwordHash);

  if (inputBuf.length !== userBuf.length) return null;
  if (!timingSafeEqual(inputBuf, userBuf)) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    roleLevel: user.roleLevel,
    title: user.title,
    ...(user.permissions ? { permissions: user.permissions } : {}),
  };
}

export async function getUserById(id: string): Promise<AuthUser | null> {
  const user = await getUserRepository().findById(id);
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    roleLevel: user.roleLevel,
    title: user.title,
    ...(user.permissions ? { permissions: user.permissions } : {}),
  };
}
