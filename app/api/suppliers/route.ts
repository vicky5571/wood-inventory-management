/**
 * app/api/suppliers/route.ts
 *
 * REST API Endpoint for Timber Suppliers Master Data.
 * Handles authenticated retrieval, creation, updating, and deletion.
 */

import { NextResponse } from 'next/server.js';
import { serverRecordStore } from '../../../src/persistence/server-record-store.ts';
import { getAuthenticatedUser } from '../../../src/auth/session.ts';
import type { Supplier } from '../../../src/types/index.ts';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await serverRecordStore.getSuppliers();
    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error('[API /api/suppliers GET Error]:', err);
    const message = err instanceof Error ? err.message : 'Failed to retrieve suppliers';
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
        { success: false, error: 'Akses ditolak: Hanya Level 1 yang dapat menambah atau mengubah supplier' },
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

    const payload = body as Partial<Supplier> & { name?: string };
    if (!payload.name || typeof payload.name !== 'string' || !payload.name.trim()) {
      return NextResponse.json({ success: false, error: 'Validation error: Nama supplier wajib diisi' }, { status: 400 });
    }

    const isUpdate = Boolean(payload.id);
    const saved = await serverRecordStore.saveSupplier({
      ...payload,
      name: payload.name.trim(),
    });

    await serverRecordStore.appendActivityLog({
      action: isUpdate ? 'SUPPLIER_UPDATED' : 'SUPPLIER_CREATED',
      entityId: saved.id,
      entitySummary: `${saved.name} (${saved.code}) • Status: ${saved.status}`,
      operatorName: user.name,
      operatorRole: user.title || `Level ${user.roleLevel}`,
    });

    return NextResponse.json({
      success: true,
      data: saved,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error('[API /api/suppliers POST Error]:', err);
    const message = err instanceof Error ? err.message : 'Failed to save supplier';
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
        { success: false, error: 'Akses ditolak: Hanya Level 1 yang dapat menghapus supplier' },
        { status: 403 }
      );
    }

    const url = new URL(request.url, 'http://localhost');
    const id = url.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Supplier ID is required' }, { status: 400 });
    }

    await serverRecordStore.deleteSupplier(id);

    await serverRecordStore.appendActivityLog({
      action: 'SUPPLIER_DELETED',
      entityId: id,
      entitySummary: `Supplier ${id} berhasil dihapus`,
      operatorName: user.name,
      operatorRole: user.title || `Level ${user.roleLevel}`,
    });

    return NextResponse.json({
      success: true,
      id,
      message: 'Supplier successfully deleted',
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error('[API /api/suppliers DELETE Error]:', err);
    const message = err instanceof Error ? err.message : 'Failed to delete supplier';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
