import { NextResponse } from 'next/server.js';
import { serverRecordStore } from '../../../src/persistence/server-record-store.ts';
import { verifySessionToken, COOKIE_NAME } from '../../../src/auth/session.ts';
import type {
  AuthUser,
  WoodReceivingRecord,
  ManifestFormInput,
  RecordQueryParams,
  PaymentStatus,
} from '../../../src/types/index.ts';

export const dynamic = 'force-dynamic';

const PAGINATION_PARAM_KEYS = [
  'page', 'pageSize', 'searchQuery', 'query', 'species',
  'kavling', 'yard', 'startDate', 'endDate', 'paymentStatus', 'sortBy', 'sortOrder',
] as const;

const VALID_SORT_COLUMNS = new Set<string>([
  'receiptDate', 'truckPlateNumber', 'supplierName',
  'tallyVolumeM3', 'grandNetPayable', 'createdAt',
]);

async function getAuthenticatedUser(request: Request): Promise<AuthUser | null> {
  const rawHeader = request.headers.get('cookie') || '';
  const match = rawHeader.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]+)`));
  let token = match ? match[1] : undefined;
  if (!token) {
    try {
      const { cookies } = await import('next/headers');
      token = (await cookies()).get(COOKIE_NAME)?.value;
    } catch {
      token = undefined;
    }
  }
  return verifySessionToken(token);
}

export async function GET(): Promise<NextResponse>;
export async function GET(request: Request): Promise<NextResponse>;
export async function GET(request?: Request): Promise<NextResponse> {
  try {
    if (request?.url) {
      const { searchParams } = new URL(request.url, 'http://localhost');
      const hasPaginationParams = PAGINATION_PARAM_KEYS.some((key) => searchParams.has(key));

      if (hasPaginationParams) {
        const rawPayment = searchParams.get('paymentStatus')?.trim().toUpperCase();
        const rawSortBy = searchParams.get('sortBy')?.trim();
        const rawSortOrder = searchParams.get('sortOrder')?.trim().toUpperCase();

        const params: RecordQueryParams = {
          page: Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1),
          pageSize: searchParams.get('pageSize') !== null ? (parseInt(searchParams.get('pageSize')!, 10) || 50) : 50,
          searchQuery: (searchParams.get('searchQuery') || searchParams.get('query') || '').trim() || undefined,
          species: searchParams.get('species')?.trim() || undefined,
          kavling: searchParams.get('kavling')?.trim() || undefined,
          yard: searchParams.get('yard')?.trim() || undefined,
          startDate: searchParams.get('startDate')?.trim() || undefined,
          endDate: searchParams.get('endDate')?.trim() || undefined,
          paymentStatus: (rawPayment === 'UNPAID' || rawPayment === 'PARTIAL' || rawPayment === 'PAID' || rawPayment === 'ALL') ? (rawPayment as PaymentStatus | 'ALL') : undefined,
          sortBy: rawSortBy && VALID_SORT_COLUMNS.has(rawSortBy) ? (rawSortBy as RecordQueryParams['sortBy']) : undefined,
          sortOrder: rawSortOrder === 'ASC' ? 'ASC' : (rawSortOrder === 'DESC' ? 'DESC' : undefined),
        };

        const result = await serverRecordStore.getPaginated(params);
        return NextResponse.json({
          success: true,
          data: result.data,
          pagination: result.pagination,
          timestamp: new Date().toISOString(),
        });
      }
    }

    const records = await serverRecordStore.getAll();
    return NextResponse.json({
      success: true,
      data: records,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error('[API /api/records GET Error]:', err);
    const message = err instanceof Error ? err.message : 'Failed to retrieve records';
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
  } catch (err: unknown) {
    console.error('[API /api/records POST Error]:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json(
      { success: false, error: message },
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

    if (user.roleLevel !== 1) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak: Hanya Level 1 yang dapat menghapus data' },
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
  } catch (err: unknown) {
    console.error('[API /api/records DELETE Error]:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
