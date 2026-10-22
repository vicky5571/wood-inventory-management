import { NextResponse } from 'next/server.js';
import { getAuthenticatedUser } from '../../../../../src/auth/session.ts';
import { createAuditedUserRepository } from '../../../../../src/persistence/user-repository-audited.ts';
import { hashPassword } from '../../../../../src/auth/password.ts';
import type { ResetPasswordPayload } from '../../../../../src/types/index.ts';

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
    const body = (await request.json()) as ResetPasswordPayload;
    if (!body.newPassword || body.newPassword.length < 8) {
      return NextResponse.json({ success: false, error: 'Password minimum 8 karakter' }, { status: 400 });
    }

    const auditedRepo = createAuditedUserRepository(actor);
    const passwordHash = hashPassword(body.newPassword);
    await auditedRepo.update(id, { passwordHash });

    return NextResponse.json({ success: true, data: { id } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to reset password';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
