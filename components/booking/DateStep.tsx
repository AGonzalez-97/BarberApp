'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type TenantConfig = {
  booking_mode: 'request' | 'slots'
  available_days: number
}

type SlotStatus = {
  time: string
  available: boolean
}

type CalendarDay = {
  date: Date
  dateStr: string   // YYYY-MM-DD
  dayNum: number    // 1–31
  dayName: string   // "lun", "mar", …
  enabled: boolean
  isToday: boolean
}

const DAY_NAMES = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

function isDayEnabled(date: Date, bitmask: number): boolean {
  const jsDay = date.getDay()
  const bitPos = jsDay === 0 ? 7 : jsDay
  return (bitmask & (1 << (bitPos - 1))) !== 0
}

function toLocalDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function buildCalendarDays(bitmask: number, weeksAhead = 6): CalendarDay[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = toLocalDateString(today)

  const days: CalendarDay[] = []
  const cursor = new Date(today)

  // Start from the Monday of the current week
  const dow = cursor.getDay()
  const offsetToMon = dow === 0 ? -6 : 1 - dow
  cursor.setDate(cursor.getDate() + offsetToMon)

  const totalDays = weeksAhead * 7

  for (let i = 0; i < totalDays; i++) {
    const d = new Date(cursor)
    const dateStr = toLocalDateString(d)
    const isPast = d < today && dateStr !== todayStr
    days.push({
      date: d,
      dateStr,
      dayNum: d.getDate(),
      dayName: DAY_NAMES[d.getDay()],
      enabled: !isPast && isDayEnabled(d, bitmask),
      isToday: dateStr === todayStr,
    })
    cursor.setDate(cursor.getDate() + 1)
  }

  return days
}

type DateStepProps = {
  serviceId: string
}

