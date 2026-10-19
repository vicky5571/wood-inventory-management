import { NextResponse } from 'next/server.js';
import { serverRecordStore } from '../../../src/persistence/server-record-store.ts';
import { getAuthenticatedUser } from '../../../src/auth/session.ts';
import type {
  AuthUser,
  WoodReceivingRecord,
  ManifestFormInput,
  RecordQueryParams,
  PaymentStatus,
} from '../../../src/types/index.ts';

import { parseRecordQueryParams } from '../../../src/utils/record-query-params.ts';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse>;
export async function GET(request: Request): Promise<NextResponse>;
export async function GET(request?: Request): Promise<NextResponse> {
  try {
    if (request?.url) {
      const { searchParams } = new URL(request.url, 'http://localhost');
      const params = parseRecordQueryParams(searchParams);
      if (params) {
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

    if (raw.action === 'reset') {
      const resetRecords = await serverRecordStore.reset();
      await serverRecordStore.appendActivityLog({
        action: 'DEMO_RESET',
        entitySummary: 'Reset database penerimaan kayu ke data demo awal',
        operatorName: user.name,
        operatorRole: user.title || `Level ${user.roleLevel}`,
      });
      return NextResponse.json({
        success: true,
        data: resetRecords,
      });
    }

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
      await serverRecordStore.appendActivityLog({
        action: 'RECORD_CREATED',
        entityId: manifestInput.manifestNumber,
        entitySummary: `Manifest ${manifestInput.manifestNumber} • Plat ${manifestInput.truckPlateNumber}`,
        operatorName: user.name,
        operatorRole: user.title || `Level ${user.roleLevel}`,
      });
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
    await serverRecordStore.appendActivityLog({
      action: 'RECORD_CREATED',
      entityId: saved.id,
      entitySummary: `Truk ${saved.truckPlateNumber} • ${saved.woodSpecies} (${saved.tallyVolumeM3} m³)`,
      operatorName: user.name,
      operatorRole: user.title || `Level ${user.roleLevel}`,
    });

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
      await serverRecordStore.appendActivityLog({
        action: 'RECORD_DELETED',
        entityId: manifestId,
        entitySummary: `Manifest ${manifestId} deleted`,
        operatorName: user.name,
        operatorRole: user.title || `Level ${user.roleLevel}`,
      });
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
    await serverRecordStore.appendActivityLog({
      action: 'RECORD_DELETED',
      entityId: id,
      entitySummary: `Record ${id} deleted`,
      operatorName: user.name,
      operatorRole: user.title || `Level ${user.roleLevel}`,
    });

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
