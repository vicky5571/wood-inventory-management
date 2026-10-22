import { NextResponse } from 'next/server.js';
import { getAuthenticatedUser } from '../../../../../src/auth/session.ts';
import { getUserRepository } from '../../../../../src/persistence/user-repository.ts';
import { createAuditedUserRepository } from '../../../../../src/persistence/user-repository-audited.ts';

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

    // Invariant 4: No self-deactivation
    if (id === actor.id) {
      return NextResponse.json({ success: false, error: 'Tidak dapat menonaktifkan akun sendiri' }, { status: 403 });
    }

    const repo = getUserRepository();
    const existing = await repo.findByIdIncludingInactive(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'User tidak ditemukan' }, { status: 404 });
    }

    // Invariant 4: Last Level 1 guard
    if (existing.roleLevel === 1) {
      const activeUsers = await repo.listAll({ includeInactive: false });
      const activeL1Count = activeUsers.filter((u) => u.roleLevel === 1).length;
      if (activeL1Count <= 1) {
        return NextResponse.json(
          { success: false, error: 'Tidak dapat menonaktifkan user: Minimal 1 user Level 1 aktif harus tetap ada' },
          { status: 409 }
        );
      }
    }

    const auditedRepo = createAuditedUserRepository(actor);
    await auditedRepo.deactivate(id);

    return NextResponse.json({ success: true, data: { id } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to deactivate user';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
