import { NextResponse } from 'next/server.js';
import { getAuthenticatedUserDetailed } from '../../../../src/auth/session.ts';
import type { AuthFailureReason } from '../../../../src/types/index.ts';

function humanizeReason(reason?: AuthFailureReason): string {
  switch (reason) {
    case 'NO_TOKEN':
      return 'Belum masuk.';
    case 'TOKEN_MALFORMED':
    case 'TOKEN_INVALID':
      return 'Sesi tidak valid.';
    case 'TOKEN_EXPIRED':
      return 'Sesi kadaluarsa.';
    case 'USER_NOT_FOUND':
      return 'Akun tidak ditemukan.';
    case 'USER_INACTIVE':
      return 'Akun telah dinonaktifkan.';
    default:
      return 'Sesi tidak valid.';
  }
}

export async function GET(request: Request) {
  const { user, reason } = await getAuthenticatedUserDetailed(request);
  if (!user) {
    return NextResponse.json(
      {
        success: false,
        error: humanizeReason(reason),
        reason,
      },
      { status: 401 }
    );
  }

  return NextResponse.json({ success: true, user });
}
