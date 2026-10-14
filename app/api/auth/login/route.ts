import { NextResponse } from 'next/server.js';
import { authenticateUser } from '../../../../src/auth/users.ts';
import { createSessionToken, COOKIE_NAME } from '../../../../src/auth/session.ts';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const user = await authenticateUser(body);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Email atau kata sandi tidak valid.' },
        { status: 401 }
      );
    }

    const token = createSessionToken(user);
    const response = NextResponse.json({ success: true, user });

    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch {
    return NextResponse.json(
      { success: false, error: 'Format permintaan tidak valid.' },
      { status: 400 }
    );
  }
}
