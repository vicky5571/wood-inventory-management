/**
 * app/api/activity/route.ts
 *
 * REST API Endpoint for Immutable Operational Activity Logs.
 * Append-only audit trail; strictly NO DELETE method is exposed.
 */

import { NextResponse } from 'next/server.js';
import { serverRecordStore } from '../../../src/persistence/server-record-store.ts';
import { getAuthenticatedUser } from '../../../src/auth/session.ts';
import type { ActivityLogEntry } from '../../../src/types/index.ts';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url, 'http://localhost');
    const action = url.searchParams.get('action') || undefined;
    const limit = parseInt(url.searchParams.get('limit') || '100', 10) || 100;

    const data = await serverRecordStore.getActivityLogs(action, limit);
    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error('[API /api/activity GET Error]:', err);
    const message = err instanceof Error ? err.message : 'Failed to retrieve activity logs';
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
        { success: false, error: 'Akses ditolak: Hanya Level 1 yang dapat mencatat log aktivitas manual' },
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

    const payload = body as Partial<ActivityLogEntry>;
    if (!payload.action || !payload.entitySummary) {
      return NextResponse.json(
        { success: false, error: 'Validation error: action and entitySummary are required' },
        { status: 400 }
      );
    }

    const entry = await serverRecordStore.appendActivityLog({
      action: payload.action,
      entityId: payload.entityId,
      entitySummary: payload.entitySummary,
      operatorName: user.name,
      operatorRole: user.title || `Level ${user.roleLevel}`,
      metadata: payload.metadata,
    });

    return NextResponse.json({
      success: true,
      data: entry,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error('[API /api/activity POST Error]:', err);
    const message = err instanceof Error ? err.message : 'Failed to append activity log';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
