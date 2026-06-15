import { NextRequest, NextResponse } from 'next/server'
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from '@/lib/supabase/service'

import { TENANT_ID } from '@/lib/tenant'

export async function GET(
  _req: NextRequest,
  { params }: { params: { cutId: string } }
) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()

  const { data, error } = await service
    .from('cuts')
    .select(`
      id,
      price_charged,
      loyalty_discount_applied,
      created_at,
      bookings (
        starts_at,
        clients ( name, phone ),
        services ( name )
      )
    `)
    .eq('id', params.cutId)
    .eq('tenant_id', TENANT_ID)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Cut not found' }, { status: 404 })
  }

  return NextResponse.json(data)
}
