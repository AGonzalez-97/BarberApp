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
  dateStr: string
  dayNum: number
  dayName: string
  enabled: boolean
  isToday: boolean
  outOfMonth: boolean
}

const DAY_NAMES = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'] // indexed by getDay() (0=sun)
const HEADER_DAYS = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'] // mon-first grid
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

function buildCalendarDays(bitmask: number): CalendarDay[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = toLocalDateString(today)

  const year = today.getFullYear()
  const month = today.getMonth()

  // Grid starts on the Monday of the week containing the 1st of the month
  const firstOfMonth = new Date(year, month, 1)
  const startDow = firstOfMonth.getDay()
  const startOffset = startDow === 0 ? -6 : 1 - startDow
  const gridStart = new Date(firstOfMonth)
  gridStart.setDate(firstOfMonth.getDate() + startOffset)

  // Grid ends on the Sunday of the week containing the last day of the month
  const lastOfMonth = new Date(year, month + 1, 0)
  const endDow = lastOfMonth.getDay()
  const endOffset = endDow === 0 ? 0 : 7 - endDow
  const gridEnd = new Date(lastOfMonth)
  gridEnd.setDate(lastOfMonth.getDate() + endOffset)

  const days: CalendarDay[] = []
  const cursor = new Date(gridStart)

  while (cursor <= gridEnd) {
    const d = new Date(cursor)
    const dateStr = toLocalDateString(d)
    const inCurrentMonth = d.getMonth() === month && d.getFullYear() === year
    const isPast = d < today && dateStr !== todayStr
    days.push({
      date: d,
      dateStr,
      dayNum: d.getDate(),
      dayName: DAY_NAMES[d.getDay()],
      enabled: inCurrentMonth && !isPast && isDayEnabled(d, bitmask),
      isToday: dateStr === todayStr,
      outOfMonth: !inCurrentMonth,
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
      <div className="min-h-screen bg-zinc-950 px-4 py-10">
        <div className="mx-auto max-w-lg">
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-center text-sm text-red-400">
            {configError}
          </div>
        </div>
      </div>
    )
  }

  if (!tenantConfig) {
    return (
      <div className="min-h-screen bg-zinc-950 px-4 py-10">
        <div className="mx-auto max-w-lg space-y-4" role="status" aria-label="Cargando">
          <div className="h-8 w-40 animate-pulse rounded-lg bg-zinc-800" />
          <div className="h-48 animate-pulse rounded-2xl bg-zinc-800" />
        </div>
      </div>
    )
  }

  const calDays = buildCalendarDays(tenantConfig.available_days)
  const weeks: CalendarDay[][] = []
  for (let i = 0; i < calDays.length; i += 7) {
    weeks.push(calDays.slice(i, i + 7))
  }

  const now = new Date()
  const currentMonthLabel =
    MONTH_NAMES[now.getMonth()].charAt(0).toUpperCase() +
    MONTH_NAMES[now.getMonth()].slice(1) +
    ' ' +
    now.getFullYear()

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
    <div className="min-h-screen bg-zinc-950 px-4 py-10">
      <div className="mx-auto max-w-lg">
        <button
          onClick={() => router.push('/book')}
          className="mb-8 flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-white"
          aria-label="Volver a servicios"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Volver
        </button>

        <h1 className="text-3xl font-black text-white">Elegí fecha y hora</h1>
        <p className="mt-1 text-zinc-400">
          {tenantConfig.booking_mode === 'slots'
            ? 'Solo los turnos disponibles son seleccionables'
            : 'Te vamos a confirmar el turno en breve'}
        </p>

        {/* ── Calendar ─────────────────────────────────────────────────────── */}
        <section className="mt-8 mb-6">
          <p className="mb-3 text-sm font-semibold text-zinc-300">{currentMonthLabel}</p>

          <div className="mb-2 grid grid-cols-7 text-center">
            {HEADER_DAYS.map((d) => (
              <span key={d} className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600">
                {d}
              </span>
            ))}
          </div>

          <div className="space-y-1">
            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 gap-1">
                {week.map((day) => {
                  if (day.outOfMonth) {
                    return <div key={day.dateStr} className="h-10" />
                  }
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
                        'flex h-10 w-full flex-col items-center justify-center rounded-xl text-sm font-medium transition-all',
                        isSelected
                          ? 'bg-amber-400 text-zinc-900 font-bold'
                          : day.isToday && isAvailable
                          ? 'bg-zinc-900 text-white ring-2 ring-amber-400/60 hover:bg-zinc-800'
                          : isAvailable
                          ? 'bg-zinc-900 text-white hover:bg-zinc-800 active:bg-zinc-700'
                          : 'cursor-not-allowed bg-transparent text-zinc-700',
                      ].join(' ')}
                    >
                      <span className="leading-none">{day.dayNum}</span>
                      {day.isToday && !isSelected && (
                        <span className="mt-0.5 h-1 w-1 rounded-full bg-amber-400" />
                      )}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </section>

        {/* ── Slot grid ────────────────────────────────────────────────────── */}
        {selectedDate && (
          <section className="mb-8">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold capitalize text-white">
                {displayDate}
              </p>
              {!slotsLoading && !slotsError && (
                <p className="text-xs text-zinc-500">
                  {availableCount === 0
                    ? 'Sin turnos disponibles'
                    : `${availableCount} disponible${availableCount !== 1 ? 's' : ''}`}
                </p>
              )}
            </div>

            {slotsLoading && (
              <div className="grid grid-cols-4 gap-2" role="status">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-xl bg-zinc-800" />
                ))}
              </div>
            )}

            {slotsError && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-center text-sm text-red-400">
                {slotsError}
              </div>
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
                          'flex h-14 flex-col items-center justify-center rounded-xl border text-sm font-medium transition-all',
                          isSelected
                            ? 'border-amber-400 bg-amber-400 text-zinc-900 font-bold'
                            : isDisabled
                            ? 'cursor-not-allowed border-zinc-800 bg-zinc-900/50 text-zinc-700'
                            : slot.available
                            ? 'border-zinc-700 bg-zinc-900 text-white hover:border-amber-400/50 hover:bg-zinc-800 active:bg-zinc-700'
                            : 'border-zinc-800 bg-zinc-900/50 text-zinc-600',
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
                    <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-300">
                      Ese horario ya tiene un turno, pero podés pedirlo igual. Te confirmamos si hay lugar.
                    </div>
                  )}

                {availableCount === 0 && tenantConfig.booking_mode === 'slots' && (
                  <div className="mt-2 rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-center text-sm text-zinc-400">
                    No hay turnos disponibles para este día. Probá con otra fecha.
                  </div>
                )}
              </>
            )}
          </section>
        )}

        <button
          onClick={handleContinue}
          disabled={!canContinue}
          className="h-14 w-full rounded-xl bg-amber-400 text-base font-bold text-zinc-900 transition-all hover:bg-amber-300 active:scale-[0.98] disabled:opacity-30"
        >
          Continuar
        </button>
      </div>
    </div>
  )
}
