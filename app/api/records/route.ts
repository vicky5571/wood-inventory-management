import { NextResponse } from 'next/server.js';
import { serverRecordStore } from '../../../src/persistence/server-record-store.ts';
import { verifySessionToken, COOKIE_NAME } from '../../../src/auth/session.ts';
import type { AuthUser, WoodReceivingRecord, ManifestFormInput } from '../../../src/types/index.ts';

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
    const records = await serverRecordStore.getAll();
    return NextResponse.json({
      success: true,
      data: records,
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve records' },
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

    if (user.roleLevel > 2) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak: Hanya Level 1 dan 2 yang dapat membuat atau mengubah data' },
        { status: 403 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid payload' },
        { status: 400 }
      );
    }

    const raw = body as Record<string, any>;
    const manifestInput: ManifestFormInput | null = (raw.manifest && Array.isArray(raw.manifest.items))
      ? (raw.manifest as ManifestFormInput)
      : (Array.isArray(raw.items)
        ? (raw as unknown as ManifestFormInput)
        : null);

    if (manifestInput) {
      if (!manifestInput.items || manifestInput.items.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Validation error: manifest must contain at least one item' },
          { status: 400 }
        );
      }
      const saved = await serverRecordStore.saveManifest(manifestInput);
      return NextResponse.json({
        success: true,
        data: saved,
      });
    }

    const candidate = body as Partial<WoodReceivingRecord>;
    if (
      !candidate.woodSpecies ||
      typeof candidate.woodSpecies !== 'string' ||
      candidate.woodSpecies.trim() === '' ||
      typeof candidate.tallyVolumeM3 !== 'number' ||
      !Number.isFinite(candidate.tallyVolumeM3) ||
      candidate.tallyVolumeM3 <= 0
    ) {
      return NextResponse.json(
        { success: false, error: 'Validation error: woodSpecies and positive tallyVolumeM3 are required' },
        { status: 400 }
      );
    }

    const saved = await serverRecordStore.save(candidate as WoodReceivingRecord);

    return NextResponse.json({
      success: true,
      data: saved,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
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
        { success: false, error: 'Akses ditolak: Hanya Level 1 dan 2 yang dapat menghapus data' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const manifestId = searchParams.get('manifestId');
    const id = searchParams.get('id');

    if (manifestId && manifestId.trim() !== '') {
      const deleted = await serverRecordStore.deleteManifest(manifestId);
      if (!deleted) {
        return NextResponse.json(
          { success: false, error: 'Manifest not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        message: 'Manifest deleted successfully',
      });
    }

    if (!id || id.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Missing required query parameter: id or manifestId' },
        { status: 400 }
      );
    }

    const deleted = await serverRecordStore.delete(id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Record deleted successfully',
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
