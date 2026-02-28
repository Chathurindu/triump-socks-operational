import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/login',
  },
});

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/inventory/:path*',
    '/production/:path*',
    '/hr/:path*',
    '/finance/:path*',
    '/analytics/:path*',
    '/settings/:path*',
    '/supply-chain/:path*',
    '/suppliers/:path*',
    '/customers/:path*',
    '/machines/:path*',
    '/sales/:path*',
    '/purchases/:path*',
  ],
};
