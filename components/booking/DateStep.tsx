'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type TenantConfig = {
  booking_mode: 'request' | 'slots'
  available_days: number
}

const REQUEST_TIME_OPTIONS: string[] = []
for (let h = 9; h <= 19; h++) {
  REQUEST_TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:00`)
}

/**
 * Returns true if the given Date falls on an enabled day per the bitmask.
 * Bitmask: bit 1 = Monday, bit 2 = Tuesday, ..., bit 6 = Saturday, bit 7 = Sunday
 * JavaScript getDay(): 0=Sunday, 1=Monday, ..., 6=Saturday
 */
function isDayEnabled(date: Date, bitmask: number): boolean {
  const jsDay = date.getDay() // 0=Sun, 1=Mon, ..., 6=Sat
  // Map JS day to bitmask bit position (bit 1 = Mon = jsDay 1, ..., bit 6 = Sat = jsDay 6, bit 7 = Sun = jsDay 0)
  const bitPos = jsDay === 0 ? 7 : jsDay
  return (bitmask & (1 << (bitPos - 1))) !== 0
}

function toLocalDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

type DateStepProps = {
  serviceId: string
}

/**
 * Step 2: Date + time/slot picker.
 *
 * Mode A (request): Shows a date picker + approximate time select.
 * Mode B (slots): Shows a date picker → fetches available slots → shows slot buttons.
 *
 * On selection → navigates to /book?step=client&service=<id>&date=<date>&time=<HH:MM>
 */
export function DateStep({ serviceId }: DateStepProps) {
  const router = useRouter()
  const [tenantConfig, setTenantConfig] = useState<TenantConfig | null>(null)
  const [configError, setConfigError] = useState<string | null>(null)

  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedTime, setSelectedTime] = useState<string>('')

  const [slots, setSlots] = useState<string[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slotsError, setSlotsError] = useState<string | null>(null)

  // Fetch tenant config on mount
  useEffect(() => {
    fetch('/api/tenant')
      .then((r) => r.json())
      .then((data: TenantConfig & { error?: string }) => {
        if (data.error) throw new Error(data.error)
        setTenantConfig(data)
      })
      .catch(() => setConfigError('No se pudo cargar la configuración. Intentá de nuevo.'))
  }, [])

  // Fetch slots when date changes (Mode B only)
  useEffect(() => {
    if (!selectedDate || tenantConfig?.booking_mode !== 'slots') return
    setSlotsLoading(true)
    setSlotsError(null)
    setSlots([])
    setSelectedTime('')

    fetch(`/api/slots?date=${selectedDate}`)
      .then((r) => r.json())
      .then((data: { slots?: string[]; error?: string }) => {
        if (data.error) throw new Error(data.error)
        setSlots(data.slots ?? [])
      })
      .catch(() => setSlotsError('No se pudieron cargar los turnos. Intentá de nuevo.'))
      .finally(() => setSlotsLoading(false))
  }, [selectedDate, tenantConfig?.booking_mode])

  function handleContinue() {
    if (!selectedDate || !selectedTime) return
    router.push(
      `/book?step=client&service=${serviceId}&date=${selectedDate}&time=${encodeURIComponent(selectedTime)}`,
    )
  }

  // Compute min/max date for the native date input
  const today = new Date()
  const minDate = toLocalDateString(today)
  // Allow up to 60 days ahead
  const maxDateObj = new Date(today)
  maxDateObj.setDate(maxDateObj.getDate() + 60)
  const maxDate = toLocalDateString(maxDateObj)

  function isDateDisabled(dateStr: string): boolean {
    if (!tenantConfig) return true
    const [y, m, d] = dateStr.split('-').map(Number)
    const dt = new Date(y, m - 1, d)
    return !isDayEnabled(dt, tenantConfig.available_days)
  }

  if (configError) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <p className="rounded-xl bg-red-50 p-4 text-center text-red-600">{configError}</p>
      </div>
    )
  }

  if (!tenantConfig) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <div className="space-y-4" role="status" aria-label="Cargando">
          <div className="h-8 w-40 animate-pulse rounded bg-gray-200" />
          <div className="h-12 animate-pulse rounded-xl bg-gray-200" />
        </div>
      </div>
    )
  }

  const canContinue = !!selectedDate && !!selectedTime

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <button
        onClick={() => router.push('/book')}
        className="mb-6 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
        aria-label="Volver a servicios"
      >
        ← Volver
      </button>

      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Elegí fecha y hora</h1>
        <p className="mt-1 text-gray-500">
          {tenantConfig.booking_mode === 'slots'
            ? 'Seleccioná el turno disponible que más te convenga'
            : 'Elegí el día y el horario aproximado'}
        </p>
      </header>

      {/* Date picker */}
      <section className="mb-6">
        <label htmlFor="booking-date" className="mb-2 block text-sm font-medium text-gray-700">
          Fecha
        </label>
        <input
          id="booking-date"
          type="date"
          min={minDate}
          max={maxDate}
          value={selectedDate}
          onChange={(e) => {
            const val = e.target.value
            if (val && isDateDisabled(val)) return
            setSelectedDate(val)
          }}
          className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-gray-900 shadow-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
          aria-describedby="date-hint"
        />
        <p id="date-hint" className="mt-1 text-xs text-gray-400">
          Días disponibles: lunes a sábado
        </p>
      </section>

      {/* Mode A: approximate time select */}
      {tenantConfig.booking_mode === 'request' && selectedDate && (
        <section className="mb-8">
          <label htmlFor="booking-time" className="mb-2 block text-sm font-medium text-gray-700">
            Horario aproximado
          </label>
          <select
            id="booking-time"
            value={selectedTime}
            onChange={(e) => setSelectedTime(e.target.value)}
            className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-gray-900 shadow-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            <option value="">Elegí un horario</option>
            {REQUEST_TIME_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-400">
            Leo va a confirmar tu turno en breve.
          </p>
        </section>
      )}

      {/* Mode B: slot buttons */}
      {tenantConfig.booking_mode === 'slots' && selectedDate && (
        <section className="mb-8">
          <p className="mb-3 text-sm font-medium text-gray-700">Turnos disponibles</p>

          {slotsLoading && (
            <div className="grid grid-cols-3 gap-2" role="status" aria-label="Cargando turnos">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-xl bg-gray-200" />
              ))}
            </div>
          )}

          {slotsError && (
            <p className="rounded-xl bg-red-50 p-3 text-center text-sm text-red-600">{slotsError}</p>
          )}

          {!slotsLoading && !slotsError && slots.length === 0 && (
            <p className="rounded-xl bg-yellow-50 p-4 text-center text-sm text-yellow-700">
              No hay turnos disponibles para esta fecha. Probá con otro día.
            </p>
          )}

          {!slotsLoading && !slotsError && slots.length > 0 && (
            <div className="grid grid-cols-3 gap-2" role="group" aria-label="Turnos disponibles">
              {slots.map((slot) => (
                <button
                  key={slot}
                  onClick={() => setSelectedTime(slot)}
                  aria-pressed={selectedTime === slot}
                  className={`h-12 rounded-xl border text-sm font-medium transition-colors ${
                    selectedTime === slot
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 bg-white text-gray-900 hover:border-gray-400'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      <button
        onClick={handleContinue}
        disabled={!canContinue}
        className="h-14 w-full rounded-xl bg-gray-900 text-base font-semibold text-white transition-opacity disabled:opacity-40"
      >
        Continuar
      </button>
    </div>
  )
}
