import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { TENANT_ID } from '@/lib/tenant'

// Always run at request time — reads from Supabase, never cacheable as static
export const dynamic = 'force-dynamic'

/**
 * GET /api/services
 * Public endpoint — no auth required.
 * Returns active services for the tenant, ordered by name.
 */
export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data, error } = await supabase
    .from('services')
    .select('id, name, price_ars, duration_minutes')
    .eq('tenant_id', TENANT_ID)
    .eq('is_active', true)
    .order('name')

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 })
  }

  return NextResponse.json({ services: data ?? [] })
}
