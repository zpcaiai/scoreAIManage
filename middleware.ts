import { NextRequest, NextResponse } from 'next/server';

// Force Node.js runtime for crypto module support (Next.js middleware still runs in Edge though)
export const runtime = 'nodejs';

// Public paths that do not require authentication
const PUBLIC_PATHS = ['/login', '/api/auth/login'];

// Edge-compatible JWT parser (no signature verification, just expiration check)
// API routes will still do full signature verification since they run in Node.js.
function parseJwtEdge(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const padLength = (4 - (base64Url.length % 4)) % 4;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(padLength);
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    const currentTime = Date.now() / 1000;
    
    if (payload.exp && payload.exp < currentTime) {
      return null;
    }
    return payload;
  } catch (e) {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  console.log('[Middleware] Request to:', pathname);

  // Allow public paths and Next.js internals
  if (
    PUBLIC_PATHS.some(p => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    console.log('[Middleware] Public path, allowing');
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
    const user = parseJwtEdge(token);

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
  console.log('[Middleware] Cookie check:', tokenCookie ? 'found' : 'not found');

  if (!tokenCookie?.value) {
    console.log('[Middleware] No cookie, redirecting to login');
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const user = parseJwtEdge(tokenCookie.value);
  console.log('[Middleware] Token verification:', user ? 'valid' : 'invalid');

  if (!user) {
    console.log('[Middleware] Invalid token, redirecting to login');
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('auth_token');
    return response;
  }

  console.log('[Middleware] Authentication successful, allowing');
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
