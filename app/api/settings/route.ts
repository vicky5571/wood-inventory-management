/**
 * app/api/settings/route.ts
 *
 * REST API Endpoint for Application Settings.
 * Handles authenticated retrieval and updating of tax rates and operational thresholds.
 */

import { NextResponse } from 'next/server.js';
import { serverRecordStore } from '../../../src/persistence/server-record-store.ts';
import { getAuthenticatedUser } from '../../../src/auth/session.ts';
import type { AppSettings } from '../../../src/types/index.ts';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await serverRecordStore.getSettings();
    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error('[API /api/settings GET Error]:', err);
    const message = err instanceof Error ? err.message : 'Failed to retrieve settings';
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
        { success: false, error: 'Akses ditolak: Hanya Level 1 yang dapat mengubah pengaturan sistem' },
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

    const payload = body as Partial<AppSettings>;
    const saved = await serverRecordStore.saveSettings(payload);

    await serverRecordStore.appendActivityLog({
      action: 'SETTINGS_UPDATED',
      entitySummary: `PPh Kayu: ${saved.defaultTimberPphRate}%, Ongkos Angkut: ${saved.defaultFreightPphRate}%, TPK: ${saved.yardName}`,
      operatorName: user.name,
      operatorRole: user.title || `Level ${user.roleLevel}`,
      metadata: payload as Record<string, unknown>,
    });

    return NextResponse.json({
      success: true,
      data: saved,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error('[API /api/settings POST Error]:', err);
    const message = err instanceof Error ? err.message : 'Failed to save settings';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
