/**
 * app/api/payment-forms/generate/route.ts
 *
 * Dedicated generation endpoint for Weekly Payment Forms.
 * Consolidates receiving records for a Saturday-Friday week window.
 */

import { NextResponse } from 'next/server.js';
import { paymentFormStore } from '../../../../src/persistence/payment-form-store.ts';
import { serverRecordStore } from '../../../../src/persistence/server-record-store.ts';
import { getAuthenticatedUser } from '../../../../src/auth/session.ts';
import { getWeekWindow } from '../../../../src/utils/week-window.ts';

export const dynamic = 'force-dynamic';

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
    if (!body.weekStartDate || typeof body.weekStartDate !== 'string') {
      return NextResponse.json({ success: false, error: 'Missing or invalid weekStartDate' }, { status: 400 });
    }

    const { startDate, endDate } = getWeekWindow(body.weekStartDate);
    const result = await paymentFormStore.generateForms(startDate);

    await serverRecordStore.appendActivityLog({
      action: 'PAYMENT_FORM_CREATED',
      entitySummary: `Generate Form Pembayaran Minggu ${startDate} s/d ${endDate}: ${result.createdCount} dibuat, ${result.updatedCount} diperbarui, ${result.skippedCount} dilewati`,
      operatorName: user.name,
      operatorRole: user.title || `Level ${user.roleLevel}`,
      metadata: {
        weekStartDate: startDate,
        weekEndDate: endDate,
        createdCount: result.createdCount,
        updatedCount: result.updatedCount,
        skippedCount: result.skippedCount,
      },
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
