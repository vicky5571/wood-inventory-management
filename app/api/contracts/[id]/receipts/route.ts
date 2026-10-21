/**
 * app/api/contracts/[id]/receipts/route.ts
 *
 * REST API Endpoint for Contract Receipts (Kwitansi).
 */

import { NextResponse } from 'next/server.js';
import { contractStore } from '../../../../../src/persistence/contract-store.ts';
import { serverRecordStore } from '../../../../../src/persistence/server-record-store.ts';
import { getAuthenticatedUser } from '../../../../../src/auth/session.ts';
import type { ContractReceiptFormInput } from '../../../../../src/types/index.ts';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const receipts = await contractStore.getReceipts(id);
    return NextResponse.json({
      success: true,
      data: receipts,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error('[API /api/contracts/[id]/receipts GET Error]:', err);
    const message = err instanceof Error ? err.message : 'Failed to retrieve receipts';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(
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
    const contract = await contractStore.getById(id);
    if (!contract) {
      return NextResponse.json({ success: false, error: 'Contract not found' }, { status: 404 });
    }

    const body = (await request.json()) as ContractReceiptFormInput;
    if (!body.receiptNumber?.trim()) {
      return NextResponse.json({ success: false, error: 'Nomor kwitansi wajib diisi' }, { status: 400 });
    }
    if (!body.amountIDR || body.amountIDR <= 0) {
      return NextResponse.json({ success: false, error: 'Nominal kwitansi harus lebih dari 0' }, { status: 400 });
    }

    const payload: ContractReceiptFormInput = {
      ...body,
      contractId: id,
    };

    const saved = await contractStore.saveReceipt(payload);

    await serverRecordStore.appendActivityLog({
      action: 'RECEIPT_CREATED',
      entityId: saved.id,
      entitySummary: `Kwitansi ${saved.receiptNumber} (${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(saved.amountIDR)}) untuk kontrak ${contract.contractNumber}`,
      operatorName: user.name,
      operatorRole: user.title || `Level ${user.roleLevel}`,
    });

    return NextResponse.json({
      success: true,
      data: saved,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error('[API /api/contracts/[id]/receipts POST Error]:', err);
    const message = err instanceof Error ? err.message : 'Failed to save receipt';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
