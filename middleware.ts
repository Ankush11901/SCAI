import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware
 * Handles authentication redirects and protected route access
 * 
 * Better Auth handles session validation at the API level,
 * but we use middleware for:
 * - Redirecting unauthenticated users to login
 * - Redirecting authenticated users away from login page
 */

// Routes that require authentication
const protectedRoutes = [
  '/generate',
  '/bulk',
  '/visualize',
  '/matrix',
  '/guidelines',
]

// Routes that should redirect to app if authenticated
// Note: We no longer auto-redirect from /login to prevent loops with invalid sessions
// The login page handles the redirect client-side after validating the session
const authRoutes: string[] = []

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Get session token from cookies (Better Auth uses __Secure- prefix on HTTPS)
  const sessionToken = request.cookies.get('better-auth.session_token')?.value
    || request.cookies.get('__Secure-better-auth.session_token')?.value

  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))

  // If trying to access protected route without session, redirect to login
  if (isProtectedRoute && !sessionToken) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // If trying to access auth routes with valid session, redirect to app
  // Note: Disabled to prevent redirect loops - login page handles this client-side
  if (isAuthRoute && sessionToken) {
    return NextResponse.redirect(new URL('/generate', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api routes (handled separately)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (browser icon)
     * - public files (images, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*$).*)',
  ],
}
