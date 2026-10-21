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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
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
    const { id } = await params;
    const body = await request.json();

    const existing = await paymentFormStore.getById(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Form pembayaran tidak ditemukan' }, { status: 404 });
    }
    if (existing.status !== 'DRAFT') {
      return NextResponse.json({ success: false, error: 'Hanya form DRAFT yang dapat diedit' }, { status: 400 });
    }

    const updated = await paymentFormStore.update(id, body);
    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
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
      entitySummary: `Form Pembayaran dibatalkan (VOID): ${existing.preprintedNumber || existing.id}`,
      operatorName: user.name,
      operatorRole: user.title || `Level ${user.roleLevel}`,
      metadata: { formId: id, preprintedNumber: existing.preprintedNumber },
    });

    return NextResponse.json({ success: true, data: voided });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
