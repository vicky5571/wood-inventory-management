import { NextResponse } from 'next/server.js';
import { serverRecordStore } from '../../../src/persistence/server-record-store.ts';
import { getAuthenticatedUser } from '../../../src/auth/session.ts';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const entries = await serverRecordStore.getAllPriceEntries();
    return NextResponse.json({ success: true, data: entries });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal memuat tabel harga';
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
      return NextResponse.json({ success: false, error: 'Akses ditolak: Hanya Admin L1 yang dapat menambah harga' }, { status: 403 });
    }

    const body = await request.json();
    if (!body.woodSpecies || body.pricePerM3 == null || !body.effectiveFrom) {
      return NextResponse.json(
        { success: false, error: 'Jenis kayu, harga/m³, dan tanggal berlaku dari wajib diisi' },
        { status: 400 }
      );
    }

    const entry = await serverRecordStore.savePriceEntry({
      ...body,
      createdBy: user.name,
    });

    await serverRecordStore.appendActivityLog({
      action: 'CREATE_PRICE_ENTRY',
      entityId: entry.id,
      entitySummary: `Tambah harga kayu: ${entry.woodSpecies} @ Rp ${entry.pricePerM3.toLocaleString('id-ID')}`,
      operatorName: user.name,
      operatorRole: user.title || `Level ${user.roleLevel}`,
      metadata: entry as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ success: true, data: entry }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal menyimpan harga kayu';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
