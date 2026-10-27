import { NextResponse } from 'next/server.js';
import { serverRecordStore } from '../../../src/persistence/server-record-store.ts';
import { getAuthenticatedUser } from '../../../src/auth/session.ts';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const periods = await serverRecordStore.getAllReportPeriods();
    return NextResponse.json({ success: true, data: periods });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal memuat periode laporan';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (user.roleLevel !== 1) {
      return NextResponse.json({ success: false, error: 'Akses ditolak: Hanya Admin L1 yang dapat membuat periode laporan' }, { status: 403 });
    }

    const body = await request.json();
    if (!body.name || !body.startDate || !body.endDate) {
      return NextResponse.json(
        { success: false, error: 'Nama periode, tanggal mulai, dan tanggal akhir wajib diisi' },
        { status: 400 }
      );
    }

    if (body.startDate > body.endDate) {
      return NextResponse.json(
        { success: false, error: 'Tanggal mulai tidak boleh lebih besar dari tanggal akhir' },
        { status: 400 }
      );
    }

    const period = await serverRecordStore.saveReportPeriod({
      ...body,
      status: 'OPEN',
      createdBy: user.name,
    });

    await serverRecordStore.appendActivityLog({
      action: 'CREATE_REPORT_PERIOD',
      entityId: period.id,
      entitySummary: `Buat periode laporan: ${period.name} (${period.startDate} s/d ${period.endDate})`,
      operatorName: user.name,
      operatorRole: user.title || `Level ${user.roleLevel}`,
      metadata: period as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ success: true, data: period }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal membuat periode laporan';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
