import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { TENANT_ID } from '@/lib/tenant'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/appointments/[id]/cancel
 *
 * Transitions a booking from 'pending' or 'confirmed' to 'cancelled'.
 * Auth required. Uses service role for the write.
 *
 * Body (optional): { reason?: string }
 *
 * Response:
 *   200 { booking }  — updated booking row
 *   400              — booking cannot be cancelled (already completed/cancelled)
 *   401              — unauthenticated
 *   404              — booking not found for this tenant
 *   500              — internal error
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  // Auth check
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const bookingId = params.id
  const service = createServiceClient()

  // Optional reason from body
  let reason: string | undefined
  try {
    const body = await request.json() as { reason?: string }
    reason = body.reason
  } catch {
    // Body is optional — ignore parse failures
  }

  // Verify booking exists and belongs to this tenant
  const { data: existing, error: fetchError } = await service
    .from('bookings')
    .select('id, status')
    .eq('id', bookingId)
    .eq('tenant_id', TENANT_ID)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Turno no encontrado' }, { status: 404 })
  }

  const cancellableStatuses = ['pending', 'confirmed']
  if (!cancellableStatuses.includes(existing.status)) {
    return NextResponse.json(
      { error: `El turno no puede cancelarse porque está en estado "${existing.status}"` },
      { status: 400 },
    )
  }

  const updatePayload: { status: string; notes?: string } = { status: 'cancelled' }
  if (reason) {
    updatePayload.notes = reason
  }

  const { data: updated, error: updateError } = await service
    .from('bookings')
    .update(updatePayload)
    .eq('id', bookingId)
    .eq('tenant_id', TENANT_ID)
    .select()
    .single()

  if (updateError || !updated) {
    console.error('[POST /api/admin/appointments/[id]/cancel]', updateError)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  revalidatePath('/turnos')

  return NextResponse.json({ booking: updated })
}
