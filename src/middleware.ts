/**
 * @file middleware.ts
 * @summary Next.js middleware for session and legal shield checks
 * @dependencies next/server, @/lib/supabase/middleware
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/middleware';

/**
 * Routes that require authentication and legal shield acceptance
 */
const PROTECTED_ROUTES = ['/cockpit', '/launcher', '/locker', '/dashboard'];

/**
 * Routes that are publicly accessible
 */
const PUBLIC_ROUTES = ['/', '/shield', '/api/auth'];

/**
 * Check if a path matches any of the given route prefixes
 */
function matchesRoute(path: string, routes: string[]): boolean {
  return routes.some((route) => path === route || path.startsWith(`${route}/`));
}

/**
 * Middleware function for session and legal shield validation
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip public routes and static files
  if (
    matchesRoute(pathname, PUBLIC_ROUTES) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Create Supabase client for middleware
  const { supabase, response } = await createClient(request);

  // Get current session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // No session - redirect to home
  if (!user) {
    const redirectUrl = new URL('/', request.url);
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Check if accessing protected route
  if (matchesRoute(pathname, PROTECTED_ROUTES)) {
    // Fetch profile to check legal shield status
    const { data: profile } = await supabase
      .from('profiles')
      .select('legal_shield_status')
      .eq('id', user.id)
      .single();

    // No profile or legal shield not accepted - redirect to shield
    if (!profile || profile.legal_shield_status !== 'accepted') {
      const redirectUrl = new URL('/shield', request.url);
      redirectUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}

/**
 * Middleware configuration
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
