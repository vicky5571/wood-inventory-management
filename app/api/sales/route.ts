/**
 * app/api/sales/route.ts
 *
 * REST API Endpoint for Outbound Wood Sales Records.
 * Handles authenticated retrieval, creation, modification, and deletion.
 */

import { NextResponse } from 'next/server.js';
import { salesStore } from '../../../src/persistence/sales-store.ts';
import { verifySessionToken, COOKIE_NAME } from '../../../src/auth/session.ts';
import type { AuthUser, SalesFormInput } from '../../../src/types/index.ts';

export const dynamic = 'force-dynamic';

async function getAuthenticatedUser(request: Request): Promise<AuthUser | null> {
  let token: string | undefined;

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
    const data = salesStore.getAll();
    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve sales records';
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

    if (user.roleLevel > 2) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak: Hanya Level 1 dan 2 yang dapat mencatat penjualan' },
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

    const payload = body as SalesFormInput;
    if (!payload.customerName?.trim()) {
      return NextResponse.json({ success: false, error: 'Validation error: Nama pembeli wajib diisi' }, { status: 400 });
    }
    if (!payload.storageYard?.trim() || !payload.kavlingNumber?.trim()) {
      return NextResponse.json({ success: false, error: 'Validation error: Lokasi TPK dan Kavling wajib dipilih' }, { status: 400 });
    }
    if (!payload.pieces || payload.pieces <= 0) {
      return NextResponse.json({ success: false, error: 'Validation error: Jumlah batang harus lebih dari 0' }, { status: 400 });
    }
    if (!payload.volumeM3 || payload.volumeM3 <= 0) {
      return NextResponse.json({ success: false, error: 'Validation error: Volume (m³) harus lebih dari 0' }, { status: 400 });
    }

    const saved = salesStore.save(payload);
    return NextResponse.json({
      success: true,
      data: saved,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save sales record';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Sesi tidak ditemukan atau kadaluarsa' },
        { status: 401 }
      );
    }

    if (user.roleLevel > 2) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak: Hanya Level 1 dan 2 yang dapat menghapus penjualan' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID parameter is required' }, { status: 400 });
    }

    salesStore.delete(id);
    return NextResponse.json({
      success: true,
      id,
      message: 'Record successfully deleted',
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete sales record';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