export function DateStep({ serviceId }: DateStepProps) {
  const router = useRouter()
  const selectedRef = useRef<HTMLButtonElement | null>(null)

  const [tenantConfig, setTenantConfig] = useState<TenantConfig | null>(null)
  const [blockedDates, setBlockedDates] = useState<Set<string>>(new Set())
  const [configError, setConfigError] = useState<string | null>(null)

  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedTime, setSelectedTime] = useState<string>('')

  const [slots, setSlots] = useState<SlotStatus[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slotsError, setSlotsError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/tenant').then((r) => r.json()),
      fetch('/api/blocked-dates').then((r) => r.json()),
    ])
      .then(([tenant, blocked]: [TenantConfig & { error?: string }, { dates?: string[] }]) => {
        if (tenant.error) throw new Error(tenant.error)
        setTenantConfig(tenant)
        setBlockedDates(new Set(blocked.dates ?? []))
      })
      .catch(() => setConfigError('No se pudo cargar la configuración. Intentá de nuevo.'))
  }, [])

  useEffect(() => {
    if (!selectedDate) return
    setSlotsLoading(true)
    setSlotsError(null)
    setSlots([])
    setSelectedTime('')

    fetch(`/api/availability?date=${selectedDate}`)
      .then((r) => r.json())
      .then((data: { slots?: SlotStatus[]; error?: string }) => {
        if (data.error) throw new Error(data.error)
        setSlots(data.slots ?? [])
      })
      .catch(() => setSlotsError('No se pudo cargar la disponibilidad. Intentá de nuevo.'))
      .finally(() => setSlotsLoading(false))
  }, [selectedDate])

  // Scroll selected day into view
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [selectedDate])

  function handleContinue() {
    if (!selectedDate || !selectedTime) return
    router.push(
      `/book?step=client&service=${serviceId}&date=${selectedDate}&time=${encodeURIComponent(selectedTime)}`,
    )
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
          <div className="h-32 animate-pulse rounded-xl bg-gray-200" />
        </div>
      </div>
    )
  }

  const calDays = buildCalendarDays(tenantConfig.available_days, 6)
  const weeks: CalendarDay[][] = []
  for (let i = 0; i < calDays.length; i += 7) {
    weeks.push(calDays.slice(i, i + 7))
  }

  // Month label for display
  const displayDate = selectedDate
    ? (() => {
        const [y, m, d] = selectedDate.split('-').map(Number)
        const dt = new Date(y, m - 1, d)
        return `${DAY_NAMES[dt.getDay()]} ${d} de ${MONTH_NAMES[m - 1]}`
      })()
    : null

  const availableCount = slots.filter((s) => s.available).length
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

      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Elegí fecha y hora</h1>
        <p className="mt-1 text-gray-500">
          {tenantConfig.booking_mode === 'slots'
            ? 'Solo los turnos disponibles son seleccionables'
            : 'Leo va a confirmar tu turno en breve'}
        </p>
      </header>

      {/* ── Calendar ─────────────────────────────────────────────────────── */}
      <section className="mb-6">
        {/* Day-of-week header */}
        <div className="mb-1 grid grid-cols-7 text-center">
          {DAY_NAMES.map((d) => (
            <span key={d} className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
              {d}
            </span>
          ))}
        </div>

        {/* Week rows */}
        <div className="space-y-1">
          {weeks.map((week, wi) => {
            // Show month label at start of a new month within a week
            const firstEnabled = week.find((d) => d.date.getDate() === 1)
            return (
              <div key={wi}>
                {firstEnabled && (
                  <p className="mb-1 mt-2 text-xs font-semibold capitalize text-gray-500">
                    {MONTH_NAMES[firstEnabled.date.getMonth()]}
                  </p>
                )}
                <div className="grid grid-cols-7 gap-1">
                  {week.map((day) => {
                    const isSelected = selectedDate === day.dateStr
                    const isBlocked = blockedDates.has(day.dateStr)
                    const isAvailable = day.enabled && !isBlocked
                    return (
                      <button
                        key={day.dateStr}
                        ref={isSelected ? selectedRef : null}
                        onClick={() => isAvailable && setSelectedDate(day.dateStr)}
                        disabled={!isAvailable}
                        aria-pressed={isSelected}
                        aria-label={`${day.dayName} ${day.dayNum}${isBlocked ? ' — no disponible' : ''}`}
                        className={[
                          'flex h-10 w-full flex-col items-center justify-center rounded-xl text-sm font-medium transition-colors',
                          isSelected
                            ? 'bg-gray-900 text-white'
                            : day.isToday && isAvailable
                            ? 'ring-2 ring-gray-900 bg-white text-gray-900 hover:bg-gray-50'
                            : isAvailable
                            ? 'bg-white text-gray-900 hover:bg-gray-100 active:bg-gray-200'
                            : 'cursor-not-allowed bg-transparent text-gray-200',
                        ].join(' ')}
                      >
                        <span className="leading-none">{day.dayNum}</span>
                        {day.isToday && !isSelected && (
                          <span className="mt-0.5 h-1 w-1 rounded-full bg-gray-900" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Slot grid ────────────────────────────────────────────────────── */}
      {selectedDate && (
        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold capitalize text-gray-900">
              {displayDate}
            </p>
            {!slotsLoading && !slotsError && (
              <p className="text-xs text-gray-400">
                {availableCount === 0
                  ? 'Sin turnos disponibles'
                  : `${availableCount} disponible${availableCount !== 1 ? 's' : ''}`}
              </p>
            )}
          </div>

          {slotsLoading && (
            <div className="grid grid-cols-4 gap-2" role="status">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-200" />
              ))}
            </div>
          )}

          {slotsError && (
            <p className="rounded-xl bg-red-50 p-3 text-center text-sm text-red-600">{slotsError}</p>
          )}

          {!slotsLoading && !slotsError && slots.length > 0 && (
            <>
              <div className="grid grid-cols-4 gap-2" role="group" aria-label="Horarios">
                {slots.map((slot) => {
                  const isSelected = selectedTime === slot.time
                  const isDisabled = tenantConfig.booking_mode === 'slots' && !slot.available

                  return (
                    <button
                      key={slot.time}
                      onClick={() => !isDisabled && setSelectedTime(slot.time)}
                      disabled={isDisabled}
                      aria-pressed={isSelected}
                      className={[
                        'flex h-14 flex-col items-center justify-center rounded-xl border text-sm font-medium transition-colors',
                        isSelected
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : isDisabled
                          ? 'cursor-not-allowed border-gray-100 bg-gray-50 text-gray-300'
                          : slot.available
                          ? 'border-gray-200 bg-white text-gray-900 hover:border-gray-900 active:bg-gray-100'
                          : 'border-gray-100 bg-gray-50 text-gray-400',
                      ].join(' ')}
                    >
                      <span>{slot.time}</span>
                      {!slot.available && (
                        <span className="mt-0.5 text-[10px] font-normal leading-none">Ocupado</span>
                      )}
                    </button>
                  )
                })}
              </div>

              {tenantConfig.booking_mode === 'request' &&
                selectedTime &&
                !slots.find((s) => s.time === selectedTime)?.available && (
                  <p className="mt-3 rounded-xl bg-yellow-50 px-3 py-2 text-xs text-yellow-700">
                    Ese horario ya tiene un turno, pero podés pedirlo igual. Leo va a confirmar si hay lugar.
                  </p>
                )}

              {availableCount === 0 && tenantConfig.booking_mode === 'slots' && (
                <p className="mt-2 rounded-xl bg-yellow-50 p-4 text-center text-sm text-yellow-700">
                  No hay turnos disponibles para este día. Probá con otra fecha.
                </p>
              )}
            </>
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
