'use client'

import { useSearchParams } from 'next/navigation'
import { ServiceStep } from './ServiceStep'
import { DateStep } from './DateStep'
import { ClientStep } from './ClientStep'

/**
 * Drives the multi-step booking flow using URL search params as state.
 *
 * Steps:
 *   /book                            → service selection
 *   /book?step=date&service=<id>     → date + slot/time picker
 *   /book?step=client&service=<id>&date=<YYYY-MM-DD>&time=<HH:MM> → client form
 */
export function BookingFlow() {
  const searchParams = useSearchParams()
  const step = searchParams.get('step')
  const serviceId = searchParams.get('service')
  const date = searchParams.get('date')
  const time = searchParams.get('time')

  if (step === 'client' && serviceId && date && time) {
    return <ClientStep serviceId={serviceId} date={date} time={time} />
  }

  if (step === 'date' && serviceId) {
    return <DateStep serviceId={serviceId} />
  }

  return <ServiceStep />
}
