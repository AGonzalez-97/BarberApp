import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { TENANT_ID } from '@/lib/tenant'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/appointments?date=YYYY-MM-DD
 *
 * Returns bookings for the given date (defaults to today) with joined
 * client and service data, ordered by starts_at ASC.
 *
 * Auth required — returns 401 if the session is missing.
 * Uses the service-role client to read bookings (RLS: service role only).
 */
export async function GET(request: NextRequest) {
  // 1. Verify auth session
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Parse date param (default to today in Buenos Aires)
  const { searchParams } = new URL(request.url)
  const dateParam = searchParams.get('date')

  const targetDate = dateParam ?? getTodayBuenosAires()

  // Validate format YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
    return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 })
  }

  // 3. Fetch with service role (bookings + clients + services are service-role only)
  const service = createServiceClient()

  const dayStart = `${targetDate}T00:00:00-03:00`
  const dayEnd = `${targetDate}T23:59:59-03:00`

  const { data, error } = await service
    .from('bookings')
    .select(
      `
      id,
      starts_at,
      ends_at,
      status,
      notes,
      clients ( id, name, phone ),
      services ( id, name, price_ars, duration_minutes )
    `,
    )
    .eq('tenant_id', TENANT_ID)
    .gte('starts_at', dayStart)
    .lte('starts_at', dayEnd)
    .order('starts_at', { ascending: true })

  if (error) {
    console.error('[GET /api/admin/appointments]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  return NextResponse.json({ date: targetDate, bookings: data ?? [] })
}

/**
 * Returns today's date as a YYYY-MM-DD string in America/Argentina/Buenos_Aires.
 */
function getTodayBuenosAires(): string {
  return new Date().toLocaleDateString('sv-SE', {
    timeZone: 'America/Argentina/Buenos_Aires',
  })
}
