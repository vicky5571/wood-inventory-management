import { NextResponse } from 'next/server.js';
import { getAuthenticatedUser } from '../../../../src/auth/session.ts';
import { getUserRepository } from '../../../../src/persistence/user-repository.ts';
import { createAuditedUserRepository } from '../../../../src/persistence/user-repository-audited.ts';
import type { ManagedUser, UpdateUserPayload, UserRoleLevel, UserPermissions } from '../../../../src/types/index.ts';

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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await getAuthenticatedUser(request);
    if (!actor) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    if (actor.roleLevel !== 1) return NextResponse.json({ success: false, error: 'Akses ditolak: Hanya Level 1' }, { status: 403 });

    const { id } = await params;
    const repo = getUserRepository();
    const user = await repo.findByIdIncludingInactive(id);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: toManagedUser(user) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve user';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await getAuthenticatedUser(request);
    if (!actor) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    if (actor.roleLevel !== 1) return NextResponse.json({ success: false, error: 'Akses ditolak: Hanya Level 1' }, { status: 403 });

    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;

    // Reject forbidden fields (Invariant 3 soft-delete via dedicated routes, password via password route)
    if ('isActive' in body || 'password' in body || 'passwordHash' in body) {
      return NextResponse.json(
        { success: false, error: 'Field isActive dan password harus menggunakan endpoint dedicated' },
        { status: 400 }
      );
    }

    const repo = getUserRepository();
    const existing = await repo.findByIdIncludingInactive(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'User tidak ditemukan' }, { status: 404 });
    }

    const patch: UpdateUserPayload = {};

    // Validate email
    if (typeof body.email === 'string') {
      const email = body.email.trim().toLowerCase();
      if (!email.includes('@')) {
        return NextResponse.json({ success: false, error: 'Email format invalid' }, { status: 400 });
      }
      patch.email = email;
    }

    // Validate name
    if (typeof body.name === 'string') {
      const name = body.name.trim();
      if (!name) {
        return NextResponse.json({ success: false, error: 'Nama wajib diisi' }, { status: 400 });
      }
      patch.name = name;
    }

    // Validate title
    if (typeof body.title === 'string') {
      const title = body.title.trim();
      if (!title) {
        return NextResponse.json({ success: false, error: 'Title / Jabatan wajib diisi' }, { status: 400 });
      }
      patch.title = title;
    }

    // Validate roleLevel & Invariant 4
    if (body.roleLevel !== undefined) {
      const roleLevel = Number(body.roleLevel) as UserRoleLevel;
      if (![1, 2, 3].includes(roleLevel)) {
        return NextResponse.json({ success: false, error: 'Role level harus 1, 2, atau 3' }, { status: 400 });
      }

      // Invariant 4: No self-demotion
      if (actor.id === id && roleLevel !== actor.roleLevel) {
        return NextResponse.json({ success: false, error: 'Tidak dapat mengubah role sendiri' }, { status: 403 });
      }

      // Invariant 4: Last Level 1 guard
      if (existing.roleLevel === 1 && roleLevel !== 1) {
        const activeUsers = await repo.listAll({ includeInactive: false });
        const activeL1Count = activeUsers.filter((u) => u.roleLevel === 1).length;
        if (activeL1Count <= 1) {
          return NextResponse.json(
            { success: false, error: 'Tidak dapat mengubah role: Minimal 1 user Level 1 aktif harus tetap ada' },
            { status: 409 }
          );
        }
      }

      patch.roleLevel = roleLevel;
    }

    // Invariant 5: Auto-reset permissions on role change
    const isRoleChanging = patch.roleLevel !== undefined && patch.roleLevel !== existing.roleLevel;
    if (isRoleChanging) {
      patch.permissions = {};
    } else if (body.permissions !== undefined && typeof body.permissions === 'object' && body.permissions !== null) {
      // Invariant 6 & 7: Permission schema and role-scoping
      const effectiveRole = patch.roleLevel ?? existing.roleLevel;
      if (effectiveRole === 2) {
        const permObj = body.permissions as Record<string, unknown>;
        patch.permissions = {
          tallyCreate: Boolean(permObj.tallyCreate),
        };
      } else {
        patch.permissions = {};
      }
    }

    const auditedRepo = createAuditedUserRepository(actor);
    try {
      const updated = await auditedRepo.update(id, patch);
      return NextResponse.json({ success: true, data: toManagedUser(updated) });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'DuplicateEmailError') {
        return NextResponse.json({ success: false, error: 'Email sudah digunakan oleh user aktif' }, { status: 409 });
      }
      throw err;
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update user';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
