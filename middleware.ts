import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Paths that require an authenticated session.
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/appointments',
  '/clients',
  '/settings',
  '/qr',
]

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)

  if (!user && isProtected(request.nextUrl.pathname)) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    // Preserve the intended destination so we can redirect back after login.
    loginUrl.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     *   - _next/static  (static files)
     *   - _next/image   (image optimisation)
     *   - favicon.ico
     *   - public assets (png, svg, jpg, jpeg, gif, webp)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|svg|jpg|jpeg|gif|webp)$).*)',
  ],
}
