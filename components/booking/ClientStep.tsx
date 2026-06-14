'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type ClientStepProps = {
  serviceId: string
  date: string
  time: string
}

type BookingResult = {
  booking_id: string
  status: string
  service_name: string
  starts_at: string
  client_name: string
  loyalty_label: string
}

/**
 * Step 3: Client form + booking submission.
 *
 * Collects name and phone, POSTs to /api/bookings.
 * On success → navigates to /confirmation with booking data in URL params.
 */
export function ClientStep({ serviceId, date, time }: ClientStepProps) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: serviceId,
          date,
          time,
          name: name.trim(),
          phone: phone.trim(),
        }),
      })

      const data = (await res.json()) as BookingResult & { error?: string }

      if (!res.ok) {
        setError(data.error ?? 'Ocurrió un error. Intentá de nuevo.')
        return
      }

      // Navigate to confirmation screen with booking data as URL params
      const params = new URLSearchParams({
        booking_id: data.booking_id,
        service_name: data.service_name,
        starts_at: data.starts_at,
        client_name: data.client_name,
        loyalty_label: data.loyalty_label,
        status: data.status,
      })

      router.push(`/confirmation?${params.toString()}`)
    } catch {
      setError('No se pudo conectar con el servidor. Verificá tu conexión.')
    } finally {
      setLoading(false)
    }
  }

  // Format date for display: YYYY-MM-DD → "viernes 14 de junio"
  function formatDisplayDate(dateStr: string, timeStr: string): string {
    try {
      const [y, m, d] = dateStr.split('-').map(Number)
      const dt = new Date(y, m - 1, d)
      const dateLabel = dt.toLocaleDateString('es-AR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
      return `${dateLabel} a las ${timeStr}`
    } catch {
      return `${dateStr} ${timeStr}`
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <button
        onClick={() => router.push(`/book?step=date&service=${serviceId}`)}
        className="mb-6 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
        aria-label="Volver al selector de fecha"
      >
        ← Volver
      </button>

      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Tus datos</h1>
        <p className="mt-1 text-gray-500">{formatDisplayDate(date, time)}</p>
      </header>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div>
          <label htmlFor="client-name" className="mb-1.5 block text-sm font-medium text-gray-700">
            Nombre
          </label>
          <input
            id="client-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre"
            autoComplete="given-name"
            required
            minLength={2}
            maxLength={100}
            className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-gray-900 placeholder-gray-400 shadow-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>

        <div>
          <label htmlFor="client-phone" className="mb-1.5 block text-sm font-medium text-gray-700">
            Teléfono
          </label>
          <input
            id="client-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Ej: 1123456789"
            autoComplete="tel"
            required
            inputMode="numeric"
            className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-gray-900 placeholder-gray-400 shadow-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
          <p className="mt-1 text-xs text-gray-400">Solo el número, sin 0 ni 15</p>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-xl bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !name.trim() || !phone.trim()}
          className="h-14 w-full rounded-xl bg-gray-900 text-base font-semibold text-white transition-opacity disabled:opacity-40"
        >
          {loading ? 'Reservando...' : 'Confirmar turno'}
        </button>
      </form>
    </div>
  )
}
