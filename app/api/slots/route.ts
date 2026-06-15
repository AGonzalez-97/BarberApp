import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { TENANT_ID } from '@/lib/tenant'

// Always run at request time — depends on query params and DB state
export const dynamic = 'force-dynamic'

/**
 * GET /api/slots?date=YYYY-MM-DD
 * Public endpoint — no auth required.
 * Calls get_available_slots RPC and returns available time strings.
 */
export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get('date')

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Missing or invalid date parameter (expected YYYY-MM-DD)' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data, error } = await supabase.rpc('get_available_slots', {
    p_tenant_id: TENANT_ID,
    p_date: date,
  })

  if (error) {
    console.error('[api/slots] get_available_slots RPC failed:', error.message)
    return NextResponse.json({ error: 'Failed to fetch available slots' }, { status: 500 })
  }

  // RPC returns rows with slot_time (timestamptz)
  // Convert to HH:MM strings for the client
  const slots: string[] = (data ?? []).map((row: { slot_time: string }) => {
    const d = new Date(row.slot_time)
    const hh = String(d.getUTCHours()).padStart(2, '0')
    const mm = String(d.getUTCMinutes()).padStart(2, '0')
    return `${hh}:${mm}`
  })

  return NextResponse.json({ slots })
}
