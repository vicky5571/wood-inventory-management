/**
 * app/api/storage-locations/route.ts
 *
 * REST API Endpoint for Storage Locations Master Data (Log Yards & Kavling Lots).
 * Exposes relational queries and authenticated upsert operations.
 */

import { NextResponse } from 'next/server.js';
import { serverRecordStore } from '../../../src/persistence/server-record-store.ts';
import { verifySessionToken, COOKIE_NAME } from '../../../src/auth/session.ts';
import type { AuthUser, StorageLotStatus } from '../../../src/types/index.ts';

export const dynamic = 'force-dynamic';

async function getAuthenticatedUser(request: Request): Promise<AuthUser | null> {
  let token: string | undefined;

  // Extract from Request headers first (compatible with unit tests and edge/node runtime)
  const rawHeader = request.headers.get('cookie') || '';
  const match = rawHeader.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]+)`));
  if (match) {
    token = match[1];
  } else {
    try {
      const { cookies } = await import('next/headers');
      const cookieStore = await cookies();
      token = cookieStore.get(COOKIE_NAME)?.value;
    } catch {
      token = undefined;
    }
  }

  return verifySessionToken(token);
}

export async function GET() {
  try {
    const data = await serverRecordStore.getStorageLocations();
    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve storage locations';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
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
        { success: false, error: 'Akses ditolak: Hanya Level 1 yang dapat membuat atau mengubah data' },
        { status: 403 }
      );
    }

    let payload: any;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON request body' },
        { status: 400 }
      );
    }

    if (!payload || typeof payload !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Request body must be a valid JSON object' },
        { status: 400 }
      );
    }

    if (payload.type === 'yard') {
      if (!payload.name || typeof payload.name !== 'string' || !payload.name.trim()) {
        return NextResponse.json(
          { success: false, error: 'Yard name is required and cannot be empty' },
          { status: 400 }
        );
      }
      const savedYard = await serverRecordStore.saveStorageYard({
        id: payload.id,
        name: payload.name.trim(),
        yardCode: payload.yardCode ? String(payload.yardCode).trim() : undefined,
        description: payload.description !== undefined ? String(payload.description).trim() : undefined,
      });
      return NextResponse.json({
        success: true,
        data: savedYard,
      });
    }

    if (payload.type === 'lot') {
      if (!payload.yardId || typeof payload.yardId !== 'string' || !payload.yardId.trim()) {
        return NextResponse.json(
          { success: false, error: 'Yard identifier (yardId) is required' },
          { status: 400 }
        );
      }
      if (!payload.lotCode || typeof payload.lotCode !== 'string' || !payload.lotCode.trim()) {
        return NextResponse.json(
          { success: false, error: 'Lot code (lotCode) is required' },
          { status: 400 }
        );
      }
      if (
        payload.status !== undefined &&
        payload.status !== 'ACTIVE' &&
        payload.status !== 'FULL' &&
        payload.status !== 'MAINTENANCE'
      ) {
        return NextResponse.json(
          { success: false, error: 'Invalid lot status: expected "ACTIVE", "FULL", or "MAINTENANCE"' },
          { status: 400 }
        );
      }
      const savedLot = await serverRecordStore.saveStorageLot({
        id: payload.id,
        yardId: payload.yardId.trim(),
        lotCode: payload.lotCode.trim(),
        status: payload.status as StorageLotStatus,
      });
      return NextResponse.json({
        success: true,
        data: savedLot,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid payload type: expected "yard" or "lot"' },
      { status: 400 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to process storage location update';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

