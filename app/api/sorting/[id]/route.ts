/**
 * app/api/sorting/[id]/route.ts
 *
 * REST API Endpoint for individual Stock Sorting Record operations.
 */

import { NextResponse } from 'next/server.js';
import { sortingStore } from '../../../../src/persistence/sorting-store.ts';
import { serverRecordStore } from '../../../../src/persistence/server-record-store.ts';
import { getAuthenticatedUser } from '../../../../src/auth/session.ts';
import type { StockSortingFormInput } from '../../../../src/types/index.ts';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const record = await sortingStore.getById(id);

    if (!record) {
      return NextResponse.json({ success: false, error: 'Sorting record not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: record });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve sorting record';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (user.roleLevel > 2) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = (await request.json()) as Partial<StockSortingFormInput>;

    const existing = await sortingStore.getById(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Sorting record not found' }, { status: 404 });
    }

    const mergedInput: StockSortingFormInput = {
      id,
      sortingDate: body.sortingDate ?? existing.sortingDate,
      species: body.species ?? existing.species,
      sourceStorageYard: body.sourceStorageYard ?? existing.sourceStorageYard,
      sourceKavlingNumber: body.sourceKavlingNumber ?? existing.sourceKavlingNumber,
      targetStorageYard: body.targetStorageYard ?? existing.targetStorageYard,
      targetKavlingNumber: body.targetKavlingNumber ?? existing.targetKavlingNumber,
      volumeM3: body.volumeM3 !== undefined ? Number(body.volumeM3) : existing.volumeM3,
      pieces: body.pieces !== undefined ? Number(body.pieces) : existing.pieces,
      reason: body.reason ?? existing.reason,
      operatorName: body.operatorName ?? existing.operatorName,
      notes: body.notes !== undefined ? body.notes : existing.notes,
    };

    const srcYard = mergedInput.sourceStorageYard.trim().toLowerCase();
    const srcKav = mergedInput.sourceKavlingNumber.trim().toLowerCase();
    const tgtYard = mergedInput.targetStorageYard.trim().toLowerCase();
    const tgtKav = mergedInput.targetKavlingNumber.trim().toLowerCase();

    if (srcYard === tgtYard && srcKav === tgtKav) {
      return NextResponse.json(
        { success: false, error: 'Kavling tujuan tidak boleh sama dengan kavling asal' },
        { status: 400 }
      );
    }

    if (mergedInput.volumeM3 <= 0 || mergedInput.pieces <= 0) {
      return NextResponse.json({ success: false, error: 'Volume dan jumlah batang harus lebih dari 0' }, { status: 400 });
    }

    const saved = await sortingStore.save(mergedInput);

    await serverRecordStore.appendActivityLog({
      action: 'SORTING_UPDATED',
      entityId: saved.id,
      entitySummary: `Sortir ${saved.species} (${saved.volumeM3} m3) diperbarui`,
      operatorName: user.name,
      operatorRole: user.title || `Level ${user.roleLevel}`,
    });

    return NextResponse.json({ success: true, data: saved });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update sorting record';
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
      return NextResponse.json({ success: false, error: 'Akses ditolak: Hanya Level 1 yang dapat menghapus data sortir' }, { status: 403 });
    }

    const { id } = await params;
    const existing = await sortingStore.getById(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Sorting record not found' }, { status: 404 });
    }

    await sortingStore.delete(id);

    await serverRecordStore.appendActivityLog({
      action: 'SORTING_DELETED',
      entityId: id,
      entitySummary: `Catatan sortir ${existing.species} (${existing.volumeM3} m3) dihapus`,
      operatorName: user.name,
      operatorRole: user.title || `Level ${user.roleLevel}`,
    });

    return NextResponse.json({ success: true, id, message: 'Sorting record deleted successfully' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete sorting record';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
