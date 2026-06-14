'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getLoyaltyStatusLabel } from '@/lib/loyalty'
import type { LoyaltyConfig } from '@/lib/loyalty'

// ─── Types ───────────────────────────────────────────────────────────────────

interface CompleteResult {
  cut_id: string
  price_charged: number
  is_free: boolean
  has_discount: boolean
  new_cycle_count: number
}

type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'

interface BookingActionsProps {
  bookingId: string
  status: BookingStatus
  loyaltyConfig: LoyaltyConfig
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatARS(value: number): string {
  if (value === 0) return '$0'
  return (
    '$' +
    Math.round(value)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * BookingActions — client component.
 *
 * Renders contextual action buttons based on booking status:
 *   - pending   → Confirmar / Rechazar
 *   - confirmed → Registrar corte
 *   - completed → shows the cut result (read-only)
 *
 * Design principles:
 *   - All buttons min 44×44px touch targets
 *   - Full-width, high contrast — readable in outdoor light
 *   - Destructive "Rechazar" has a two-tap confirmation (inline, no modal)
 *   - "Registrar corte" shows a spinner — the RPC takes a moment
 */
export default function BookingActions({
  bookingId,
  status,
  loyaltyConfig,
}: BookingActionsProps) {
  const router = useRouter()

  // Confirm / cancel state
  const [actionStatus, setActionStatus] = useState<BookingStatus>(status)
  const [isConfirming, setIsConfirming] = useState(false)
  const [cancelConfirmStep, setCancelConfirmStep] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)

  // Complete / register cut state
  const [isCompleting, setIsCompleting] = useState(false)
  const [completeResult, setCompleteResult] = useState<CompleteResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // ── Confirm action ─────────────────────────────────────────────────────────
  async function handleConfirm() {
    setIsConfirming(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/appointments/${bookingId}/confirm`, {
        method: 'POST',
      })
      if (!res.ok) {
        const body = await res.json() as { error?: string }
        throw new Error(body.error ?? 'Error al confirmar el turno')
      }
      setActionStatus('confirmed')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setIsConfirming(false)
    }
  }

  // ── Cancel action (two-tap confirm) ───────────────────────────────────────
  async function handleCancelFirstTap() {
    setCancelConfirmStep(true)
  }

  async function handleCancelConfirm() {
    setIsCancelling(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/appointments/${bookingId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) {
        const body = await res.json() as { error?: string }
        throw new Error(body.error ?? 'Error al rechazar el turno')
      }
      setActionStatus('cancelled')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setIsCancelling(false)
      setCancelConfirmStep(false)
    }
  }

  // ── Complete action (register cut) ────────────────────────────────────────
  async function handleComplete() {
    setIsCompleting(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/appointments/${bookingId}/complete`, {
        method: 'POST',
      })
      if (!res.ok) {
        const body = await res.json() as { error?: string }
        throw new Error(body.error ?? 'Error al registrar el corte')
      }
      const result = await res.json() as CompleteResult
      setCompleteResult(result)
      setActionStatus('completed')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setIsCompleting(false)
    }
  }

  // ── Render: completed state (post-cut result) ─────────────────────────────
  if (completeResult) {
    const newLoyaltyLabel = getLoyaltyStatusLabel(
      completeResult.new_cycle_count,
      loyaltyConfig,
    )

    return (
      <div className="space-y-4">
        {/* Success banner */}
        <div className="rounded-2xl bg-gray-900 p-5 text-white">
          {completeResult.is_free ? (
            <p className="text-2xl font-bold">¡Corte gratis! 🎉</p>
          ) : completeResult.has_discount ? (
            <p className="text-2xl font-bold">
              Descuento del 15% aplicado — {formatARS(completeResult.price_charged)}
            </p>
          ) : (
            <p className="text-2xl font-bold">
              Corte registrado — {formatARS(completeResult.price_charged)}
            </p>
          )}
          <p className="mt-2 text-sm text-gray-300">{newLoyaltyLabel}</p>
        </div>

        {/* Navigate to QR payment */}
        <a
          href={`/admin/qr/${completeResult.cut_id}`}
          className="flex min-h-[56px] w-full items-center justify-center rounded-2xl bg-gray-900 px-6 text-lg font-semibold text-white transition-opacity active:opacity-80"
        >
          Cobrar
        </a>
      </div>
    )
  }

  // ── Render: already completed / cancelled / no-show ───────────────────────
  if (
    actionStatus === 'completed' ||
    actionStatus === 'cancelled' ||
    actionStatus === 'no_show'
  ) {
    const statusLabel: Record<string, string> = {
      completed: 'Completado',
      cancelled: 'Cancelado',
      no_show: 'No asistió',
    }
    return (
      <div className="rounded-2xl bg-gray-100 p-4 text-center">
        <p className="text-sm font-medium text-gray-600">
          Estado: {statusLabel[actionStatus] ?? actionStatus}
        </p>
      </div>
    )
  }

  // ── Render: confirmed — show "Registrar corte" ────────────────────────────
  if (actionStatus === 'confirmed') {
    return (
      <div className="space-y-3">
        {error && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <button
          type="button"
          onClick={handleComplete}
          disabled={isCompleting}
          className="flex min-h-[56px] w-full items-center justify-center rounded-2xl bg-gray-900 px-6 text-lg font-semibold text-white transition-opacity disabled:opacity-60 active:opacity-80"
        >
          {isCompleting ? (
            <span className="flex items-center gap-2">
              <Spinner />
              Registrando…
            </span>
          ) : (
            'Registrar corte'
          )}
        </button>
      </div>
    )
  }

  // ── Render: pending — show Confirmar / Rechazar ───────────────────────────
  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Confirm */}
      <button
        type="button"
        onClick={handleConfirm}
        disabled={isConfirming || isCancelling}
        className="flex min-h-[56px] w-full items-center justify-center rounded-2xl bg-green-600 px-6 text-lg font-semibold text-white transition-opacity disabled:opacity-60 active:opacity-80"
      >
        {isConfirming ? (
          <span className="flex items-center gap-2">
            <Spinner />
            Confirmando…
          </span>
        ) : (
          'Confirmar turno'
        )}
      </button>

      {/* Cancel — two-tap confirm */}
      {cancelConfirmStep ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setCancelConfirmStep(false)}
            disabled={isCancelling}
            className="flex min-h-[56px] flex-1 items-center justify-center rounded-2xl border-2 border-gray-300 px-4 text-base font-medium text-gray-700 transition-opacity disabled:opacity-60 active:opacity-80"
          >
            No, volver
          </button>
          <button
            type="button"
            onClick={handleCancelConfirm}
            disabled={isCancelling}
            className="flex min-h-[56px] flex-1 items-center justify-center rounded-2xl bg-red-600 px-4 text-base font-semibold text-white transition-opacity disabled:opacity-60 active:opacity-80"
          >
            {isCancelling ? (
              <span className="flex items-center gap-2">
                <Spinner />
                Rechazando…
              </span>
            ) : (
              '¿Confirmás?'
            )}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleCancelFirstTap}
          disabled={isConfirming || isCancelling}
          className="flex min-h-[56px] w-full items-center justify-center rounded-2xl border-2 border-red-500 px-6 text-lg font-semibold text-red-600 transition-opacity disabled:opacity-60 active:opacity-80"
        >
          Rechazar turno
        </button>
      )}
    </div>
  )
}

// ─── Spinner ─────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg
      className="h-5 w-5 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}
