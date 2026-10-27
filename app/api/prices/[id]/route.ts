import { NextResponse } from 'next/server.js';
import { serverRecordStore } from '../../../../src/persistence/server-record-store.ts';
import { getAuthenticatedUser } from '../../../../src/auth/session.ts';

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
      return NextResponse.json({ success: false, error: 'Akses ditolak: Hanya Admin L1 yang dapat mengubah harga' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const entry = await serverRecordStore.savePriceEntry({ ...body, id });

    await serverRecordStore.appendActivityLog({
      action: 'UPDATE_PRICE_ENTRY',
      entityId: entry.id,
      entitySummary: `Ubah harga kayu: ${entry.woodSpecies} @ Rp ${entry.pricePerM3.toLocaleString('id-ID')}`,
      operatorName: user.name,
      operatorRole: user.title || `Level ${user.roleLevel}`,
      metadata: entry as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ success: true, data: entry });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal memperbarui harga kayu';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (user.roleLevel !== 1) {
      return NextResponse.json({ success: false, error: 'Akses ditolak: Hanya Admin L1 yang dapat menghapus harga' }, { status: 403 });
    }

    const { id } = await params;
    await serverRecordStore.deletePriceEntry(id);

    await serverRecordStore.appendActivityLog({
      action: 'DELETE_PRICE_ENTRY',
      entityId: id,
      entitySummary: `Hapus harga kayu: ${id}`,
      operatorName: user.name,
      operatorRole: user.title || `Level ${user.roleLevel}`,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal menghapus harga kayu';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
