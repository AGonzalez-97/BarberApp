import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { TENANT_ID } from '@/lib/tenant'

export const dynamic = 'force-dynamic'

/** GET /api/admin/blocked-dates — list all blocked dates */
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { data, error } = await service
    .from('blocked_dates')
    .select('id, date, reason')
    .eq('tenant_id', TENANT_ID)
    .order('date')

  if (error) return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  return NextResponse.json({ dates: data ?? [] })
}

/** POST /api/admin/blocked-dates — block a date */
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as { date?: string; reason?: string }
  if (!body.date || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
  }

  const service = createServiceClient()
  const { data, error } = await service
    .from('blocked_dates')
    .insert({ tenant_id: TENANT_ID, date: body.date, reason: body.reason ?? null })
    .select('id, date, reason')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Esa fecha ya está bloqueada' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}

/** DELETE /api/admin/blocked-dates?date=YYYY-MM-DD — unblock a date */
export async function DELETE(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const date = request.nextUrl.searchParams.get('date')
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
  }

  const service = createServiceClient()
  const { error } = await service
    .from('blocked_dates')
    .delete()
    .eq('tenant_id', TENANT_ID)
    .eq('date', date)

  if (error) return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
