/**
 * app/api/payment-forms/route.ts
 *
 * REST API Endpoint for Weekly Payment Forms collection.
 * Supports filtered listing and manual creation.
 */

import { NextResponse } from 'next/server.js';
import { paymentFormStore } from '../../../src/persistence/payment-form-store.ts';
import { serverRecordStore } from '../../../src/persistence/server-record-store.ts';
import { getAuthenticatedUser } from '../../../src/auth/session.ts';
import type { PaymentFormFilterCriteria, PaymentForm, PaymentFormStatus } from '../../../src/types/index.ts';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rawStatus = searchParams.get('status');
    const filter: PaymentFormFilterCriteria = {
      weekStartDate: searchParams.get('weekStartDate') || undefined,
      status: (rawStatus as PaymentFormStatus) || undefined,
      supplierName: searchParams.get('supplierName') || undefined,
      searchQuery: searchParams.get('searchQuery') || undefined,
    };

    const forms = await paymentFormStore.getAll('default-tenant', filter);
    return NextResponse.json({ success: true, data: forms });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (user.roleLevel > 2) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    if (!body.weekStartDate || !body.supplierName || !body.woodSpecies) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: weekStartDate, supplierName, woodSpecies' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const newForm: PaymentForm = {
      id: body.id || `pay-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      tenantId: 'default-tenant',
      preprintedNumber: body.preprintedNumber || body.formNumber || '',
      issueDate: body.issueDate || '',
      weekStartDate: body.weekStartDate,
      weekEndDate: body.weekEndDate || body.weekStartDate,
      supplierName: body.supplierName,
      supplierId: body.supplierId || undefined,
      woodSpecies: body.woodSpecies,
      contractNumber: body.contractNumber || '',
      lines: body.lines || [],
      recordIds: body.recordIds || [],
      itemIds: body.itemIds || [],
      totalAmountIDR: body.totalAmountIDR || body.totalTimberNetIDR || 0,
      terbilang: body.terbilang || '',
      totalTallyVolumeM3: body.totalTallyVolumeM3 || 0,
      totalTallyPieces: body.totalTallyPieces || 0,
      totalTimberGrossIDR: body.totalTimberGrossIDR || 0,
      totalTimberPphIDR: body.totalTimberPphIDR || 0,
      totalTimberNetIDR: body.totalTimberNetIDR || 0,
      status: 'DRAFT',
      notes: body.notes || undefined,
      createdAt: now,
      updatedAt: now,
    };

    const saved = await paymentFormStore.create(newForm);

    await serverRecordStore.appendActivityLog({
      action: 'PAYMENT_FORM_CREATED',
      entityId: saved.id,
      entitySummary: `Form Pembayaran dibuat: ${saved.preprintedNumber || saved.id} • ${saved.supplierName} (${saved.woodSpecies})`,
      operatorName: user.name,
      operatorRole: user.title || `Level ${user.roleLevel}`,
      metadata: { formId: saved.id, preprintedNumber: saved.preprintedNumber },
    });

    return NextResponse.json({ success: true, data: saved }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
