import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

import { TENANT_ID } from '@/lib/tenant'
import QRPaymentScreen from '@/components/admin/QRPaymentScreen'

type PageProps = {
  params: { cutId: string }
}

export default async function QRPage({ params }: PageProps) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const service = createServiceClient()

  const { data: cut, error } = await service
    .from('cuts')
    .select(`
      id,
      price_charged,
      loyalty_discount_applied,
      bookings (
        starts_at,
        clients ( name, phone ),
        services ( name )
      )
    `)
    .eq('id', params.cutId)
    .eq('tenant_id', TENANT_ID)
    .single()

  if (error || !cut) notFound()

  return <QRPaymentScreen cut={cut as never} />
}
