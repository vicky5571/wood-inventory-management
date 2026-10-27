import { NextResponse } from 'next/server.js';
import { serverRecordStore } from '../../../../../src/persistence/server-record-store.ts';
import { getAuthenticatedUser } from '../../../../../src/auth/session.ts';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (user.roleLevel !== 1) {
      return NextResponse.json({ success: false, error: 'Akses ditolak: Hanya Admin L1 yang dapat membuka kembali periode laporan' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const reason = (body?.reason || '').trim();

    if (!reason) {
      return NextResponse.json({ success: false, error: 'Alasan buka kembali wajib diisi' }, { status: 400 });
    }

    const period = await serverRecordStore.reopenReportPeriod(id, user.name ?? 'Admin', reason);

    await serverRecordStore.appendActivityLog({
      action: 'REOPEN_REPORT_PERIOD',
      entityId: id,
      entitySummary: `Buka kembali periode laporan: ${period.name} — Alasan: ${reason}`,
      operatorName: user.name,
      operatorRole: user.title || `Level ${user.roleLevel}`,
      metadata: { reason },
    });

    return NextResponse.json({ success: true, data: period });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal membuka kembali periode laporan';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
