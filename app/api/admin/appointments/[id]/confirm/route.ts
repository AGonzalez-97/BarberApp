import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { TENANT_ID } from '@/lib/tenant'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/appointments/[id]/confirm
 *
 * Transitions a booking from 'pending' to 'confirmed'.
 * Auth required. Uses service role for the write.
 *
 * Response:
 *   200 { booking }  — updated booking row
 *   400              — booking not in pending status
 *   401              — unauthenticated
 *   404              — booking not found for this tenant
 *   500              — internal error
 */
export async function POST(
  _request: NextRequest,
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

  if (existing.status !== 'pending') {
    return NextResponse.json(
      { error: `El turno no puede confirmarse porque está en estado "${existing.status}"` },
      { status: 400 },
    )
  }

  const { data: updated, error: updateError } = await service
    .from('bookings')
    .update({ status: 'confirmed' })
    .eq('id', bookingId)
    .eq('tenant_id', TENANT_ID)
    .select()
    .single()

  if (updateError || !updated) {
    console.error('[POST /api/admin/appointments/[id]/confirm]', updateError)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  revalidatePath('/turnos')

  return NextResponse.json({ booking: updated })
}
