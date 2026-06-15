export type DailyPoint = { date: string; label: string; cuts: number; revenue: number }

const DEMO_BASE = new Date('2026-06-15')

function seededRand(seed: number): number {
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x)
}

export function generateDemoDailyData(days: number): DailyPoint[] {
  const BASE_CUTS = 7
  const BASE_PRICE = 9000
  const daily: DailyPoint[] = []

  for (let i = 0; i < days; i++) {
    const d = new Date(DEMO_BASE)
    d.setDate(DEMO_BASE.getDate() - (days - 1 - i))
    const dow = d.getDay()
    const isWeekend = dow === 0 || dow === 6
    const trend = 1 + (i / days) * 0.35
    const cuts = Math.round((BASE_CUTS + seededRand(i) * 5) * (isWeekend ? 0.4 : 1) * trend)
    const revenue = Math.round(cuts * BASE_PRICE * (0.9 + seededRand(i + 100) * 0.2))
    const label = d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
    daily.push({ date: d.toISOString().slice(0, 10), label, cuts, revenue })
  }

  return daily
}

function demoWeekRange(offset: number): { startStr: string; endStr: string; label: string } {
  const now = new Date(DEMO_BASE)
  const day = now.getDay()
  const daysToMon = day === 0 ? -6 : 1 - day
  const mon = new Date(now)
  mon.setDate(now.getDate() + daysToMon + offset * 7)
  mon.setHours(0, 0, 0, 0)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  const fmt = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
  const label = offset === 0 ? `Esta semana ${fmt(mon)} – ${fmt(sun)}` : `Semana ${fmt(mon)} – ${fmt(sun)}`
  return { startStr: mon.toISOString().slice(0, 10), endStr: sun.toISOString().slice(0, 10), label }
}

function demoMonthRange(offset: number): { startStr: string; endStr: string; label: string } {
  const year = DEMO_BASE.getFullYear()
  const month = DEMO_BASE.getMonth() + offset
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0)
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  const monthName = cap(start.toLocaleDateString('es-AR', { month: 'long' }))
  const label = offset === 0 ? `Este mes ${monthName}` : `${monthName} ${start.getFullYear()}`
  return { startStr: start.toISOString().slice(0, 10), endStr: end.toISOString().slice(0, 10), label }
}

export function getDemoPeriodStats(
  type: 'week' | 'month',
  offset: number,
): { cuts: number; revenue: number; label: string } {
  const all = generateDemoDailyData(90)
  const byDate: Record<string, { cuts: number; revenue: number }> = {}
  for (const d of all) byDate[d.date] = { cuts: d.cuts, revenue: d.revenue }

  const range = type === 'week' ? demoWeekRange(offset) : demoMonthRange(offset)

  let cuts = 0
  let revenue = 0
  for (const [dateStr, v] of Object.entries(byDate)) {
    if (dateStr >= range.startStr && dateStr <= range.endStr) {
      cuts += v.cuts
      revenue += v.revenue
    }
  }

  return { cuts, revenue, label: range.label }
}
