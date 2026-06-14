import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { TENANT_ID } from '@/lib/tenant'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'

interface CompleteRpcResult {
  cut_id: string
  price_charged: number
  is_free: boolean
  has_discount: boolean
  new_cycle_count: number
}

/**
 * POST /api/admin/appointments/[id]/complete
 *
 * Calls the complete_cut(p_booking_id, p_tenant_id) Postgres RPC via
 * the service-role client. The RPC is SECURITY DEFINER and handles
 * the full transaction: records the cut, applies loyalty discounts,
 * updates the ledger, and marks the booking as completed.
 *
 * Auth required. Returns 401 if the session is missing.
 *
 * Response:
 *   200 { cut_id, price_charged, is_free, has_discount, new_cycle_count }
 *   400 — booking not in 'confirmed' status (RPC raises exception)
 *   401 — unauthenticated
 *   404 — booking not found for this tenant
 *   500 — internal error
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  // Auth check — must have valid admin session
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const bookingId = params.id
  const service = createServiceClient()

  // Verify booking exists for this tenant before calling the RPC
  const { data: existing, error: fetchError } = await service
    .from('bookings')
    .select('id, status')
    .eq('id', bookingId)
    .eq('tenant_id', TENANT_ID)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Turno no encontrado' }, { status: 404 })
  }

  if (existing.status !== 'confirmed') {
    return NextResponse.json(
      {
        error: `Solo se pueden registrar cortes en turnos confirmados. Estado actual: "${existing.status}"`,
      },
      { status: 400 },
    )
  }

  // Call the complete_cut RPC via service role
  const { data: rpcData, error: rpcError } = await service.rpc('complete_cut', {
    p_booking_id: bookingId,
    p_tenant_id: TENANT_ID,
  })

  if (rpcError) {
    console.error('[POST /api/admin/appointments/[id]/complete] RPC error:', rpcError)

    // Surface meaningful errors from the RPC RAISE EXCEPTION
    const message = rpcError.message ?? 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }

  const result = rpcData as CompleteRpcResult

  revalidatePath('/turnos')
  revalidatePath('/dashboard')

  return NextResponse.json(result)
}
