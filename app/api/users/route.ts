import { NextResponse } from 'next/server.js';
import { getAuthenticatedUser } from '../../../src/auth/session.ts';
import { getUserRepository } from '../../../src/persistence/user-repository.ts';
import { createAuditedUserRepository } from '../../../src/persistence/user-repository-audited.ts';
import { hashPassword } from '../../../src/auth/password.ts';
import type { CreateUserPayload, ManagedUser, UserRoleLevel, UserPermissions } from '../../../src/types/index.ts';

export const dynamic = 'force-dynamic';

function toManagedUser(user: {
  id: string;
  email: string;
  name: string;
  roleLevel: UserRoleLevel;
  title: string;
  permissions?: UserPermissions;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}): ManagedUser {
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
