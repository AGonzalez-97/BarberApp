import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { TENANT_ID } from '@/lib/tenant'
import StatsCard from '@/components/admin/StatsCard'

export const revalidate = 60

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Formats a numeric value as ARS currency with thousands separator. */
function formatARS(value: number | null | undefined): string {
  if (value === null || value === undefined || value === 0) return '$0'
  return (
    '$' +
    Math.round(value)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  )
}

const DAY_NAMES: Record<number, string> = {
  0: 'Domingo',
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
}

function formatHourRange(hour: number): string {
  const start = hour.toString().padStart(2, '0') + ':00'
  const end = (hour + 1).toString().padStart(2, '0') + ':00'
  return `${start} – ${end}`
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface DailyStats {
  total_cuts: number
  total_revenue: number
}

interface WeeklyStats {
  week_start: string
  total_cuts: number
  total_revenue: number
}

interface MonthlyStats {
  month_start: string
  total_cuts: number
  total_revenue: number
}

interface LowTrafficSlot {
  day_of_week: number
  hour_of_day: number
  avg_bookings: number
}

interface TodayMovement {
  id: string
  created_at: string
  price_charged: number
  loyalty_discount_applied: boolean
  clients: { name: string } | null
  services: { name: string } | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTodayARGRange(): { start: Date; end: Date } {
  const now = new Date()
  // Argentina is UTC-3 (no DST). Subtract 3h to get the Argentina date.
  const argNow = new Date(now.getTime() - 3 * 60 * 60 * 1000)
  const date = argNow.toISOString().slice(0, 10) // "YYYY-MM-DD"
  // Midnight ART = 03:00 UTC
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

// ─── Data fetching ────────────────────────────────────────────────────────────

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

async function fetchStats() {
  const supabase = createClient()

  const [dailyResult, weeklyResult, monthlyResult, lowTrafficResult] =
    await Promise.all([
      supabase
        .from('daily_stats')
        .select('total_cuts, total_revenue')
        .eq('tenant_id', TENANT_ID)
        .maybeSingle<DailyStats>(),

      supabase
        .from('weekly_stats')
        .select('week_start, total_cuts, total_revenue')
        .eq('tenant_id', TENANT_ID)
        .order('week_start', { ascending: false })
        .limit(1)
        .maybeSingle<WeeklyStats>(),

      supabase
        .from('monthly_stats')
        .select('month_start, total_cuts, total_revenue')
        .eq('tenant_id', TENANT_ID)
        .order('month_start', { ascending: false })
        .limit(1)
        .maybeSingle<MonthlyStats>(),

      supabase
        .from('low_traffic_slots')
        .select('day_of_week, hour_of_day, avg_bookings')
        .eq('tenant_id', TENANT_ID)
        .order('avg_bookings', { ascending: true })
        .limit(8)
        .returns<LowTrafficSlot[]>(),
    ])

  return {
    daily: dailyResult.data,
    weekly: weeklyResult.data,
    monthly: monthlyResult.data,
    lowTraffic: lowTrafficResult.data ?? [],
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const [{ daily, weekly, monthly, lowTraffic }, todayMovements] = await Promise.all([
    fetchStats(),
    fetchTodayMovements(),
  ])

  const todayCuts = daily?.total_cuts ?? 0
  const todayRevenue = daily?.total_revenue ?? 0
  const weeklyCuts = weekly?.total_cuts ?? 0
  const weeklyRevenue = weekly?.total_revenue ?? 0
  const monthlyCuts = monthly?.total_cuts ?? 0
  const monthlyRevenue = monthly?.total_revenue ?? 0

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <h1 className="mb-6 text-xl font-bold text-gray-900">Dashboard</h1>

      {/* ── Today — featured, largest, always visible above the fold ── */}
      <section aria-labelledby="today-heading" className="mb-4">
        <h2 id="today-heading" className="sr-only">
          Hoy
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <StatsCard
            label="Cortes hoy"
            value={todayCuts === 0 ? '—' : String(todayCuts)}
            subtitle={todayCuts === 0 ? 'Sin cortes hoy' : undefined}
            featured
          />
          <StatsCard
            label="Ingresos hoy"
            value={formatARS(todayRevenue)}
            featured
          />
        </div>
      </section>

      {/* ── This week ── */}
      <section aria-labelledby="week-heading" className="mb-4">
        <h2
          id="week-heading"
          className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500"
        >
          Esta semana
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <StatsCard
            label="Cortes"
            value={String(weeklyCuts)}
            subtitle={weeklyCuts === 1 ? '1 corte' : undefined}
          />
          <StatsCard label="Ingresos" value={formatARS(weeklyRevenue)} />
        </div>
      </section>

      {/* ── This month ── */}
      <section aria-labelledby="month-heading" className="mb-6">
        <h2
          id="month-heading"
          className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500"
        >
          Este mes
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <StatsCard label="Cortes" value={String(monthlyCuts)} />
          <StatsCard label="Ingresos" value={formatARS(monthlyRevenue)} />
        </div>
      </section>

      {/* ── Today's movements ── */}
      <section aria-labelledby="movements-heading" className="mb-6">
        <h2
          id="movements-heading"
          className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500"
        >
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
                      {m.services?.name ?? 'Servicio'}{m.loyalty_discount_applied ? ' · descuento aplicado' : ''}
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
      </section>

      {/* ── Low-traffic slots (TASK-025) ── */}
      <section aria-labelledby="low-traffic-heading">
        <details className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
          <summary
            id="low-traffic-heading"
            className="cursor-pointer select-none rounded-2xl px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Horarios con menos movimiento
          </summary>

          <div className="px-4 pb-4 pt-2">
            {lowTraffic.length === 0 ? (
              <p className="text-sm text-gray-500">
                Todavía no hay suficiente historial para detectar patrones.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {lowTraffic.map((slot) => (
                  <li
                    key={`${slot.day_of_week}-${slot.hour_of_day}`}
                    className="flex items-center justify-between py-2"
                  >
                    <div>
                      <span className="text-sm font-medium text-gray-800">
                        {DAY_NAMES[slot.day_of_week] ?? `Día ${slot.day_of_week}`}
                      </span>
                      <span className="ml-2 text-sm text-gray-500">
                        {formatHourRange(slot.hour_of_day)}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {Math.round(slot.avg_bookings)} turno
                      {Math.round(slot.avg_bookings) !== 1 ? 's' : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </details>
      </section>
    </div>
  )
}
