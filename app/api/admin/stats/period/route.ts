import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { TENANT_ID } from '@/lib/tenant'

export const dynamic = 'force-dynamic'

function getWeekRange(offset: number): { start: Date; end: Date; startStr: string; endStr: string; label: string } {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }))
  const day = now.getDay()
  const daysToMon = day === 0 ? -6 : 1 - day
  const mon = new Date(now)
  mon.setDate(now.getDate() + daysToMon + offset * 7)
  mon.setHours(0, 0, 0, 0)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  sun.setHours(23, 59, 59, 999)

  const fmt = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
  const label = offset === 0 ? `Esta semana ${fmt(mon)} – ${fmt(sun)}` : `Semana ${fmt(mon)} – ${fmt(sun)}`

  return { start: mon, end: sun, startStr: fmt(mon), endStr: fmt(sun), label }
}

function getMonthRange(offset: number): { start: Date; end: Date; label: string; shortLabel: string } {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }))
  const year = now.getFullYear()
  const month = now.getMonth() + offset
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999)

  const monthName = start.toLocaleDateString('es-AR', { month: 'long' })
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  const label = offset === 0 ? `Este mes ${cap(monthName)}` : cap(monthName) + ` ${start.getFullYear()}`
  return { start, end, label, shortLabel: cap(monthName) }
}

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') ?? 'week'
  const offset = parseInt(searchParams.get('offset') ?? '0')

  const range = type === 'week' ? getWeekRange(offset) : getMonthRange(offset)

  const service = createServiceClient()
  const { data } = await service
    .from('cuts')
    .select('price_charged')
    .eq('tenant_id', TENANT_ID)
    .gte('created_at', range.start.toISOString())
    .lte('created_at', range.end.toISOString())

  const cuts = data?.length ?? 0
  const revenue = data?.reduce((s, c) => s + (c.price_charged ?? 0), 0) ?? 0

  return NextResponse.json({ cuts, revenue, label: range.label })
}
