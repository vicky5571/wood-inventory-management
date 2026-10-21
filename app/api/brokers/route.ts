/**
 * app/api/brokers/route.ts
 *
 * REST API Endpoint for Broker / Perantara Master Data.
 * Handles authenticated retrieval, creation, updating, and deletion with RBAC enforcement.
 */

import { NextResponse } from 'next/server.js';
import { serverRecordStore } from '../../../src/persistence/server-record-store.ts';
import { getAuthenticatedUser } from '../../../src/auth/session.ts';
import type { Broker } from '../../../src/types/index.ts';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url, 'http://localhost');
    const query = url.searchParams.get('searchQuery')?.toLowerCase().trim() || '';
    const status = url.searchParams.get('status') || 'ALL';

    let data = await serverRecordStore.getBrokers();

    if (status !== 'ALL') {
      data = data.filter((b) => b.status === status);
    }

    if (query) {
      data = data.filter((b) => {
        const matchName = b.name.toLowerCase().includes(query);
        const matchCode = b.code.toLowerCase().includes(query);
        const matchPhone = Boolean(b.phone && b.phone.toLowerCase().includes(query));
        const matchContact = Boolean(b.contactPerson && b.contactPerson.toLowerCase().includes(query));
        return matchName || matchCode || matchPhone || matchContact;
      });
    }

    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error('[API /api/brokers GET Error]:', err);
    const message = err instanceof Error ? err.message : 'Failed to retrieve brokers';
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
        { success: false, error: 'Akses ditolak: Hanya Level 1 yang dapat menambah atau mengubah broker' },
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

    const payload = body as Partial<Broker> & { name?: string };
    if (!payload.name || typeof payload.name !== 'string' || !payload.name.trim()) {
      return NextResponse.json({ success: false, error: 'Validation error: Nama broker wajib diisi' }, { status: 400 });
    }

    if (payload.defaultCommissionPerM3 !== undefined && payload.defaultCommissionPerM3 < 0) {
      return NextResponse.json({ success: false, error: 'Validation error: Komisi default tidak boleh negatif' }, { status: 400 });
    }

    const isUpdate = Boolean(payload.id);
    const saved = await serverRecordStore.saveBroker({
      ...payload,
      name: payload.name.trim(),
    });

    await serverRecordStore.appendActivityLog({
      action: isUpdate ? 'BROKER_UPDATED' : 'BROKER_CREATED',
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
    console.error('[API /api/brokers POST Error]:', err);
    const message = err instanceof Error ? err.message : 'Failed to save broker';
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
        { success: false, error: 'Akses ditolak: Hanya Level 1 yang dapat menghapus broker' },
        { status: 403 }
      );
    }

    const url = new URL(request.url, 'http://localhost');
    const id = url.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Broker ID is required' }, { status: 400 });
    }

    await serverRecordStore.deleteBroker(id);

    await serverRecordStore.appendActivityLog({
      action: 'BROKER_DELETED',
      entityId: id,
      entitySummary: `Broker ${id} berhasil dinonaktifkan`,
      operatorName: user.name,
      operatorRole: user.title || `Level ${user.roleLevel}`,
    });

    return NextResponse.json({
      success: true,
      id,
      message: 'Broker successfully deleted',
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error('[API /api/brokers DELETE Error]:', err);
    const message = err instanceof Error ? err.message : 'Failed to delete broker';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
