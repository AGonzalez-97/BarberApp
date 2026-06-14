import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { TENANT_ID } from '@/lib/tenant'
import { getLoyaltyStatusLabel } from '@/lib/loyalty'
import type { LoyaltyConfig } from '@/lib/loyalty'

export const dynamic = 'force-dynamic'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClientDetail {
  id: string
  name: string
  phone: string
  created_at: string
}

interface CutHistoryRow {
  id: string
  price_charged: number
  loyalty_discount_applied: boolean
  created_at: string
  services: {
    name: string
    price_ars: number
  } | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Formats an E.164 phone number for display.
 * +5491123456789 → +54 9 11 2345-6789
 */
function formatPhone(phone: string): string {
  const mobileMatch = phone.match(/^\+549(\d{2})(\d{4})(\d{4})$/)
  if (mobileMatch) {
    return `+54 9 ${mobileMatch[1]} ${mobileMatch[2]}-${mobileMatch[3]}`
  }
  const landlineMatch = phone.match(/^\+54(\d{2,3})(\d{4})(\d{4})$/)
  if (landlineMatch) {
    return `+54 ${landlineMatch[1]} ${landlineMatch[2]}-${landlineMatch[3]}`
  }
  return phone
}

/**
 * Formats a price in ARS.
 * 0 → "Gratis"  |  9000 → "$9.000"
 */
function formatARS(value: number): string {
  if (value === 0) return 'Gratis'
  return (
    '$' +
    Math.round(value)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  )
}

/**
 * Formats a date as "15 de marzo de 2025" in Spanish.
 */
function formatDateSpanish(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Formats a date as "Cliente desde enero 2025" (month + year only).
 */
function formatMemberSince(iso: string): string {
  const formatted = new Date(iso).toLocaleDateString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    month: 'long',
    year: 'numeric',
  })
  return `Cliente desde ${formatted}`
}

// ─── Loyalty progress visual ──────────────────────────────────────────────────

/**
 * Renders numbered circles representing the loyalty cycle.
 * Positions up to free_at (default 6) are shown.
 * Completed positions are filled; next position is highlighted; rest are empty.
 */
