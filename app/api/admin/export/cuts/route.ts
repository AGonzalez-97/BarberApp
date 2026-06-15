import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { TENANT_ID } from '@/lib/tenant'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'

type CutRow = {
  created_at: string
  price_charged: number
  loyalty_discount_applied: boolean
  clients: { name: string } | null
  services: { name: string } | null
}

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  if ((from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) || (to && !/^\d{4}-\d{2}-\d{2}$/.test(to))) {
    return NextResponse.json({ error: 'Invalid date range' }, { status: 400 })
  }

  const service = createServiceClient()
  let query = service
    .from('cuts')
    .select('created_at, price_charged, loyalty_discount_applied, clients ( name ), services ( name )')
    .eq('tenant_id', TENANT_ID)
    .order('created_at', { ascending: false })
    .limit(10_000)

  if (from) query = query.gte('created_at', `${from}T00:00:00.000Z`)
  if (to)   query = query.lte('created_at', `${to}T23:59:59.999Z`)

  const { data, error } = await query.returns<CutRow[]>()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (data ?? []).map((c) => ({
    Fecha: new Date(c.created_at).toLocaleDateString('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }),
    Hora: new Date(c.created_at).toLocaleTimeString('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
    Cliente: c.clients?.name ?? '',
    Servicio: c.services?.name ?? '',
    'Precio cobrado': c.price_charged ?? 0,
    'Descuento fidelidad': c.loyalty_discount_applied ? 'Sí' : 'No',
  }))

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)

  ws['!cols'] = [
    { wch: 12 },
    { wch: 8 },
    { wch: 20 },
    { wch: 20 },
    { wch: 16 },
    { wch: 18 },
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Cortes')

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="cortes-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  })
}
