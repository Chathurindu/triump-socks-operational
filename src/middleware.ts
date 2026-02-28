import { withAuth, NextRequestWithAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req: NextRequestWithAuth) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // Public pages — allow without auth
    const isPublicPage =
      pathname === '/' ||
      pathname === '/login' ||
      pathname.startsWith('/about') ||
      pathname.startsWith('/contact') ||
      pathname.startsWith('/products') ||
      pathname.startsWith('/_next') ||
      pathname.startsWith('/api/auth/') ||
      pathname.match(/\.(ico|png|jpg|svg|css|js|woff2?)$/);

    if (isPublicPage) {
      const response = NextResponse.next();
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('X-Frame-Options', 'DENY');
      response.headers.set('X-XSS-Protection', '1; mode=block');
      response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
      response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
      return response;
    }

    // Block unauthenticated access (withAuth handles redirect for pages)
    if (!token) {
      // For API routes, return 401 JSON instead of redirect
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/login', req.url));
    }

    const role = token.role as string | undefined;

    // Admin-only routes
    if (pathname.startsWith('/admin') || pathname.startsWith('/api/users')) {
      if (role !== 'admin') {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }

    // Add security headers to all responses
    const response = NextResponse.next();
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    return response;
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        // Public pages: allow without auth
        if (
          pathname === '/' ||
          pathname === '/login' ||
          pathname.startsWith('/about') ||
          pathname.startsWith('/contact') ||
          pathname.startsWith('/products') ||
          pathname.startsWith('/_next') ||
          pathname.startsWith('/favicon') ||
          pathname.match(/\.(ico|png|jpg|svg|css|js|woff2?)$/)
        ) {
          return true;
        }
        // Public auth API
        if (pathname.startsWith('/api/auth/')) {
          return true;
        }
        // API routes: always return true so our middleware handles 401
        if (pathname.startsWith('/api/')) {
          return true;
        }
        // Everything else requires a token
        return !!token;
      },
    },
    pages: {
      signIn: '/login',
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all paths except static assets and Next.js internals.
     * This ensures every route goes through auth checking.
     */
    '/((?!_next/static|_next/image|favicon.ico|favicon-|apple-touch-icon|android-chrome|site.webmanifest|logo.jpeg|uploads/).*)',
  ],
};
