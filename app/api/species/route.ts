/**
 * app/api/species/route.ts
 *
 * REST API Endpoint for Wood Species Master Data.
 * Handles authenticated retrieval and upsert operations.
 */

import { NextResponse } from 'next/server.js';
import { serverRecordStore } from '../../../src/persistence/server-record-store.ts';
import { getAuthenticatedUser } from '../../../src/auth/session.ts';
import type { WoodSpecies } from '../../../src/types/index.ts';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await serverRecordStore.getSpecies();
    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error('[API /api/species GET Error]:', err);
    const message = err instanceof Error ? err.message : 'Failed to retrieve species';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
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
        { success: false, error: 'Akses ditolak: Hanya Level 1 yang dapat menambah atau mengubah jenis kayu' },
        { status: 403 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON payload' }, { status: 400 });
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
    }

    const payload = body as Partial<WoodSpecies> & { code?: string; commonName?: string };
    if (!payload.code?.trim() || !payload.commonName?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Validation error: Kode dan Nama jenis kayu wajib diisi' },
        { status: 400 }
      );
    }

    const isUpdate = Boolean(payload.id);
    const saved = await serverRecordStore.saveSpecies({
      ...payload,
      code: payload.code.trim().toUpperCase(),
      commonName: payload.commonName.trim(),
    });

    await serverRecordStore.appendActivityLog({
      action: isUpdate ? 'SPECIES_UPDATED' : 'SPECIES_CREATED',
      entityId: saved.id,
      entitySummary: `${saved.commonName} (${saved.code}) • Densitas: ${saved.densityKgM3} kg/m³`,
      operatorName: user.name,
      operatorRole: user.title || `Level ${user.roleLevel}`,
    });

    return NextResponse.json({
      success: true,
      data: saved,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error('[API /api/species POST Error]:', err);
    const message = err instanceof Error ? err.message : 'Failed to save species';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
