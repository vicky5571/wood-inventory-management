/**
 * app/api/payment-forms/[id]/route.ts
 *
 * REST API Endpoints for single PaymentForm entity.
 * Supports retrieval with lines, draft updates, and cancellation.
 */

import { NextResponse } from 'next/server.js';
import { paymentFormStore } from '../../../../src/persistence/payment-form-store.ts';
import { serverRecordStore } from '../../../../src/persistence/server-record-store.ts';
import { getAuthenticatedUser } from '../../../../src/auth/session.ts';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const formWithLines = await paymentFormStore.getById(id);
    if (!formWithLines) {
      return NextResponse.json({ success: false, error: 'Form pembayaran tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: formWithLines });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
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
    if (user.roleLevel > 1) {
      return NextResponse.json({ success: false, error: 'Forbidden: Hanya Level 1 yang dapat membatalkan form' }, { status: 403 });
    }

    const { id } = await params;
    const existing = await paymentFormStore.getById(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Form pembayaran tidak ditemukan' }, { status: 404 });
    }

    const voided = await paymentFormStore.voidForm(id, 'Dibatalkan melalui API');

    await serverRecordStore.appendActivityLog({
      action: 'PAYMENT_FORM_VOIDED',
      entityId: id,
      entitySummary: `Form Pembayaran dibatalkan (VOID): ${existing.formNumber}`,
      operatorName: user.name,
      operatorRole: user.title || `Level ${user.roleLevel}`,
      metadata: { formId: id, formNumber: existing.formNumber },
    });

    return NextResponse.json({ success: true, data: voided });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
