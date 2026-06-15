import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { TENANT_ID } from '@/lib/tenant'

export const dynamic = 'force-dynamic'

/**
 * GET /api/blocked-dates
 * Public — returns blocked date strings (YYYY-MM-DD) for the next 90 days.
 * Used by the booking calendar to gray out unavailable dates.
 */
export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const today = new Date().toISOString().slice(0, 10)
  const in90 = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('blocked_dates')
    .select('date')
    .eq('tenant_id', TENANT_ID)
    .gte('date', today)
    .lte('date', in90)
    .order('date')

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch blocked dates' }, { status: 500 })
  }

  const dates: string[] = (data ?? []).map((r: { date: string }) => r.date)
  return NextResponse.json({ dates })
}
