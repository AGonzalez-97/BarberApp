import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { TENANT_ID } from '@/lib/tenant'
import BookingModeToggle from '@/components/admin/BookingModeToggle'
import ShareBookingLink from '@/components/admin/ShareBookingLink'

export const dynamic = 'force-dynamic'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Tenant {
  id: string
  name: string
  slug: string
  booking_mode: 'request' | 'slots'
  payment_alias: string
  available_days: number
  settings: Record<string, unknown>
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function fetchTenant(): Promise<Tenant | null> {
  const service = createServiceClient()
  const { data, error } = await service
    .from('tenants')
    .select('id, name, slug, booking_mode, payment_alias, available_days, settings')
    .eq('id', TENANT_ID)
    .single<Tenant>()

  if (error) {
    console.error('[AjustesPage] fetchTenant error:', error)
    return null
  }
  return data
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AjustesPage() {
  // Auth guard
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const tenant = await fetchTenant()

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Ajustes</h1>
        {tenant && (
          <p className="mt-0.5 text-sm text-gray-500">{tenant.name}</p>
        )}
      </div>

      <div className="space-y-5">
        {/* ── Booking mode toggle ──────────────────────────────────────── */}
        <section className="rounded-2xl bg-white px-4 py-4 shadow-sm ring-1 ring-gray-200">
          <h2 className="mb-1 text-sm font-semibold text-gray-700">Modo de reserva</h2>
          <p className="mb-4 text-xs text-gray-400">
            ¿Cómo querés que los clientes saquen turno?
          </p>
          {tenant ? (
            <BookingModeToggle initialMode={tenant.booking_mode} />
          ) : (
            <p className="text-sm text-gray-400">No se pudo cargar la configuración.</p>
          )}
        </section>

        {/* ── Payment alias ────────────────────────────────────────────── */}
        {tenant && (
          <section className="rounded-2xl bg-white px-4 py-4 shadow-sm ring-1 ring-gray-200">
            <h2 className="mb-1 text-sm font-semibold text-gray-700">Alias de pago</h2>
            <p className="text-xs text-gray-400">
              Los clientes transferís a este alias al finalizar el corte.
            </p>
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2.5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 shrink-0 text-gray-400"
                aria-hidden="true"
              >
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
              <span className="font-mono text-sm font-semibold text-gray-800">
                {tenant.payment_alias}
              </span>
            </div>
          </section>
        )}

        {/* ── Navigation links ─────────────────────────────────────────── */}
        <section className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 overflow-hidden">
          <h2 className="px-4 pt-4 text-sm font-semibold text-gray-700">Configuración</h2>
          <nav aria-label="Secciones de ajustes">
            <ul className="mt-2 divide-y divide-gray-100">
              {/* Servicios */}
              <li>
                <Link
                  href="/ajustes/servicios"
                  className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-gray-50 active:bg-gray-100"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                      <path d="M14.5 10c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5z" />
                      <path d="M20.5 10H19V8.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
                      <path d="M9.5 14c.83 0 1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5S8 21.33 8 20.5v-5c0-.83.67-1.5 1.5-1.5z" />
                      <path d="M3.5 14H5v1.5c0 .83-.67 1.5-1.5 1.5S2 16.33 2 15.5 2.67 14 3.5 14z" />
                      <path d="M14 14.5c0-.83.67-1.5 1.5-1.5h5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-5c-.83 0-1.5-.67-1.5-1.5z" />
                      <path d="M15.5 19H14v1.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5-.67-1.5-1.5-1.5z" />
                      <path d="M10 9.5C10 8.67 9.33 8 8.5 8h-5C2.67 8 2 8.67 2 9.5S2.67 11 3.5 11h5c.83 0 1.5-.67 1.5-1.5z" />
                      <path d="M8.5 5H10V3.5C10 2.67 9.33 2 8.5 2S7 2.67 7 3.5 7.67 5 8.5 5z" />
                    </svg>
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Servicios</p>
                    <p className="text-xs text-gray-400">Precios, activar o desactivar</p>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-gray-300" aria-hidden="true">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </Link>
              </li>

              {/* Fidelización */}
              <li>
                <Link
                  href="/ajustes/fidelizacion"
                  className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-gray-50 active:bg-gray-100"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Fidelización</p>
                    <p className="text-xs text-gray-400">Descuentos y corte gratis por ciclo</p>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-gray-300" aria-hidden="true">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </Link>
              </li>

              {/* Días bloqueados */}
              <li>
                <Link
                  href="/ajustes/dias-bloqueados"
                  className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-gray-50 active:bg-gray-100"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                      <line x1="10" y1="14" x2="14" y2="18" />
                      <line x1="14" y1="14" x2="10" y2="18" />
                    </svg>
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Días bloqueados</p>
                    <p className="text-xs text-gray-400">Feriados, vacaciones, días libres</p>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-gray-300" aria-hidden="true">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </Link>
              </li>

              {/* Horarios — only relevant in slots mode */}
              {tenant?.booking_mode === 'slots' && (
                <li>
                  <Link
                    href="/ajustes/horarios"
                    className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-gray-50 active:bg-gray-100"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Horarios</p>
                      <p className="text-xs text-gray-400">Días y horas de atención</p>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-gray-300" aria-hidden="true">
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </Link>
                </li>
              )}
            </ul>
          </nav>
        </section>

        {/* ── Share booking link ───────────────────────────────────────── */}
        <section className="rounded-2xl bg-white px-4 py-4 shadow-sm ring-1 ring-gray-200">
          <h2 className="mb-1 text-sm font-semibold text-gray-700">Compartir turno online</h2>
          <p className="mb-4 text-xs text-gray-400">
            Mandales el link a tus clientes para que reserven solos.
          </p>
          <ShareBookingLink tenantSlug={tenant?.slug ?? 'leo-barber'} />
        </section>
      </div>
    </div>
  )
}
