import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { TENANT_ID } from '@/lib/tenant'
import { normalizeArgentinePhone } from '@/lib/phone'
import { getLoyaltyStatusLabel, type LoyaltyConfig } from '@/lib/loyalty'

// Always run at request time — writes to DB
export const dynamic = 'force-dynamic'

type BookingRequestBody = {
  service_id: string
  date: string
  time: string
  name: string
  phone: string
  notes?: string
}

/**
 * POST /api/bookings
 * Public endpoint — no auth required.
 * Creates a booking after:
 *   1. Validating and normalizing phone server-side
 *   2. Upserting the client record
 *   3. Creating the booking row (catches constraint violations)
 *
 * Uses service role key for writes (anon role has limited INSERT access).
 */
export async function POST(request: NextRequest) {
  let body: BookingRequestBody

  try {
    body = (await request.json()) as BookingRequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { service_id, date, name, phone, time, notes } = body

  // --- Input validation ---

  if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
    return NextResponse.json({ error: 'El nombre debe tener entre 2 y 100 caracteres.' }, { status: 400 })
  }

  if (!phone || typeof phone !== 'string') {
    return NextResponse.json({ error: 'El teléfono es requerido.' }, { status: 400 })
  }

  const normalizedPhone = normalizeArgentinePhone(phone)
  if (!normalizedPhone) {
    return NextResponse.json({ error: 'Número de teléfono inválido.' }, { status: 400 })
  }

  if (!service_id || typeof service_id !== 'string') {
    return NextResponse.json({ error: 'Servicio requerido.' }, { status: 400 })
  }

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Fecha inválida.' }, { status: 400 })
  }

  if (!time || !/^\d{2}:\d{2}$/.test(time)) {
    return NextResponse.json({ error: 'Hora inválida.' }, { status: 400 })
  }

  // Construct starts_at as an ISO timestamp (UTC)
  const starts_at = `${date}T${time}:00Z`

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // --- Fetch service to get duration ---
  const { data: service, error: serviceError } = await supabase
    .from('services')
    .select('id, name, price_ars, duration_minutes')
    .eq('id', service_id)
    .eq('tenant_id', TENANT_ID)
    .eq('is_active', true)
    .single()

  if (serviceError || !service) {
    return NextResponse.json({ error: 'Servicio no encontrado o inactivo.' }, { status: 404 })
  }

  const ends_at = new Date(new Date(starts_at).getTime() + service.duration_minutes * 60 * 1000).toISOString()

  // --- Upsert client ---
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .upsert(
      {
        tenant_id: TENANT_ID,
        phone: normalizedPhone,
        name: name.trim(),
      },
      {
        onConflict: 'tenant_id,phone',
        ignoreDuplicates: false,
      },
    )
    .select('id')
    .single()

  if (clientError || !client) {
    return NextResponse.json({ error: 'Error al registrar el cliente.' }, { status: 500 })
  }

  // --- Determine booking_mode for status ---
  const { data: tenantData } = await supabase
    .from('tenants')
    .select('booking_mode')
    .eq('id', TENANT_ID)
    .single()

  const bookingStatus = tenantData?.booking_mode === 'slots' ? 'active' : 'pending'

  // --- Create booking ---
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert({
      tenant_id: TENANT_ID,
      client_id: client.id,
      service_id: service.id,
      starts_at,
      ends_at,
      status: bookingStatus,
      notes: notes?.trim().slice(0, 300) || null,
    })
    .select('id, status, starts_at')
    .single()

  if (bookingError) {
    const msg = bookingError.message ?? ''
    if (msg.includes('uniq_active_booking_per_client')) {
      return NextResponse.json(
        { error: 'Ya tenés un turno activo. Cancelalo primero para reservar uno nuevo.' },
        { status: 409 },
      )
    }
    if (msg.includes('uniq_slot_per_tenant')) {
      return NextResponse.json(
        { error: 'El turno ya fue tomado. Por favor elegí otro horario.' },
        { status: 409 },
      )
    }
    // Generic unique violation fallback — shouldn't happen if constraints are named correctly
    if (msg.includes('23505')) {
      return NextResponse.json(
        { error: 'El turno ya fue tomado. Por favor elegí otro horario.' },
        { status: 409 },
      )
    }
    return NextResponse.json({ error: 'Error al crear el turno.' }, { status: 500 })
  }

  // --- Fetch loyalty status ---
  const { data: ledgerData } = await supabase
    .from('loyalty_ledger')
    .select('event, created_at')
    .eq('client_id', client.id)
    .eq('tenant_id', TENANT_ID)
    .order('created_at', { ascending: true })

  const { data: loyaltyConfig } = await supabase
    .from('loyalty_config')
    .select('discount_at, free_at, discount_pct, reset_on_redeem')
    .eq('tenant_id', TENANT_ID)
    .single()

  let cycleCount = 0
  if (ledgerData && ledgerData.length > 0) {
    // Count cuts after the last cycle_reset
    let count = 0
    let afterReset = ledgerData.length
    for (let i = ledgerData.length - 1; i >= 0; i--) {
      if (ledgerData[i].event === 'cycle_reset') {
        afterReset = i + 1
        break
      }
    }
    // Count cut_completed events after the last reset (or from beginning)
    for (let i = afterReset === ledgerData.length ? 0 : afterReset; i < ledgerData.length; i++) {
      if (ledgerData[i].event === 'cut_completed') count++
    }
    cycleCount = count
  }

  const config: LoyaltyConfig = loyaltyConfig ?? {
    discount_at: 3,
    free_at: 6,
    discount_pct: 15,
    reset_on_redeem: true,
  }

  const loyaltyLabel = getLoyaltyStatusLabel(cycleCount, config)

  return NextResponse.json({
    booking_id: booking.id,
    status: booking.status,
    service_name: service.name,
    starts_at: booking.starts_at,
    client_name: name.trim(),
    loyalty_label: loyaltyLabel,
  })
}
