import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

// Public paths that do not require authentication
const PUBLIC_PATHS = ['/login', '/api/auth/login'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths and Next.js internals
  if (
    PUBLIC_PATHS.some(p => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  // For API routes (except auth), verify the Bearer token
  if (pathname.startsWith('/api/')) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: '未授权，请先登录' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const user = verifyToken(token);

    if (!user) {
      return NextResponse.json(
        { success: false, message: '令牌无效或已过期，请重新登录' },
        { status: 401 }
      );
    }

    // Attach user info to request headers for downstream handlers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', user.id);
    requestHeaders.set('x-user-role', user.role);
    requestHeaders.set('x-user-name', user.username);

    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // For page routes, check for the auth token stored in localStorage via a cookie fallback.
  // Since middleware cannot access localStorage, we rely on a short-lived cookie set at login.
  const tokenCookie = request.cookies.get('auth_token');

  if (!tokenCookie?.value) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const user = verifyToken(tokenCookie.value);
  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('auth_token');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
