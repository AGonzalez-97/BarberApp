import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { TENANT_ID } from '@/lib/tenant'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

// ─── Types ────────────────────────────────────────────────────────────────────

type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'

interface BookingRow {
  id: string
  starts_at: string
  created_at: string
  status: BookingStatus
  clients: { name: string; phone: string } | null
  services: { name: string } | null
}

interface CompletedRow {
  id: string
  starts_at: string
  clients: { name: string } | null
  services: { name: string } | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns today's date as YYYY-MM-DD in America/Argentina/Buenos_Aires.
 */
function getTodayBuenosAires(): string {
  return new Date().toLocaleDateString('sv-SE', {
    timeZone: 'America/Argentina/Buenos_Aires',
  })
}

/**
 * Formats an ISO timestamp to HH:MM in Buenos Aires timezone.
 */
function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/**
 * Formats a YYYY-MM-DD string as a human-readable date in Spanish.
 * e.g. "sábado 14 de junio de 2026"
 */
function formatDateLabel(dateStr: string): string {
  // Parse as local date to avoid UTC-offset issues
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Adds or subtracts days from a YYYY-MM-DD string.
 */
function shiftDate(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  d.setDate(d.getDate() + days)
  return d.toLocaleDateString('sv-SE') // YYYY-MM-DD
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  BookingStatus,
  { label: string; className: string }
> = {
  pending: {
    label: 'Pendiente',
    className: 'bg-yellow-100 text-yellow-800',
  },
  confirmed: {
    label: 'Confirmado',
    className: 'bg-blue-100 text-blue-800',
  },
  completed: {
    label: 'Completado',
    className: 'bg-green-100 text-green-800',
  },
  cancelled: {
    label: 'Cancelado',
    className: 'bg-gray-100 text-gray-600',
  },
  no_show: {
    label: 'No asistió',
    className: 'bg-red-100 text-red-700',
  },
}

function StatusBadge({ status }: { status: BookingStatus }) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: 'bg-gray-100 text-gray-600' }
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        config.className,
      ].join(' ')}
    >
      {config.label}
    </span>
  )
}

// ─── Conflict detection ───────────────────────────────────────────────────────

const ACTIVE_STATUSES: BookingStatus[] = ['pending', 'confirmed']

/**
 * Returns a Set of booking IDs that are NOT the first to request an active slot.
 * Only flags bookings with status pending or confirmed that share a starts_at
 * with at least one other active booking.
 */
function getConflictingIds(bookings: BookingRow[]): Set<string> {
  const slotMap = new Map<string, BookingRow[]>()

  for (const b of bookings) {
    if (!ACTIVE_STATUSES.includes(b.status)) continue
    const rows = slotMap.get(b.starts_at) ?? []
    rows.push(b)
    slotMap.set(b.starts_at, rows)
  }

  const conflicting = new Set<string>()
  for (const rows of Array.from(slotMap.values())) {
    if (rows.length < 2) continue
    // Sort by created_at; skip the first (priority) and mark the rest
    const sorted = [...rows].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    )
    for (let i = 1; i < sorted.length; i++) {
      conflicting.add(sorted[i].id)
    }
  }
  return conflicting
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function fetchPendingBookings(): Promise<BookingRow[]> {
  const service = createServiceClient()

  const { data, error } = await service
    .from('bookings')
    .select('id, starts_at, created_at, status, clients ( name, phone ), services ( name )')
    .eq('tenant_id', TENANT_ID)
    .eq('status', 'pending')
    .order('starts_at', { ascending: true })
    .order('created_at', { ascending: true })
    .returns<BookingRow[]>()

  if (error) {
    console.error('[TurnosPage] fetchPendingBookings error:', error)
    return []
  }

  return data ?? []
}

async function fetchBookings(date: string): Promise<BookingRow[]> {
  const service = createServiceClient()

  const dayStart = `${date}T00:00:00-03:00`
  const dayEnd = `${date}T23:59:59-03:00`

  const { data, error } = await service
    .from('bookings')
    .select('id, starts_at, created_at, status, clients ( name, phone ), services ( name )')
    .eq('tenant_id', TENANT_ID)
    .gte('starts_at', dayStart)
    .lte('starts_at', dayEnd)
    .order('starts_at', { ascending: true })
    .order('created_at', { ascending: true })
    .returns<BookingRow[]>()

  if (error) {
    console.error('[TurnosPage] fetchBookings error:', error)
    return []
  }

  return data ?? []
}

async function fetchCompletedBookings(): Promise<CompletedRow[]> {
  const service = createServiceClient()
  const { data } = await service
    .from('bookings')
    .select('id, starts_at, clients ( name ), services ( name )')
    .eq('tenant_id', TENANT_ID)
    .eq('status', 'completed')
    .order('starts_at', { ascending: false })
    .limit(30)
    .returns<CompletedRow[]>()
  return data ?? []
}

function formatCompletedDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function TurnosPage({
  searchParams,
}: {
  searchParams: { date?: string }
}) {
  // Auth guard (layout already checks, but belt-and-suspenders)
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = getTodayBuenosAires()
  const targetDate =
    searchParams.date && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date)
      ? searchParams.date
      : today

  const [bookings, pendingBookings, completedBookings] = await Promise.all([
    fetchBookings(targetDate),
    fetchPendingBookings(),
    fetchCompletedBookings(),
  ])
  const conflictingIds = getConflictingIds(bookings)

  const prevDate = shiftDate(targetDate, -1)
  const nextDate = shiftDate(targetDate, +1)
  const isToday = targetDate === today

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
    <div className="flex gap-6 items-start">
    <div className="min-w-0 flex-1">

      {/* ── Pending section ─────────────────────────────────────────────── */}
      {pendingBookings.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-orange-600">
            Requieren confirmación ({pendingBookings.length})
          </h2>
          <ul className="space-y-2">
            {pendingBookings.map((booking) => (
              <li key={booking.id}>
                <Link
                  href={`/turnos/${booking.id}`}
                  className="flex items-center gap-3 rounded-2xl bg-orange-50 px-4 py-3 ring-1 ring-orange-200 transition-shadow hover:shadow-md active:shadow-sm"
                >
                  <span className="min-w-[46px] rounded-lg bg-orange-500 px-2 py-1 text-center text-sm font-bold tabular-nums text-white">
                    {formatTime(booking.starts_at)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900">
                      {booking.clients?.name ?? 'Cliente desconocido'}
                    </p>
                    <p className="truncate text-xs text-gray-500">
                      {formatDateLabel(booking.starts_at.slice(0, 10))} · {booking.services?.name ?? '—'}
                    </p>
                  </div>
                  <span className="text-xs text-orange-500">›</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Turnos</h1>

        {/* Date navigation */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <Link
            href={`/turnos?date=${prevDate}`}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 transition-colors hover:bg-gray-50 active:bg-gray-100"
            aria-label="Día anterior"
          >
            ‹
          </Link>

          <div className="text-center">
            <p className="text-sm font-semibold capitalize text-gray-900">
              {formatDateLabel(targetDate)}
            </p>
            {isToday && (
              <span className="text-xs font-medium text-blue-600">Hoy</span>
            )}
          </div>

          <Link
            href={`/turnos?date=${nextDate}`}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 transition-colors hover:bg-gray-50 active:bg-gray-100"
            aria-label="Día siguiente"
          >
            ›
          </Link>
        </div>

        {!isToday && (
          <div className="mt-2 text-center">
            <Link
              href="/turnos"
              className="text-xs font-medium text-blue-600 underline-offset-2 hover:underline"
            >
              Volver a hoy
            </Link>
          </div>
        )}
      </div>

      {/* ── Booking list ─────────────────────────────────────────────────── */}
      {bookings.length === 0 ? (
        <div className="rounded-2xl bg-white px-6 py-12 text-center shadow-sm ring-1 ring-gray-200">
          <p className="text-sm text-gray-500">No hay turnos para hoy</p>
        </div>
      ) : (
        <ul className="space-y-3" aria-label="Lista de turnos">
          {bookings.map((booking) => {
            const isConflict = conflictingIds.has(booking.id)
            return (
              <li key={booking.id}>
                <Link
                  href={`/turnos/${booking.id}`}
                  className={[
                    'block rounded-2xl bg-white px-4 py-4 shadow-sm transition-shadow hover:shadow-md active:shadow-sm',
                    isConflict
                      ? 'ring-2 ring-orange-400'
                      : 'ring-1 ring-gray-200',
                  ].join(' ')}
                >
                  {isConflict && (
                    <p className="mb-2 text-xs font-semibold text-orange-600">
                      ⚠ Conflicto de horario — solicitado después
                    </p>
                  )}
                  <div className="flex items-start justify-between gap-3">
                    {/* Time */}
                    <span className="min-w-[46px] rounded-lg bg-gray-900 px-2 py-1 text-center text-sm font-bold tabular-nums text-white">
                      {formatTime(booking.starts_at)}
                    </span>

                    {/* Client + service */}
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-semibold text-gray-900">
                        {booking.clients?.name ?? 'Cliente desconocido'}
                      </p>
                      <p className="truncate text-sm text-gray-500">
                        {booking.services?.name ?? '—'}
                        {booking.clients?.phone && (
                          <span className="ml-2 text-gray-400">
                            {booking.clients.phone}
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Status badge */}
                    <StatusBadge status={booking.status} />
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>

    {/* ── Completed history ────────────────────────────────────────────── */}
    <aside className="hidden w-72 shrink-0 lg:block">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Historial completados ({completedBookings.length})
      </h2>
      {completedBookings.length === 0 ? (
        <div className="rounded-2xl bg-white px-4 py-8 text-center text-sm text-gray-400 shadow-sm ring-1 ring-gray-200">
          Sin turnos completados aún
        </div>
      ) : (
        <ul className="space-y-2">
          {completedBookings.map((b) => (
            <li key={b.id}>
              <Link
                href={`/turnos/${b.id}`}
                className="flex items-center gap-3 rounded-xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-gray-200 transition-shadow hover:shadow-md"
              >
                <span className="min-w-[40px] rounded-lg bg-green-100 px-1.5 py-1 text-center text-xs font-bold tabular-nums text-green-800">
                  {formatTime(b.starts_at)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {b.clients?.name ?? '—'}
                  </p>
                  <p className="truncate text-xs text-gray-400">
                    {formatCompletedDate(b.starts_at)} · {b.services?.name ?? '—'}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </aside>
    </div>
    </div>
  )
}
