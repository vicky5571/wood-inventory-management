/**
 * app/api/brokers/[id]/route.ts
 *
 * REST API Endpoint for individual Broker entity operations.
 */

import { NextResponse } from 'next/server.js';
import { serverRecordStore } from '../../../../src/persistence/server-record-store.ts';
import { getAuthenticatedUser } from '../../../../src/auth/session.ts';
import type { Broker } from '../../../../src/types/index.ts';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const brokers = await serverRecordStore.getBrokers();
    const broker = brokers.find((b) => b.id === id);

    if (!broker) {
      return NextResponse.json({ success: false, error: 'Broker not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: broker });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve broker';
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
    if (user.roleLevel !== 1) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = (await request.json()) as Partial<Broker> & { name?: string };

    if (!body || !body.name || !body.name.trim()) {
      return NextResponse.json({ success: false, error: 'Nama broker wajib diisi' }, { status: 400 });
    }

    const saved = await serverRecordStore.saveBroker({
      ...body,
      id,
      name: body.name.trim(),
    });

    await serverRecordStore.appendActivityLog({
      action: 'BROKER_UPDATED',
      entityId: saved.id,
      entitySummary: `${saved.name} (${saved.code}) • Status: ${saved.status}`,
      operatorName: user.name,
      operatorRole: user.title || `Level ${user.roleLevel}`,
    });

    return NextResponse.json({ success: true, data: saved });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update broker';
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
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    await serverRecordStore.deleteBroker(id);

    await serverRecordStore.appendActivityLog({
      action: 'BROKER_DELETED',
      entityId: id,
      entitySummary: `Broker ${id} berhasil dinonaktifkan`,
      operatorName: user.name,
      operatorRole: user.title || `Level ${user.roleLevel}`,
    });

    return NextResponse.json({ success: true, id, message: 'Broker deleted' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete broker';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
