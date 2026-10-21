/**
 * app/api/production/[id]/route.ts
 *
 * REST API Endpoint for individual Sawmill Production Record operations.
 */

import { NextResponse } from 'next/server.js';
import { productionStore } from '../../../../src/persistence/production-store.ts';
import { serverRecordStore } from '../../../../src/persistence/server-record-store.ts';
import { getAuthenticatedUser } from '../../../../src/auth/session.ts';
import type { SawmillProductionFormInput } from '../../../../src/types/index.ts';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const record = await productionStore.getById(id);

    if (!record) {
      return NextResponse.json({ success: false, error: 'Production record not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: record });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve production record';
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
    const body = (await request.json()) as Partial<SawmillProductionFormInput>;

    if (body.inputVolumeM3 !== undefined && Number(body.inputVolumeM3) <= 0) {
      return NextResponse.json({ success: false, error: 'Volume input (m3) harus lebih dari 0' }, { status: 400 });
    }
    if (body.outputVolumeM3 !== undefined && Number(body.outputVolumeM3) < 0) {
      return NextResponse.json({ success: false, error: 'Volume output (m3) tidak boleh negatif' }, { status: 400 });
    }
    if (
      body.inputVolumeM3 !== undefined &&
      body.outputVolumeM3 !== undefined &&
      Number(body.outputVolumeM3) > Number(body.inputVolumeM3)
    ) {
      return NextResponse.json(
        { success: false, error: 'Volume output tidak boleh melebihi volume input' },
        { status: 400 }
      );
    }

    const existing = await productionStore.getById(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Production record not found' }, { status: 404 });
    }

    const mergedInput: SawmillProductionFormInput = {
      id,
      productionDate: body.productionDate ?? existing.productionDate,
      shift: body.shift ?? existing.shift,
      sourceStorageYard: body.sourceStorageYard ?? existing.sourceStorageYard,
      sourceKavlingNumber: body.sourceKavlingNumber ?? existing.sourceKavlingNumber,
      inputSpecies: body.inputSpecies ?? existing.inputSpecies,
      inputVolumeM3: body.inputVolumeM3 !== undefined ? Number(body.inputVolumeM3) : existing.inputVolumeM3,
      inputPieces: body.inputPieces !== undefined ? Number(body.inputPieces) : existing.inputPieces,
      outputProduct: body.outputProduct ?? existing.outputProduct,
      outputVolumeM3: body.outputVolumeM3 !== undefined ? Number(body.outputVolumeM3) : existing.outputVolumeM3,
      outputPieces: body.outputPieces !== undefined ? Number(body.outputPieces) : existing.outputPieces,
      operatorName: body.operatorName ?? existing.operatorName,
      notes: body.notes !== undefined ? body.notes : existing.notes,
    };

    if (mergedInput.outputVolumeM3 > mergedInput.inputVolumeM3) {
      return NextResponse.json(
        { success: false, error: 'Volume output tidak boleh melebihi volume input' },
        { status: 400 }
      );
    }

    const saved = await productionStore.save(mergedInput);

    await serverRecordStore.appendActivityLog({
      action: 'PRODUCTION_UPDATED',
      entityId: saved.id,
      entitySummary: `Produksi ${saved.outputProduct} (${saved.outputVolumeM3} m3) diperbarui`,
      operatorName: user.name,
      operatorRole: user.title || `Level ${user.roleLevel}`,
    });

    return NextResponse.json({ success: true, data: saved });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update production record';
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
      return NextResponse.json({ success: false, error: 'Akses ditolak: Hanya Level 1 yang dapat menghapus data produksi' }, { status: 403 });
    }

    const { id } = await params;
    const existing = await productionStore.getById(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Production record not found' }, { status: 404 });
    }

    await productionStore.delete(id);

    await serverRecordStore.appendActivityLog({
      action: 'PRODUCTION_DELETED',
      entityId: id,
      entitySummary: `Catatan produksi ${existing.outputProduct} (${existing.outputVolumeM3} m3) dihapus`,
      operatorName: user.name,
      operatorRole: user.title || `Level ${user.roleLevel}`,
    });

    return NextResponse.json({ success: true, id, message: 'Production record deleted successfully' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete production record';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
