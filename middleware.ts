import { NextResponse } from 'next/server.js';
import type { NextRequest } from 'next/server.js';
import { verifySessionToken, COOKIE_NAME } from './src/auth/session.ts';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const user = verifySessionToken(token);

  // If user is accessing /login while already authenticated -> redirect to /
  if (pathname === '/login') {
    if (user) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // If user is accessing protected routes without valid auth -> redirect to /login
  if (!user) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  runtime: 'nodejs',
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
