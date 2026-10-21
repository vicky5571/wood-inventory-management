/**
 * app/api/sorting/route.ts
 *
 * REST API Endpoint for Stock Sorting Redistribution Records.
 * Handles authenticated retrieval and creation with dual-kavling validations.
 */

import { NextResponse } from 'next/server.js';
import { sortingStore } from '../../../src/persistence/sorting-store.ts';
import { serverRecordStore } from '../../../src/persistence/server-record-store.ts';
import { getAuthenticatedUser } from '../../../src/auth/session.ts';
import type { StockSortingFormInput } from '../../../src/types/index.ts';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await sortingStore.getAll();
    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error('[API /api/sorting GET Error]:', err);
    const message = err instanceof Error ? err.message : 'Failed to retrieve sorting records';
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
        { success: false, error: 'Akses ditolak: Minimal Level 2 untuk mencatat sortir stok' },
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

    const payload = body as StockSortingFormInput;

    if (!payload.sortingDate?.trim()) {
      return NextResponse.json({ success: false, error: 'Tanggal sortir wajib diisi' }, { status: 400 });
    }
    if (!payload.species?.trim()) {
      return NextResponse.json({ success: false, error: 'Jenis kayu wajib diisi' }, { status: 400 });
    }
    if (!payload.sourceStorageYard?.trim() || !payload.sourceKavlingNumber?.trim()) {
      return NextResponse.json({ success: false, error: 'Lokasi TPK dan Kavling asal wajib dipilih' }, { status: 400 });
    }
    if (!payload.targetStorageYard?.trim() || !payload.targetKavlingNumber?.trim()) {
      return NextResponse.json({ success: false, error: 'Lokasi TPK dan Kavling tujuan wajib dipilih' }, { status: 400 });
    }

    const srcYard = payload.sourceStorageYard.trim().toLowerCase();
    const srcKav = payload.sourceKavlingNumber.trim().toLowerCase();
    const tgtYard = payload.targetStorageYard.trim().toLowerCase();
    const tgtKav = payload.targetKavlingNumber.trim().toLowerCase();

    if (srcYard === tgtYard && srcKav === tgtKav) {
      return NextResponse.json(
        { success: false, error: 'Kavling tujuan tidak boleh sama dengan kavling asal' },
        { status: 400 }
      );
    }

    if (!payload.volumeM3 || Number(payload.volumeM3) <= 0) {
      return NextResponse.json({ success: false, error: 'Volume (m3) harus lebih dari 0' }, { status: 400 });
    }
    if (!payload.pieces || Number(payload.pieces) <= 0) {
      return NextResponse.json({ success: false, error: 'Jumlah batang harus lebih dari 0' }, { status: 400 });
    }
    if (!payload.reason?.trim()) {
      return NextResponse.json({ success: false, error: 'Alasan sortir / pemindahan wajib diisi' }, { status: 400 });
    }
    if (!payload.operatorName?.trim()) {
      return NextResponse.json({ success: false, error: 'Nama operator wajib diisi' }, { status: 400 });
    }

    const saved = await sortingStore.save(payload);

    await serverRecordStore.appendActivityLog({
      action: 'SORTING_CREATED',
      entityId: saved.id,
      entitySummary: `Sortir ${saved.species} (${saved.volumeM3} m3) dari ${saved.sourceStorageYard}/${saved.sourceKavlingNumber} ke ${saved.targetStorageYard}/${saved.targetKavlingNumber}`,
      operatorName: user.name,
      operatorRole: user.title || `Level ${user.roleLevel}`,
    });

    return NextResponse.json({
      success: true,
      data: saved,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error('[API /api/sorting POST Error]:', err);
    const message = err instanceof Error ? err.message : 'Failed to create sorting record';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
