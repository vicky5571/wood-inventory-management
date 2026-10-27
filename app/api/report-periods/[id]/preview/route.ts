import { NextResponse } from 'next/server.js';
import { serverRecordStore } from '../../../../../src/persistence/server-record-store.ts';
import { getAuthenticatedUser } from '../../../../../src/auth/session.ts';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
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

    const preview = await serverRecordStore.previewReportPeriodClose(id, inRange);
    return NextResponse.json({ success: true, data: preview });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal menghasilkan preview penutupan laporan';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
