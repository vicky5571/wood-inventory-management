/**
 * app/api/records/[id]/price/route.ts
 *
 * Dedicated PATCH endpoint for updating timber receiving record price.
 * Recomputes all dependent financial fields and logs RECORD_PRICED activity.
 */

import { NextResponse } from 'next/server.js';
import { serverRecordStore } from '../../../../../src/persistence/server-record-store.ts';
import { getAuthenticatedUser } from '../../../../../src/auth/session.ts';
import { computeRecordCalculations } from '../../../../../src/utils/timber-calc.ts';
import type { WoodReceivingRecord } from '../../../../../src/types/index.ts';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
        { success: false, error: 'Akses ditolak: Hanya Level 1 yang dapat mengubah harga kayu' },
        { status: 403 }
      );
    }

    const { id } = await params;
    if (!id || id.trim() === '') {
      return NextResponse.json({ success: false, error: 'Missing record ID' }, { status: 400 });
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON payload' }, { status: 400 });
    }

    if (!body || typeof body !== 'object' || !('timberPricePerM3' in body)) {
      return NextResponse.json(
        { success: false, error: 'Validation error: timberPricePerM3 is required (number or null)' },
        { status: 400 }
      );
    }

    const rawPrice = body.timberPricePerM3;
    let newPrice: number | null = null;

    if (rawPrice !== null && rawPrice !== undefined && rawPrice !== '') {
      const num = Number(rawPrice);
      if (typeof num !== 'number' || !Number.isFinite(num) || num < 0) {
        return NextResponse.json(
          { success: false, error: 'Validation error: timberPricePerM3 must be a non-negative number or null' },
          { status: 400 }
        );
      }
      newPrice = num;
    }

    const record = await serverRecordStore.getById(id);
    if (!record) {
      return NextResponse.json({ success: false, error: 'Record not found' }, { status: 404 });
    }

    const calcs = computeRecordCalculations({
      tallyVolumeM3: record.tallyVolumeM3,
      deliveredVolumeM3: record.deliveredVolumeM3,
      tallyPieces: record.tallyPieces,
      deliveredPieces: record.deliveredPieces,
      timberPricePerM3: newPrice,
      timberPphRate: record.timberPphRate,
      freightRatePerM3: record.freightRatePerM3,
      freightPphAmount: record.freightPphAmount,
      brokerFee: record.brokerFee,
    });

    const updatedRecord: WoodReceivingRecord = {
      ...record,
      timberPricePerM3: newPrice,
      timberGrossTotal: calcs.timberGrossTotal,
      timberPphAmount: calcs.timberPphAmount,
      timberNetPayable: calcs.timberNetPayable,
      freightGrossTotal: calcs.freightGrossTotal,
      freightNetPayable: calcs.freightNetPayable,
      grandNetPayable: calcs.grandNetPayable,
      updatedAt: new Date().toISOString(),
    };

    const saved = await serverRecordStore.save(updatedRecord);

    const priceText = newPrice == null ? 'Pending' : `Rp ${newPrice.toLocaleString('id-ID')}/m³`;
    await serverRecordStore.appendActivityLog({
      action: 'RECORD_PRICED',
      entityId: id,
      entitySummary: `Harga diperbarui: ${priceText} • Truk ${record.truckPlateNumber}`,
      operatorName: user.name,
      operatorRole: user.title || `Level ${user.roleLevel}`,
      metadata: {
        recordId: id,
        previousPrice: record.timberPricePerM3,
        newPrice,
      },
    });

    return NextResponse.json({
      success: true,
      data: saved,
    });
  } catch (err: unknown) {
    console.error('[API /api/records/[id]/price PATCH Error]:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
