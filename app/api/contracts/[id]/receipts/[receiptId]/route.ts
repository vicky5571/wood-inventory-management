/**
 * app/api/contracts/[id]/receipts/[receiptId]/route.ts
 *
 * REST API Endpoint to delete a specific contract receipt.
 */

import { NextResponse } from 'next/server.js';
import { contractStore } from '../../../../../../src/persistence/contract-store.ts';
import { serverRecordStore } from '../../../../../../src/persistence/server-record-store.ts';
import { getAuthenticatedUser } from '../../../../../../src/auth/session.ts';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; receiptId: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || user.roleLevel !== 1) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Akses Level 1 diperlukan' },
        { status: 403 }
      );
    }

    const { id, receiptId } = await params;
    await contractStore.deleteReceipt(receiptId);

    await serverRecordStore.appendActivityLog({
      action: 'RECEIPT_DELETED',
      entityId: receiptId,
      entitySummary: `Kwitansi ${receiptId} pada kontrak ${id} dihapus`,
      operatorName: user.name,
      operatorRole: user.title || `Level ${user.roleLevel}`,
    });

    return NextResponse.json({
      success: true,
      receiptId,
      message: 'Receipt successfully deleted',
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error('[API /api/contracts/[id]/receipts/[receiptId] DELETE Error]:', err);
    const message = err instanceof Error ? err.message : 'Failed to delete receipt';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
