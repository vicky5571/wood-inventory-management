import { NextResponse } from 'next/server.js';
import { verifySessionToken, COOKIE_NAME } from '../../../../src/auth/session.ts';

export async function GET(request: Request) {
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

  const user = verifySessionToken(token);
  if (!user) {
    return NextResponse.json({ success: false, error: 'Belum masuk.' }, { status: 401 });
  }

  return NextResponse.json({ success: true, user });
}
