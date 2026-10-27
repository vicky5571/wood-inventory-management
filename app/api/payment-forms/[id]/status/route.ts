/**
 * app/api/payment-forms/[id]/status/route.ts
 *
 * Dedicated status transition endpoint for Weekly Payment Forms.
 * Handles DRAFT -> ISSUED, ISSUED -> PAID, and VOID with record status cascades.
 */

import { NextResponse } from 'next/server.js';
import { paymentFormStore } from '../../../../../src/persistence/payment-form-store.ts';
import { serverRecordStore } from '../../../../../src/persistence/server-record-store.ts';
import { getAuthenticatedUser } from '../../../../../src/auth/session.ts';
import type { PaymentFormStatus, ActivityActionType } from '../../../../../src/types/index.ts';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const targetStatus = body.status as PaymentFormStatus;

    if (!['DRAFT', 'ISSUED', 'PAID', 'VOID'].includes(targetStatus)) {
      return NextResponse.json({ success: false, error: 'Invalid target status' }, { status: 400 });
    }

    // Level 1 required for PAID and VOID; Level 1 or 2 can ISSUE
    if (['PAID', 'VOID'].includes(targetStatus) && user.roleLevel > 1) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Hanya Level 1 yang dapat mengubah status menjadi PAID atau VOID' },
        { status: 403 }
      );
    }

    const updated = await paymentFormStore.updateStatus(id, targetStatus, {
      invoiceNumber: body.invoiceNumber,
      paymentDate: body.paymentDate,
      paymentMethod: body.paymentMethod,
      notes: body.notes,
      issueDate: body.issueDate,
    });

    let action: ActivityActionType = 'PAYMENT_FORM_UPDATED';
    if (targetStatus === 'ISSUED') action = 'PAYMENT_FORM_ISSUED';
    else if (targetStatus === 'PAID') action = 'PAYMENT_FORM_PAID';
    else if (targetStatus === 'VOID') action = 'PAYMENT_FORM_VOIDED';

    await serverRecordStore.appendActivityLog({
      action,
      entityId: id,
      entitySummary: `Status Form Pembayaran ${updated.preprintedNumber || updated.id} diubah ke ${targetStatus}`,
      operatorName: user.name,
      operatorRole: user.title || `Level ${user.roleLevel}`,
      metadata: { formId: id, preprintedNumber: updated.preprintedNumber, issueDate: updated.issueDate, targetStatus },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
