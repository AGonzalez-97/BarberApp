'use client'

import { useState } from 'react'
import PeriodStats from './PeriodStats'
import DashboardCharts from './DashboardCharts'

export default function DashboardClient({ movements }: { movements: React.ReactNode }) {
  const [demo, setDemo] = useState(false)

  return (
    <>
      <section className="mb-6">
        <PeriodStats demo={demo} />
      </section>

      <section className="mb-6">
        {movements}
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Evolución del negocio
        </h2>
        <DashboardCharts demo={demo} onDemoChange={setDemo} />
      </section>
    </>
  )
}
