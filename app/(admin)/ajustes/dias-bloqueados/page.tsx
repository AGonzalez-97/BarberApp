'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface BlockedDate {
  id: string
  date: string
  reason: string | null
}

const MONTH_NAMES = [
  'enero','febrero','marzo','abril','mayo','junio',
  'julio','agosto','septiembre','octubre','noviembre','diciembre',
]
const DAY_NAMES = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado']

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return `${DAY_NAMES[dt.getDay()]} ${d} de ${MONTH_NAMES[m - 1]} de ${y}`
}

export default function BlockedDatesPage() {
  const [dates, setDates] = useState<BlockedDate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [newDate, setNewDate] = useState('')
  const [newReason, setNewReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/blocked-dates')
      .then((r) => r.json())
      .then((data: { dates?: BlockedDate[] }) => setDates(data.dates ?? []))
      .catch(() => setError('No se pudieron cargar los días bloqueados.'))
      .finally(() => setLoading(false))
  }, [])

  async function handleAdd() {
    if (!newDate) return
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch('/api/admin/blocked-dates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: newDate, reason: newReason || undefined }),
      })
      const body = await res.json() as BlockedDate & { error?: string }
      if (!res.ok) throw new Error(body.error ?? 'Error al bloquear la fecha')
      setDates((prev) => [...prev, body].sort((a, b) => a.date.localeCompare(b.date)))
      setNewDate('')
      setNewReason('')
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(date: BlockedDate) {
    setDeletingId(date.id)
    try {
      await fetch(`/api/admin/blocked-dates?date=${date.date}`, { method: 'DELETE' })
      setDates((prev) => prev.filter((d) => d.id !== date.id))
    } catch {
      // silently ignore — user can retry
    } finally {
      setDeletingId(null)
    }
  }

  // Min date = today
  const today = new Date()
  const minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <Link
        href="/ajustes"
        className="mb-4 inline-flex min-h-[44px] items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900"
      >
        ‹ Ajustes
      </Link>

      <h1 className="mb-6 text-xl font-bold text-gray-900">Días bloqueados</h1>

      {/* ── Add date ──────────────────────────────────────────────────────── */}
      <div className="mb-6 rounded-2xl bg-white px-5 py-5 shadow-sm ring-1 ring-gray-200">
        <p className="mb-3 text-sm font-semibold text-gray-900">Bloquear un día</p>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Fecha</label>
            <input
              type="date"
              min={minDate}
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Motivo <span className="font-normal text-gray-400">(opcional)</span>
            </label>
            <input
              type="text"
              placeholder="Ej: Feriado, vacaciones…"
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          {saveError && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{saveError}</p>
          )}

          <button
            onClick={handleAdd}
            disabled={!newDate || saving}
            className="flex min-h-[44px] w-full items-center justify-center rounded-xl bg-gray-900 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
          >
            {saving ? 'Bloqueando…' : 'Bloquear fecha'}
          </button>
        </div>
      </div>

      {/* ── Blocked dates list ────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
        <div className="border-b border-gray-100 px-5 py-4">
          <p className="text-sm font-semibold text-gray-900">Días bloqueados</p>
        </div>

        {loading && (
          <div className="space-y-3 px-5 py-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-gray-100" />
            ))}
          </div>
        )}

        {error && (
          <p className="px-5 py-4 text-sm text-red-600">{error}</p>
        )}

        {!loading && !error && dates.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-gray-400">
            No hay días bloqueados.
          </p>
        )}

        {!loading && !error && dates.length > 0 && (
          <ul>
            {dates.map((d, i) => (
              <li
                key={d.id}
                className={[
                  'flex items-center justify-between gap-3 px-5 py-4',
                  i < dates.length - 1 ? 'border-b border-gray-100' : '',
                ].join(' ')}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium capitalize text-gray-900">
                    {formatDate(d.date)}
                  </p>
                  {d.reason && (
                    <p className="text-xs text-gray-400">{d.reason}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(d)}
                  disabled={deletingId === d.id}
                  className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-40"
                >
                  {deletingId === d.id ? '…' : 'Quitar'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
