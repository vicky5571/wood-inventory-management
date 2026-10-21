/**
 * app/api/production/route.ts
 *
 * REST API Endpoint for Sawmill Production Records.
 * Handles authenticated retrieval and creation with sanity validations.
 */

import { NextResponse } from 'next/server.js';
import { productionStore } from '../../../src/persistence/production-store.ts';
import { serverRecordStore } from '../../../src/persistence/server-record-store.ts';
import { getAuthenticatedUser } from '../../../src/auth/session.ts';
import type { SawmillProductionFormInput } from '../../../src/types/index.ts';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await productionStore.getAll();
    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error('[API /api/production GET Error]:', err);
    const message = err instanceof Error ? err.message : 'Failed to retrieve production records';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Sesi tidak ditemukan atau kadaluarsa' },
        { status: 401 }
      );
    }

    if (user.roleLevel > 2) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak: Minimal Level 2 untuk mencatat produksi' },
        { status: 403 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON payload' }, { status: 400 });
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
    }

    const payload = body as SawmillProductionFormInput;

    if (!payload.productionDate?.trim()) {
      return NextResponse.json({ success: false, error: 'Tanggal produksi wajib diisi' }, { status: 400 });
    }
    if (!payload.sourceStorageYard?.trim() || !payload.sourceKavlingNumber?.trim()) {
      return NextResponse.json({ success: false, error: 'Lokasi TPK dan Kavling asal wajib dipilih' }, { status: 400 });
    }
    if (!payload.inputSpecies?.trim()) {
      return NextResponse.json({ success: false, error: 'Jenis kayu input wajib diisi' }, { status: 400 });
    }
    if (!payload.inputVolumeM3 || Number(payload.inputVolumeM3) <= 0) {
      return NextResponse.json({ success: false, error: 'Volume input (m3) harus lebih dari 0' }, { status: 400 });
    }
    if (!payload.inputPieces || Number(payload.inputPieces) <= 0) {
      return NextResponse.json({ success: false, error: 'Jumlah batang input harus lebih dari 0' }, { status: 400 });
    }
    if (!payload.outputProduct?.trim()) {
      return NextResponse.json({ success: false, error: 'Nama produk output wajib diisi' }, { status: 400 });
    }
    if (payload.outputVolumeM3 === undefined || Number(payload.outputVolumeM3) < 0) {
      return NextResponse.json({ success: false, error: 'Volume output (m3) tidak boleh negatif' }, { status: 400 });
    }
    if (payload.outputPieces === undefined || Number(payload.outputPieces) < 0) {
      return NextResponse.json({ success: false, error: 'Jumlah batang output tidak boleh negatif' }, { status: 400 });
    }
    if (Number(payload.outputVolumeM3) > Number(payload.inputVolumeM3)) {
      return NextResponse.json(
        { success: false, error: 'Volume output tidak boleh melebihi volume input (hukum kekekalan massa)' },
        { status: 400 }
      );
    }
    if (!payload.operatorName?.trim()) {
      return NextResponse.json({ success: false, error: 'Nama operator wajib diisi' }, { status: 400 });
    }

    const saved = await productionStore.save(payload);

    await serverRecordStore.appendActivityLog({
      action: 'PRODUCTION_CREATED',
      entityId: saved.id,
      entitySummary: `Produksi ${saved.outputProduct} (${saved.outputVolumeM3} m3) dari ${saved.sourceStorageYard}/${saved.sourceKavlingNumber}`,
      operatorName: user.name,
      operatorRole: user.title || `Level ${user.roleLevel}`,
    });

    return NextResponse.json({
      success: true,
      data: saved,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error('[API /api/production POST Error]:', err);
    const message = err instanceof Error ? err.message : 'Failed to create production record';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
