/**
 * app/api/sales/route.ts
 *
 * REST API Endpoint for Outbound Wood Sales Records.
 * Handles authenticated retrieval, creation, modification, and deletion.
 */

import { NextResponse } from 'next/server.js';
import { salesStore } from '../../../src/persistence/sales-store.ts';
import { serverRecordStore } from '../../../src/persistence/server-record-store.ts';
import { getAuthenticatedUser } from '../../../src/auth/session.ts';
import { calculateLotStockBalance, validateSalesStockAllowance } from '../../../src/utils/stock-balance.ts';
import type { AuthUser, SalesFormInput } from '../../../src/types/index.ts';

export const dynamic = 'force-dynamic';


export async function GET() {
  try {
    const data = await salesStore.getAll();
    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error('[API /api/sales GET Error]:', err);
    const message = err instanceof Error ? err.message : 'Failed to retrieve sales records';
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
        { success: false, error: 'Akses ditolak: Hanya Level 1 yang dapat mencatat penjualan' },
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

    const payload = body as SalesFormInput;
    if (!payload.customerName?.trim()) {
      return NextResponse.json({ success: false, error: 'Validation error: Nama pembeli wajib diisi' }, { status: 400 });
    }
    if (!payload.storageYard?.trim() || !payload.kavlingNumber?.trim()) {
      return NextResponse.json({ success: false, error: 'Validation error: Lokasi TPK dan Kavling wajib dipilih' }, { status: 400 });
    }
    if (!payload.pieces || payload.pieces <= 0) {
      return NextResponse.json({ success: false, error: 'Validation error: Jumlah batang harus lebih dari 0' }, { status: 400 });
    }
    if (!payload.volumeM3 || payload.volumeM3 <= 0) {
      return NextResponse.json({ success: false, error: 'Validation error: Volume (m³) harus lebih dari 0' }, { status: 400 });
    }

    const inboundRecords = await serverRecordStore.getAll();
    const existingSales = await salesStore.getAll();
    const netSales = payload.id ? existingSales.filter((s) => s.id !== payload.id) : existingSales;
    const balance = calculateLotStockBalance(inboundRecords, netSales, payload.storageYard, payload.kavlingNumber);
    const allowance = validateSalesStockAllowance(balance, Number(payload.volumeM3), Number(payload.pieces));
    if (!allowance.isAllowed) {
      return NextResponse.json({ success: false, error: allowance.warning || 'Stok kavling tidak mencukupi' }, { status: 400 });
    }

    const saved = await salesStore.save(payload);

    await serverRecordStore.appendActivityLog({
      action: 'SALE_CREATED',
      entityId: saved.id,
      entitySummary: `${saved.deliveryOrderNumber} • ${saved.customerName} (${saved.volumeM3} m³)`,
      operatorName: user.name,
      operatorRole: user.title || `Level ${user.roleLevel}`,
    });

    return NextResponse.json({
      success: true,
      data: saved,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error('[API /api/sales POST Error]:', err);
    const message = err instanceof Error ? err.message : 'Failed to save sales record';
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
        { success: false, error: 'Akses ditolak: Hanya Level 1 yang dapat menghapus penjualan' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID parameter is required' }, { status: 400 });
    }

    await salesStore.delete(id);

    await serverRecordStore.appendActivityLog({
      action: 'SALE_DELETED',
      entityId: id,
      entitySummary: `Penjualan ${id} berhasil dihapus`,
      operatorName: user.name,
      operatorRole: user.title || `Level ${user.roleLevel}`,
    });

    return NextResponse.json({
      success: true,
      id,
      message: 'Record successfully deleted',
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error('[API /api/sales DELETE Error]:', err);
    const message = err instanceof Error ? err.message : 'Failed to delete sales record';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

