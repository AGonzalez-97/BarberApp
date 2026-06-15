import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { TENANT_ID } from '@/lib/tenant'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const days = Math.min(parseInt(searchParams.get('days') ?? '30'), 90)

  const service = createServiceClient()
  const since = new Date()
  since.setDate(since.getDate() - days)
  since.setHours(0, 0, 0, 0)

  const { data, error } = await service
    .from('cuts')
    .select('created_at, price_charged, services ( name )')
    .eq('tenant_id', TENANT_ID)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[api/admin/stats/history] cuts query failed:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Group by date in Argentina timezone (UTC-3)
  const byDate: Record<string, { cuts: number; revenue: number }> = {}
  const byService: Record<string, number> = {}

  for (const cut of data ?? []) {
    const date = new Date(cut.created_at).toLocaleDateString('sv-SE', {
      timeZone: 'America/Argentina/Buenos_Aires',
    })
    if (!byDate[date]) byDate[date] = { cuts: 0, revenue: 0 }
    byDate[date].cuts++
    byDate[date].revenue += cut.price_charged ?? 0

    const svcName = (cut.services as unknown as { name: string } | null)?.name ?? 'Otro'
    byService[svcName] = (byService[svcName] ?? 0) + 1
  }

  // Fill missing days with zeros
  const daily = []
  for (let i = 0; i < days; i++) {
    const d = new Date(since)
    d.setDate(since.getDate() + i)
    const dateStr = d.toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' })
    const label = d.toLocaleDateString('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      day: 'numeric',
      month: 'short',
    })
    daily.push({
      date: dateStr,
      label,
      cuts: byDate[dateStr]?.cuts ?? 0,
      revenue: byDate[dateStr]?.revenue ?? 0,
    })
  }

  const services = Object.entries(byService)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  const totalCuts = (data ?? []).length
  const totalRevenue = (data ?? []).reduce((s, c) => s + (c.price_charged ?? 0), 0)
  const avgPerCut = totalCuts > 0 ? totalRevenue / totalCuts : 0

  return NextResponse.json({ daily, services, totalCuts, totalRevenue, avgPerCut })
}
