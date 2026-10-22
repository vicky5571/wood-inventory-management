import { NextResponse } from 'next/server.js';
import { serverRecordStore } from '../../../../src/persistence/server-record-store.ts';
import { getAuthenticatedUser } from '../../../../src/auth/session.ts';
import type { ManifestFormInput } from '../../../../src/types/index.ts';
import { validateDiscrepancyInputs } from '../../../../src/utils/discrepancy-validation.ts';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Sesi tidak ditemukan atau kadaluarsa' },
        { status: 401 }
      );
    }

    if (user.roleLevel !== 1 && !user.permissions?.tallyCreate) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak: Anda tidak memiliki izin untuk tally lapangan' },
        { status: 403 }
      );
    }

    let raw: Record<string, unknown>;
    try {
      raw = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    if (!raw || typeof raw !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid payload' },
        { status: 400 }
      );
    }

    const manifestInput: ManifestFormInput | null = (raw.manifest && Array.isArray((raw.manifest as { items?: unknown }).items))
      ? (raw.manifest as ManifestFormInput)
      : (Array.isArray(raw.items)
        ? (raw as unknown as ManifestFormInput)
        : null);

    if (!manifestInput || !manifestInput.items || manifestInput.items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Validation error: manifest must contain at least one item' },
        { status: 400 }
      );
    }

    for (const it of manifestInput.items) {
      const v = validateDiscrepancyInputs({
        tallyVolumeM3: it.tallyVolumeM3,
        deliveredVolumeM3: it.deliveredVolumeM3,
        tallyPieces: it.tallyPieces,
        deliveredPieces: it.deliveredPieces,
      });
      if (!v.ok) {
        return NextResponse.json(
          { success: false, error: 'Validation error: Nilai pengukuran tidak boleh negatif', errors: v.errors },
          { status: 400 }
        );
      }
    }

    const saved = await serverRecordStore.saveManifest(manifestInput);
    await serverRecordStore.appendActivityLog({
      action: 'RECORD_CREATED',
      entityId: manifestInput.id,
      entitySummary: `Tally Lapangan: ${manifestInput.receiptNumber || manifestInput.id} • Plat ${manifestInput.truckPlateNumber}`,
      operatorName: user.name,
      operatorRole: user.title || `Level ${user.roleLevel}`,
    });

    return NextResponse.json({ success: true, data: saved }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

