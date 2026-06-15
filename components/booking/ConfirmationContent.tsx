'use client'

import { useSearchParams, useRouter } from 'next/navigation'

function formatReadableDate(isoString: string): string {
  try {
    const d = new Date(isoString)
    return d.toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'America/Argentina/Buenos_Aires',
    })
  } catch {
    return isoString
  }
}

function formatTime(isoString: string): string {
  try {
    const d = new Date(isoString)
    return d.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'America/Argentina/Buenos_Aires',
    })
  } catch {
    return ''
  }
}

export function ConfirmationContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const serviceName = searchParams.get('service_name') ?? ''
  const startsAt = searchParams.get('starts_at') ?? ''
  const clientName = searchParams.get('client_name') ?? ''
  const loyaltyLabel = searchParams.get('loyalty_label') ?? ''
  const status = searchParams.get('status') ?? 'active'

  const displayDate = formatReadableDate(startsAt)
  const displayTime = formatTime(startsAt)

  const isPending = status === 'pending'

  if (!serviceName && !startsAt) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8 text-center">
        <p className="text-gray-500">No hay información de turno disponible.</p>
        <button
          onClick={() => router.push('/book')}
          className="mt-4 h-12 rounded-xl bg-gray-900 px-6 text-sm font-semibold text-white"
        >
          Reservar turno
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      {/* Success icon */}
      <div className="mb-6 flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-8 w-8 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>

      <h1 className="mb-2 text-center text-2xl font-bold text-gray-900">
        {isPending ? 'Solicitud enviada' : 'Turno confirmado'}
      </h1>

      {isPending && (
        <p className="mb-6 text-center text-sm text-gray-500">
          Te van a confirmar el turno en breve.
        </p>
      )}

      {/* Booking details card */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <dl className="space-y-4">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Servicio</dt>
            <dd className="mt-0.5 text-base font-semibold text-gray-900">{serviceName}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Fecha</dt>
            <dd className="mt-0.5 text-base font-semibold text-gray-900 capitalize">{displayDate}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Hora</dt>
            <dd className="mt-0.5 text-base font-semibold text-gray-900">{displayTime}</dd>
          </div>
          {clientName && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Nombre</dt>
              <dd className="mt-0.5 text-base font-semibold text-gray-900">{clientName}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Loyalty status */}
      {loyaltyLabel && (
        <div className="mb-6 rounded-xl bg-amber-50 px-4 py-3 text-center">
          <p className="text-sm font-medium text-amber-800">{loyaltyLabel}</p>
        </div>
      )}

      <button
        onClick={() => router.push('/book')}
        className="h-14 w-full rounded-xl bg-gray-900 text-base font-semibold text-white transition-opacity hover:opacity-90"
      >
        Volver al inicio
      </button>
    </div>
  )
}
