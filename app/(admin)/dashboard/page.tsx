import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { TENANT_ID } from '@/lib/tenant'
import StatsCard from '@/components/admin/StatsCard'
import DashboardClient from '@/components/admin/DashboardClient'

export const revalidate = 60

function formatARS(value: number | null | undefined): string {
  if (value === null || value === undefined || value === 0) return '$0'
  return '$' + Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

interface DailyStats {
  total_cuts: number
  total_revenue: number
}

interface TodayMovement {
  id: string
  created_at: string
  price_charged: number
  loyalty_discount_applied: boolean
  clients: { name: string } | null
  services: { name: string } | null
}

function getTodayARGRange(): { start: Date; end: Date } {
  const now = new Date()
  const argNow = new Date(now.getTime() - 3 * 60 * 60 * 1000)
  const date = argNow.toISOString().slice(0, 10)
  const start = new Date(`${date}T03:00:00.000Z`)
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
  return { start, end }
}

function formatMovementTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Argentina/Buenos_Aires',
  })
}

async function fetchTodayMovements(): Promise<TodayMovement[]> {
  const service = createServiceClient()
  const { start, end } = getTodayARGRange()
  const { data } = await service
    .from('cuts')
    .select('id, created_at, price_charged, loyalty_discount_applied, clients ( name ), services ( name )')
    .eq('tenant_id', TENANT_ID)
    .gte('created_at', start.toISOString())
    .lt('created_at', end.toISOString())
    .order('created_at', { ascending: false })
    .returns<TodayMovement[]>()
  return data ?? []
}

async function fetchDailyStats() {
  const supabase = createClient()
  const { data } = await supabase
    .from('daily_stats')
    .select('total_cuts, total_revenue')
    .eq('tenant_id', TENANT_ID)
    .maybeSingle<DailyStats>()
  return data
}

export default async function DashboardPage() {
  const [daily, todayMovements] = await Promise.all([
    fetchDailyStats(),
    fetchTodayMovements(),
  ])

  const todayCuts = daily?.total_cuts ?? 0
  const todayRevenue = daily?.total_revenue ?? 0

  const movementsSection = (
    <>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        Movimientos de hoy
      </h2>
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
        {todayMovements.length === 0 ? (
          <p className="px-4 py-5 text-sm text-gray-400">Todavía no hay cobros hoy.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {todayMovements.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {m.clients?.name ?? 'Cliente'}
                  </p>
                  <p className="truncate text-xs text-gray-400">
                    {m.services?.name ?? 'Servicio'}
                    {m.loyalty_discount_applied ? ' · descuento aplicado' : ''}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold text-gray-900">{formatARS(m.price_charged)}</p>
                  <p className="text-xs text-gray-400">{formatMovementTime(m.created_at)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <a
          href="/api/admin/export/cuts"
          download
          className="rounded-lg bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          Exportar XLSX
        </a>
      </div>

      {/* ── Today ── */}
      <section className="mb-4">
        <div className="grid grid-cols-2 gap-3">
          <StatsCard
            label="Cortes hoy"
            value={todayCuts === 0 ? '—' : String(todayCuts)}
            subtitle={todayCuts === 0 ? 'Sin cortes hoy' : undefined}
            featured
          />
          <StatsCard label="Ingresos hoy" value={formatARS(todayRevenue)} featured />
        </div>
      </section>

      {/* ── Period stats + movements + charts (shared demo state) ── */}
      <DashboardClient movements={movementsSection} />
    </div>
  )
}
