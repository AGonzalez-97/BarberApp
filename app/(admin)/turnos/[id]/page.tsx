import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { TENANT_ID } from '@/lib/tenant'
import { getLoyaltyStatusLabel } from '@/lib/loyalty'
import type { LoyaltyConfig } from '@/lib/loyalty'
import BookingActions from '@/components/admin/BookingActions'

export const dynamic = 'force-dynamic'

// ─── Types ────────────────────────────────────────────────────────────────────

type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'

interface BookingDetail {
  id: string
  starts_at: string
  ends_at: string
  created_at: string
  status: BookingStatus
  notes: string | null
  clients: {
    id: string
    name: string
    phone: string
  } | null
  services: {
    id: string
    name: string
    price_ars: number
    duration_minutes: number
  } | null
}

interface LoyaltyLedgerRow {
  event: string
  counter_value: number
  created_at: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function buildWhatsAppConfirmationUrl(phone: string, clientName: string, startsAt: string): string {
  const date = new Date(startsAt).toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  const time = new Date(startsAt).toLocaleTimeString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const firstName = clientName.split(' ')[0]
  const message = `¡Hola ${firstName}! 👋 Tu turno está confirmado para el ${date} a las ${time} hs. ¡Te esperamos! ✂️ — Axel Barber Club`
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}

function formatARS(value: number): string {
  if (value === 0) return '$0'
  return (
    '$' +
    Math.round(value)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  )
}

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  completed: 'Completado',
  cancelled: 'Cancelado',
  no_show: 'No asistió',
}

const STATUS_COLORS: Record<BookingStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-600',
  no_show: 'bg-red-100 text-red-700',
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function fetchBookingDetail(id: string): Promise<BookingDetail | null> {
  const service = createServiceClient()

  const { data, error } = await service
    .from('bookings')
    .select(
      `
      id,
      starts_at,
      ends_at,
      created_at,
      status,
      notes,
      clients ( id, name, phone ),
      services ( id, name, price_ars, duration_minutes )
    `,
    )
    .eq('id', id)
    .eq('tenant_id', TENANT_ID)
    .single<BookingDetail>()

  if (error || !data) return null
  return data
}

/**
 * Computes the current loyalty cycle count for a client by counting
 * cut_completed events since the last cycle_reset.
 */
async function fetchLoyaltyCycleCount(clientId: string): Promise<number> {
  const service = createServiceClient()

  // Find the most recent cycle_reset for this client
  const { data: resetRow } = await service
    .from('loyalty_ledger')
    .select('created_at')
    .eq('tenant_id', TENANT_ID)
    .eq('client_id', clientId)
    .eq('event', 'cycle_reset')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<{ created_at: string }>()

  // Count cut_completed events after the last reset
  let query = service
    .from('loyalty_ledger')
    .select('event, counter_value, created_at', { count: 'exact', head: true })
    .eq('tenant_id', TENANT_ID)
    .eq('client_id', clientId)
    .eq('event', 'cut_completed')

  if (resetRow?.created_at) {
    query = query.gt('created_at', resetRow.created_at)
  }

  const { count } = await query
  return count ?? 0
}

async function fetchLoyaltyConfig(): Promise<LoyaltyConfig> {
  const service = createServiceClient()
  const { data } = await service
    .from('loyalty_config')
    .select('discount_at, free_at, discount_pct, reset_on_redeem')
    .eq('tenant_id', TENANT_ID)
    .single<LoyaltyConfig>()

  return (
    data ?? {
      discount_at: 3,
      free_at: 6,
      discount_pct: 15,
      reset_on_redeem: true,
    }
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function BookingDetailPage({
  params,
}: {
  params: { id: string }
}) {
  // Auth guard
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [booking, loyaltyConfig] = await Promise.all([
    fetchBookingDetail(params.id),
    fetchLoyaltyConfig(),
  ])

  if (!booking) notFound()

  const cycleCount = booking.clients?.id
    ? await fetchLoyaltyCycleCount(booking.clients.id)
    : 0

  const loyaltyLabel = getLoyaltyStatusLabel(cycleCount, loyaltyConfig)

  const statusLabel = STATUS_LABELS[booking.status] ?? booking.status
  const statusColor = STATUS_COLORS[booking.status] ?? 'bg-gray-100 text-gray-600'

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      {/* Back link */}
      <Link
        href="/turnos"
        className="mb-4 inline-flex min-h-[44px] items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900"
      >
        ‹ Turnos
      </Link>

      {/* ── Booking info card ────────────────────────────────────────────── */}
      <div className="mb-6 rounded-2xl bg-white px-5 py-5 shadow-sm ring-1 ring-gray-200">
        {/* Status */}
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Turno</h1>
          <span
            className={[
              'inline-flex items-center rounded-full px-3 py-1 text-sm font-medium',
              statusColor,
            ].join(' ')}
          >
            {statusLabel}
          </span>
        </div>

        {/* Date/time */}
        <div className="mb-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Fecha y hora del turno
          </p>
          <p className="mt-0.5 font-semibold capitalize text-gray-900">
            {formatDateTime(booking.starts_at)}
          </p>
        </div>

        {/* Request time — shows when client submitted the booking */}
        <div className="mb-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Solicitud recibida
          </p>
          <p className="mt-0.5 text-sm text-gray-700">
            {formatDateTime(booking.created_at)}
          </p>
        </div>

        {/* Service */}
        {booking.services && (
          <div className="mb-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Servicio
            </p>
            <p className="mt-0.5 font-semibold text-gray-900">
              {booking.services.name}
              <span className="ml-2 font-normal text-gray-600">
                {formatARS(booking.services.price_ars)}
              </span>
            </p>
          </div>
        )}

        {/* Client */}
        {booking.clients && (
          <div className="mb-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Cliente
            </p>
            <p className="mt-0.5 font-semibold text-gray-900">
              {booking.clients.name}
            </p>
            <a
              href={`tel:${booking.clients.phone}`}
              className="text-sm text-blue-600 hover:underline"
            >
              {booking.clients.phone}
            </a>
          </div>
        )}

        {/* Loyalty position */}
        <div className="rounded-xl bg-gray-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Fidelidad
          </p>
          <p className="mt-0.5 text-sm font-medium text-gray-900">
            {loyaltyLabel}
          </p>
          <p className="text-xs text-gray-500">
            {cycleCount} {cycleCount === 1 ? 'corte' : 'cortes'} en el ciclo actual
          </p>
        </div>

        {/* Notes */}
        {booking.notes && (
          <div className="mt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Notas
            </p>
            <p className="mt-0.5 text-sm text-gray-700">{booking.notes}</p>
          </div>
        )}
      </div>

      {/* ── WhatsApp confirmation ───────────────────────────────────────── */}
      {booking.clients && (
        <a
          href={buildWhatsAppConfirmationUrl(booking.clients.phone, booking.clients.name, booking.starts_at)}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-5 py-4 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90 active:opacity-80"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Enviar confirmación por WhatsApp
        </a>
      )}

      {/* ── Action buttons ───────────────────────────────────────────────── */}
      <BookingActions
        bookingId={booking.id}
        status={booking.status}
        loyaltyConfig={loyaltyConfig}
      />
    </div>
  )
}