function LoyaltyProgress({
  cycleCount,
  config,
}: {
  cycleCount: number
  config: LoyaltyConfig
}) {
  const steps = Array.from({ length: config.free_at }, (_, i) => i + 1)

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Progreso de fidelidad">
      {steps.map((step) => {
        const isCompleted = step <= cycleCount
        const isNext = step === cycleCount + 1
        const isDiscount = step === config.discount_at
        const isFree = step === config.free_at

        let circleClass =
          'flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-colors'

        if (isCompleted) {
          circleClass += ' bg-gray-900 text-white'
        } else if (isNext) {
          circleClass += ' ring-2 ring-gray-900 bg-white text-gray-900'
        } else {
          circleClass += ' bg-gray-100 text-gray-400'
        }

        return (
          <div key={step} className="flex flex-col items-center gap-0.5">
            <div className={circleClass} aria-label={`Corte ${step}`}>
              {step}
            </div>
            {(isDiscount || isFree) && (
              <span className="text-[10px] font-medium leading-none text-gray-500">
                {isFree ? 'gratis' : `${config.discount_pct}%`}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function fetchClientDetail(id: string): Promise<ClientDetail | null> {
  const service = createServiceClient()
  const { data, error } = await service
    .from('clients')
    .select('id, name, phone, created_at')
    .eq('id', id)
    .eq('tenant_id', TENANT_ID)
    .single<ClientDetail>()

  if (error || !data) return null
  return data
}

async function fetchCutHistory(clientId: string): Promise<CutHistoryRow[]> {
  const service = createServiceClient()
  const { data, error } = await service
    .from('cuts')
    .select(
      `
      id,
      price_charged,
      loyalty_discount_applied,
      created_at,
      services ( name, price_ars )
    `,
    )
    .eq('tenant_id', TENANT_ID)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .returns<CutHistoryRow[]>()

  if (error) {
    console.error('[ClientProfilePage] fetchCutHistory error:', error)
    return []
  }

  return data ?? []
}

/**
 * Computes the current loyalty cycle count by counting cut_completed events
 * after the last cycle_reset. Matches the same logic used in complete_cut RPC.
 */
async function fetchLoyaltyCycleCount(clientId: string): Promise<number> {
  const service = createServiceClient()

  // Find the most recent cycle_reset for this client
  const { data: lastReset } = await service
    .from('loyalty_ledger')
    .select('created_at')
    .eq('tenant_id', TENANT_ID)
    .eq('client_id', clientId)
    .eq('event', 'cycle_reset')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<{ created_at: string }>()

  // Count cut_completed events after that reset (or all time if no reset)
  let cycleQuery = service
    .from('loyalty_ledger')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', TENANT_ID)
    .eq('client_id', clientId)
    .eq('event', 'cut_completed')

  if (lastReset?.created_at) {
    cycleQuery = cycleQuery.gt('created_at', lastReset.created_at)
  }

  const { count } = await cycleQuery
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

export default async function ClientProfilePage({
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

  const [client, loyaltyConfig] = await Promise.all([
    fetchClientDetail(params.id),
    fetchLoyaltyConfig(),
  ])

  if (!client) notFound()

  const [cuts, cycleCount] = await Promise.all([
    fetchCutHistory(client.id),
    fetchLoyaltyCycleCount(client.id),
  ])

  const loyaltyLabel = getLoyaltyStatusLabel(cycleCount, loyaltyConfig)

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      {/* Back link */}
      <Link
        href="/clientes"
        className="mb-4 inline-flex min-h-[44px] items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900"
      >
        ‹ Clientes
      </Link>

      {/* ── Header card ─────────────────────────────────────────────────── */}
      <div className="mb-4 rounded-2xl bg-white px-5 py-5 shadow-sm ring-1 ring-gray-200">
        {/* Avatar + name + phone */}
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gray-900 text-xl font-bold text-white">
            {client.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-gray-900">
              {client.name}
            </h1>
            {/* Phone is read-only per CC-3 — displayed but not editable */}
            <p className="mt-0.5 text-sm text-gray-500">
              {formatPhone(client.phone)}
            </p>
            <p className="mt-0.5 text-xs text-gray-400">
              {formatMemberSince(client.created_at)}
            </p>
          </div>
        </div>

        {/* Total cuts */}
        <div className="mt-4 flex items-center gap-2">
          <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
            {cuts.length} {cuts.length === 1 ? 'corte en total' : 'cortes en total'}
          </span>
        </div>
      </div>

      {/* ── Loyalty card ────────────────────────────────────────────────── */}
      <div className="mb-4 rounded-2xl bg-white px-5 py-5 shadow-sm ring-1 ring-gray-200">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Fidelidad
            </p>
            <p className="mt-0.5 text-sm font-semibold text-gray-900">
              {loyaltyLabel}
            </p>
            <p className="text-xs text-gray-400">
              {cycleCount} de {loyaltyConfig.free_at} en el ciclo actual
            </p>
          </div>
        </div>

        {/* Progress circles */}
        <LoyaltyProgress cycleCount={cycleCount} config={loyaltyConfig} />

        {/* Contextual tip for Leo to share with the client */}
        {cycleCount > 0 && cycleCount < loyaltyConfig.free_at && (
          <p className="mt-3 text-xs text-gray-400">
            {loyaltyConfig.free_at - cycleCount === 1
              ? '¡Le falta 1 corte para el gratis!'
              : `Le faltan ${loyaltyConfig.free_at - cycleCount} cortes para el gratis.`}
          </p>
        )}
      </div>

      {/* ── Cut history ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">
            Historial de cortes
          </h2>
        </div>

        {cuts.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-gray-400">Sin cortes registrados aún.</p>
          </div>
        ) : (
          <ul aria-label="Historial de cortes">
            {cuts.map((cut, index) => {
              const isLast = index === cuts.length - 1
              const isFree = cut.price_charged === 0
              const hasDiscount = cut.loyalty_discount_applied && !isFree

              return (
                <li
                  key={cut.id}
                  className={[
                    'flex items-start justify-between gap-3 px-5 py-4',
                    !isLast ? 'border-b border-gray-100' : '',
                  ].join(' ')}
                >
                  {/* Date + service */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {cut.services?.name ?? 'Corte'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatDateSpanish(cut.created_at)}
                    </p>
                  </div>

                  {/* Price + badges */}
                  <div className="shrink-0 text-right">
                    <p
                      className={[
                        'text-sm font-semibold',
                        isFree ? 'text-green-600' : 'text-gray-900',
                      ].join(' ')}
                    >
                      {formatARS(Number(cut.price_charged))}
                    </p>
                    {isFree && (
                      <span className="mt-0.5 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
                        Gratis
                      </span>
                    )}
                    {hasDiscount && (
                      <span className="mt-0.5 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                        Descuento
                      </span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
