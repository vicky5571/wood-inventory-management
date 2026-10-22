import { NextResponse } from 'next/server.js';
import { getAuthenticatedUser } from '../../../../../src/auth/session.ts';
import { serverRecordStore } from '../../../../../src/persistence/server-record-store.ts';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await getAuthenticatedUser(request);
    if (!actor) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    if (actor.roleLevel !== 1) return NextResponse.json({ success: false, error: 'Akses ditolak: Hanya Level 1' }, { status: 403 });

    const { id } = await params;
    const url = new URL(request.url, 'http://localhost');
    const limit = parseInt(url.searchParams.get('limit') || '100', 10);

    const data = await serverRecordStore.getUserActivityLogs(id, limit);
    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve user activity';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
