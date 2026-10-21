/**
 * app/api/contracts/[id]/route.ts
 *
 * REST API Endpoint for a single Perhutani Contract.
 */

import { NextResponse } from 'next/server.js';
import { contractStore } from '../../../../src/persistence/contract-store.ts';
import { serverRecordStore } from '../../../../src/persistence/server-record-store.ts';
import { getAuthenticatedUser } from '../../../../src/auth/session.ts';
import type { ContractFormInput } from '../../../../src/types/index.ts';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const contract = await contractStore.getById(id);
    if (!contract) {
      return NextResponse.json({ success: false, error: 'Contract not found' }, { status: 404 });
    }

    const [items, receipts] = await Promise.all([
      contractStore.getItems(id),
      contractStore.getReceipts(id),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        ...contract,
        items,
        receipts,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error('[API /api/contracts/[id] GET Error]:', err);
    const message = err instanceof Error ? err.message : 'Failed to retrieve contract';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || user.roleLevel !== 1) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Akses Level 1 diperlukan' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const existing = await contractStore.getById(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Contract not found' }, { status: 404 });
    }

    const body = (await request.json()) as ContractFormInput;
    const payload: ContractFormInput = { ...body, id };

    const updated = await contractStore.saveContract(payload);

    await serverRecordStore.appendActivityLog({
      action: 'CONTRACT_UPDATED',
      entityId: id,
      entitySummary: `Kontrak ${updated.contractNumber} diperbarui`,
      operatorName: user.name,
      operatorRole: user.title || `Level ${user.roleLevel}`,
    });

    return NextResponse.json({
      success: true,
      data: updated,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error('[API /api/contracts/[id] PUT Error]:', err);
    const message = err instanceof Error ? err.message : 'Failed to update contract';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || user.roleLevel !== 1) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Akses Level 1 diperlukan' },
        { status: 403 }
      );
    }

    const { id } = await params;
    await contractStore.deleteContract(id);

    await serverRecordStore.appendActivityLog({
      action: 'CONTRACT_DELETED',
      entityId: id,
      entitySummary: `Kontrak ${id} dihapus`,
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
    console.error('[API /api/contracts/[id] DELETE Error]:', err);
    const message = err instanceof Error ? err.message : 'Failed to delete contract';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
