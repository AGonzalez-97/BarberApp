import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { TENANT_ID } from '@/lib/tenant'

// Always run at request time — reads from Supabase, never cacheable as static
export const dynamic = 'force-dynamic'

/**
 * GET /api/tenant
 * Public endpoint — no auth required.
 * Returns the booking_mode and available_days bitmask for the tenant.
 */
export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data, error } = await supabase
    .from('tenants')
    .select('booking_mode, available_days')
    .eq('id', TENANT_ID)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  }

  return NextResponse.json({
    booking_mode: data.booking_mode as 'request' | 'slots',
    available_days: data.available_days as number,
  })
}
