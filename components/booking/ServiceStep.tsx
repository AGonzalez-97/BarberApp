'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type Service = {
  id: string
  name: string
  price_ars: number
  duration_minutes: number
}

function formatARS(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

/**
 * Step 1: Service selection.
 * Fetches active services and lets the user pick one.
 * On selection → navigates to /book?step=date&service=<id>
 */
export function ServiceStep() {
  const router = useRouter()
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/services')
      .then((r) => r.json())
      .then((data: { services?: Service[]; error?: string }) => {
        if (data.error) throw new Error(data.error)
        setServices(data.services ?? [])
      })
      .catch(() => setError('No se pudieron cargar los servicios. Intentá de nuevo.'))
      .finally(() => setLoading(false))
  }, [])

  function handleSelect(id: string) {
    router.push(`/book?step=date&service=${id}`)
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Reservar turno</h1>
        <p className="mt-1 text-gray-500">Elegí el servicio que querés</p>
      </header>

      {loading && (
        <div className="space-y-4" role="status" aria-label="Cargando servicios">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-200" />
          ))}
        </div>
      )}

      {error && (
        <p className="rounded-xl bg-red-50 p-4 text-center text-red-600">{error}</p>
      )}

      {!loading && !error && services.length === 0 && (
        <p className="rounded-xl bg-yellow-50 p-4 text-center text-yellow-700">
          No hay servicios disponibles por el momento.
        </p>
      )}

      {!loading && !error && services.length > 0 && (
        <ul className="space-y-3">
          {services.map((service) => (
            <li key={service.id}>
              <button
                onClick={() => handleSelect(service.id)}
                className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white p-5 text-left shadow-sm transition-colors hover:border-gray-900 hover:bg-gray-50 active:bg-gray-100"
                style={{ minHeight: '72px' }}
              >
                <div>
                  <span className="block text-lg font-semibold text-gray-900">{service.name}</span>
                  <span className="mt-0.5 block text-sm text-gray-500">
                    {formatDuration(service.duration_minutes)}
                  </span>
                </div>
                <span className="ml-4 shrink-0 text-lg font-bold text-gray-900">
                  {formatARS(service.price_ars)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
