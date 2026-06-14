import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { TENANT_ID } from '@/lib/tenant'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/clients/[id]
 *
 * Returns a full client profile: client details, cut history (newest first),
 * and current loyalty cycle count.
 *
 * Auth required — returns 401 if the session is missing.
 * Returns 404 if the client does not belong to the tenant.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  // 1. Verify auth session
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = params

  // 2. Fetch client (service role — clients table is service_role only)
  const service = createServiceClient()

  const { data: client, error: clientError } = await service
    .from('clients')
    .select('id, name, phone, created_at')
    .eq('id', id)
    .eq('tenant_id', TENANT_ID)
    .single()

  if (clientError || !client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  // 3. Fetch cut history (newest first) with joined service name
  const { data: cuts, error: cutsError } = await service
    .from('cuts')
    .select(
      `
      id,
      price_charged,
      loyalty_discount_applied,
      created_at,
      services ( name, price_ars )
    `,
    )
    .eq('tenant_id', TENANT_ID)
    .eq('client_id', id)
    .order('created_at', { ascending: false })

  if (cutsError) {
    console.error('[GET /api/admin/clients/:id] cuts error:', cutsError)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  // 4. Compute current loyalty cycle count
  //    Count cut_completed events after the last cycle_reset (if any).
  const { data: lastReset } = await service
    .from('loyalty_ledger')
    .select('created_at')
    .eq('tenant_id', TENANT_ID)
    .eq('client_id', id)
    .eq('event', 'cycle_reset')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let cycleQuery = service
    .from('loyalty_ledger')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', TENANT_ID)
    .eq('client_id', id)
    .eq('event', 'cut_completed')

  if (lastReset?.created_at) {
    cycleQuery = cycleQuery.gt('created_at', lastReset.created_at)
  }

  const { count: current_cycle_count } = await cycleQuery

  // 5. Fetch loyalty config
  const { data: loyaltyConfig } = await service
    .from('loyalty_config')
    .select('discount_at, free_at, discount_pct, reset_on_redeem')
    .eq('tenant_id', TENANT_ID)
    .single()

  return NextResponse.json({
    client,
    cuts: cuts ?? [],
    loyalty: {
      current_cycle_count: current_cycle_count ?? 0,
      config: loyaltyConfig ?? {
        discount_at: 3,
        free_at: 6,
        discount_pct: 15,
        reset_on_redeem: true,
      },
    },
  })
}
