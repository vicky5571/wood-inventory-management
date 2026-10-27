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
      return NextResponse.json({ success: false, error: 'Akses ditolak: Hanya Admin L1 yang dapat menutup periode laporan' }, { status: 403 });
    }

    const { id } = await params;
    const periods = await serverRecordStore.getAllReportPeriods();
    const period = periods.find((p) => p.id === id);

    if (!period) {
      return NextResponse.json({ success: false, error: 'Periode laporan tidak ditemukan' }, { status: 404 });
    }

    const allRecords = await serverRecordStore.getAll();
    const inRange = allRecords.filter(
      (r) => r.receiptDate >= period.startDate && r.receiptDate <= period.endDate
    );

    const result = await serverRecordStore.closeReportPeriod(id, inRange, user.name ?? 'Admin');

    await serverRecordStore.appendActivityLog({
      action: 'CLOSE_REPORT_PERIOD',
      entityId: id,
      entitySummary: `Tutup periode laporan: ${period.name} (${result.appliedCount} record dipriced, ${result.totalVolumeM3.toFixed(2)} m³)`,
      operatorName: user.name,
      operatorRole: user.title || `Level ${user.roleLevel}`,
      metadata: result as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal menutup periode laporan';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
