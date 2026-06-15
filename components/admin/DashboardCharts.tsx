'use client'

import { useEffect, useState } from 'react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

type DailyPoint = { date: string; label: string; cuts: number; revenue: number }
type ServiceCount = { name: string; count: number }

type HistoryData = {
  daily: DailyPoint[]
  services: ServiceCount[]
  totalCuts: number
  totalRevenue: number
  avgPerCut: number
}

const PERIODS = [
  { label: '7 días', days: 7 },
  { label: '30 días', days: 30 },
  { label: '90 días', days: 90 },
]

function formatARS(v: number): string {
  return '$' + Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

// biome-ignore lint: recharts formatter type is loose
// eslint-disable-next-line
function formatTooltipRevenue(value: unknown) {
  return [formatARS(Number(value ?? 0)), 'Ingresos'] as [string, string]
}

// biome-ignore lint: recharts formatter type is loose
// eslint-disable-next-line
function formatTooltipCuts(value: unknown) {
  return [String(value ?? 0), 'Cortes'] as [string, string]
}

export default function DashboardCharts() {
  const [days, setDays] = useState(30)
  const [data, setData] = useState<HistoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'cuts' | 'revenue'>('cuts')

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/stats/history?days=${days}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [days])

  return (
    <div className="space-y-6">
      {/* ── Summary cards ── */}
      {data && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white px-4 py-4 shadow-sm ring-1 ring-gray-200">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Cortes</p>
            <p className="mt-1 text-2xl font-black text-gray-900">{data.totalCuts}</p>
            <p className="text-xs text-gray-400">últimos {days} días</p>
          </div>
          <div className="rounded-2xl bg-white px-4 py-4 shadow-sm ring-1 ring-gray-200">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Ingresos</p>
            <p className="mt-1 text-2xl font-black text-gray-900">{formatARS(data.totalRevenue)}</p>
            <p className="text-xs text-gray-400">últimos {days} días</p>
          </div>
          <div className="rounded-2xl bg-white px-4 py-4 shadow-sm ring-1 ring-gray-200">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Promedio</p>
            <p className="mt-1 text-2xl font-black text-gray-900">{formatARS(data.avgPerCut)}</p>
            <p className="text-xs text-gray-400">por corte</p>
          </div>
        </div>
      )}

      {/* ── Chart card ── */}
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
        {/* Header with filters */}
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
          <div className="flex gap-1">
            <button
              onClick={() => setTab('cuts')}
              className={['rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors', tab === 'cuts' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'].join(' ')}
            >
              Cortes
            </button>
            <button
              onClick={() => setTab('revenue')}
              className={['rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors', tab === 'revenue' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'].join(' ')}
            >
              Ingresos
            </button>
          </div>
          <div className="flex gap-1">
            {PERIODS.map((p) => (
              <button
                key={p.days}
                onClick={() => setDays(p.days)}
                className={['rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors', days === p.days ? 'bg-amber-400 text-zinc-900' : 'text-gray-500 hover:bg-gray-100'].join(' ')}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 py-4">
          {loading ? (
            <div className="flex h-48 items-center justify-center text-sm text-gray-400">Cargando...</div>
          ) : !data || data.daily.every(d => d.cuts === 0) ? (
            <div className="flex h-48 items-center justify-center text-sm text-gray-400">Sin datos para este período</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              {tab === 'cuts' ? (
                <BarChart data={data.daily} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} interval={days === 7 ? 0 : days === 30 ? 4 : 9} />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} allowDecimals={false} />
                  <Tooltip formatter={formatTooltipCuts} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="cuts" fill="#18181b" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <BarChart data={data.daily} margin={{ top: 4, right: 4, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} interval={days === 7 ? 0 : days === 30 ? 4 : 9} />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={(v) => '$' + (v / 1000).toFixed(0) + 'k'} />
                  <Tooltip formatter={formatTooltipRevenue} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="revenue" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Services breakdown ── */}
      {data && data.services.length > 0 && (
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
          <div className="border-b border-gray-100 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Servicios más pedidos</p>
          </div>
          <ul className="divide-y divide-gray-50 px-4">
            {data.services.map((s) => {
              const pct = data.totalCuts > 0 ? Math.round((s.count / data.totalCuts) * 100) : 0
              return (
                <li key={s.name} className="flex items-center gap-3 py-3">
                  <span className="min-w-0 flex-1 text-sm font-medium text-gray-900 truncate">{s.name}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-8 text-right text-xs text-gray-400">{s.count}</span>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
