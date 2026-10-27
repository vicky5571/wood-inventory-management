import { NextResponse } from 'next/server.js';
import { serverRecordStore } from '../../../../src/persistence/server-record-store.ts';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const periods = await serverRecordStore.getAllReportPeriods();
    const period = periods.find((p) => p.id === id);

    if (!period) {
      return NextResponse.json({ success: false, error: 'Periode laporan tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: period });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal memuat detail periode laporan';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
