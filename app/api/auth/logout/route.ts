import { NextResponse } from 'next/server.js';
import { COOKIE_NAME } from '../../../../src/auth/session.ts';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Berhasil keluar.' });
  response.cookies.set({
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
