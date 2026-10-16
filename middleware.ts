import { NextResponse } from 'next/server.js';
import type { NextRequest } from 'next/server.js';
import { verifySessionToken, COOKIE_NAME } from './src/auth/session.ts';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const user = verifySessionToken(token);

  // 1. Public API route: login
  if (pathname === '/api/auth/login') {
    return NextResponse.next();
  }

  // 2. API routes: enforce session authentication and return 401 JSON if unauthorized
  if (pathname.startsWith('/api/')) {
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // 3. If user is accessing /login while already authenticated -> redirect to /
  if (pathname === '/login') {
    if (user) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // 4. If user is accessing protected non-API routes without valid auth -> redirect to /login
  if (!user) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  runtime: 'nodejs',
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|theme-preview.html).*)',
  ],
};
