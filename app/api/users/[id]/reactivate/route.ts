import { NextResponse } from 'next/server.js';
import { getAuthenticatedUser } from '../../../../../src/auth/session.ts';
import { getUserRepository } from '../../../../../src/persistence/user-repository.ts';
import { createAuditedUserRepository } from '../../../../../src/persistence/user-repository-audited.ts';
import type { ManagedUser, UserRoleLevel, UserPermissions } from '../../../../../src/types/index.ts';

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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await getAuthenticatedUser(request);
    if (!actor) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    if (actor.roleLevel !== 1) return NextResponse.json({ success: false, error: 'Akses ditolak: Hanya Level 1' }, { status: 403 });

    const { id } = await params;

    const repo = getUserRepository();
    const existing = await repo.findByIdIncludingInactive(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'User tidak ditemukan' }, { status: 404 });
    }

    const auditedRepo = createAuditedUserRepository(actor);
    const updated = await auditedRepo.update(id, { isActive: true });

    return NextResponse.json({ success: true, data: toManagedUser(updated) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to reactivate user';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
