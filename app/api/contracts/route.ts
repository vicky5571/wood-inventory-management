/**
 * app/api/contracts/route.ts
 *
 * REST API Endpoint for Perhutani Procurement Contracts.
 * Handles authenticated retrieval, creation, and deletion.
 */

import { NextResponse } from 'next/server.js';
import { contractStore } from '../../../src/persistence/contract-store.ts';
import { serverRecordStore } from '../../../src/persistence/server-record-store.ts';
import { getAuthenticatedUser } from '../../../src/auth/session.ts';
import type { ContractFormInput } from '../../../src/types/index.ts';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const includeDetails = url.searchParams.get('details') === 'true';

    const contracts = await contractStore.getAll();

    if (!includeDetails) {
      return NextResponse.json({
        success: true,
        data: contracts,
        timestamp: new Date().toISOString(),
      });
    }

    const details = await Promise.all(
      contracts.map(async (c) => {
        const [items, receipts] = await Promise.all([
          contractStore.getItems(c.id),
          contractStore.getReceipts(c.id),
        ]);
        return {
          ...c,
          items,
          receipts,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: details,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error('[API /api/contracts GET Error]:', err);
    const message = err instanceof Error ? err.message : 'Failed to retrieve contracts';
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

    if (user.roleLevel !== 1) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak: Hanya Level 1 yang dapat mengelola kontrak' },
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

    const payload = body as ContractFormInput;
    if (!payload.contractNumber?.trim()) {
      return NextResponse.json({ success: false, error: 'Nomor kontrak wajib diisi' }, { status: 400 });
    }
    if (!payload.kphOrigin?.trim()) {
      return NextResponse.json({ success: false, error: 'Asal KPH wajib diisi' }, { status: 400 });
    }
    if (!payload.effectiveStartDate || !payload.effectiveEndDate) {
      return NextResponse.json({ success: false, error: 'Tanggal mulai dan berakhir wajib diisi' }, { status: 400 });
    }
    if (!payload.items || payload.items.length === 0) {
      return NextResponse.json({ success: false, error: 'Minimal 1 sortimen kayu harus dimasukkan' }, { status: 400 });
    }

    const saved = await contractStore.saveContract(payload);

    await serverRecordStore.appendActivityLog({
      action: 'CONTRACT_CREATED',
      entityId: saved.id,
      entitySummary: `${saved.contractNumber} • ${saved.kphOrigin} (${saved.totalPurchasedVolumeM3} m³)`,
      operatorName: user.name,
      operatorRole: user.title || `Level ${user.roleLevel}`,
    });

    return NextResponse.json({
      success: true,
      data: saved,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error('[API /api/contracts POST Error]:', err);
    const message = err instanceof Error ? err.message : 'Failed to save contract';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Sesi tidak ditemukan atau kadaluarsa' },
        { status: 401 }
      );
    }

    if (user.roleLevel !== 1) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak: Hanya Level 1 yang dapat menghapus kontrak' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID parameter is required' }, { status: 400 });
    }

    await contractStore.deleteContract(id);

    await serverRecordStore.appendActivityLog({
      action: 'CONTRACT_DELETED',
      entityId: id,
      entitySummary: `Kontrak Perhutani ${id} berhasil dihapus`,
      operatorName: user.name,
      operatorRole: user.title || `Level ${user.roleLevel}`,
    });

    return NextResponse.json({
      success: true,
      id,
      message: 'Contract successfully deleted',
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error('[API /api/contracts DELETE Error]:', err);
    const message = err instanceof Error ? err.message : 'Failed to delete contract';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
