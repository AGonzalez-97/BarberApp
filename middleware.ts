import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Paths that require an authenticated session — both UI pages and API routes.
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/turnos',
  '/clientes',
  '/ajustes',
  '/qr',
  '/api/admin',
]

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

// ── Simple in-memory rate limiter ─────────────────────────────────────────────
// Works per-instance. For multi-instance production use @upstash/ratelimit + Redis.
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

const RATE_LIMIT_ROUTES: Record<string, { max: number; windowMs: number }> = {
  '/api/bookings': { max: 5, windowMs: 60_000 },
}

function checkRateLimit(ip: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = rateLimitStore.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= max) return false
  entry.count++
  return true
}

const CSRF_SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // CSRF: verify Origin header on state-mutating admin API requests.
  // SameSite=Lax on auth cookies already blocks cross-site attacks in modern browsers;
  // this adds explicit defense-in-depth at the edge.
  if (!CSRF_SAFE_METHODS.has(request.method) && pathname.startsWith('/api/admin')) {
    const origin = request.headers.get('origin')
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    if (origin && appUrl && origin !== appUrl) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  // Rate limit POST requests to sensitive public endpoints
  const rateConfig = RATE_LIMIT_ROUTES[pathname]
  if (rateConfig && request.method === 'POST') {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      'unknown'

    if (!checkRateLimit(ip, rateConfig.max, rateConfig.windowMs)) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Intentá de nuevo en un minuto.' },
        { status: 429 },
      )
    }
  }

  const { supabaseResponse, user } = await updateSession(request)

  if (!user && isProtected(pathname)) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('next', pathname)
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
