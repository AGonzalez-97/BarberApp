import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { TENANT_ID } from '@/lib/tenant'

interface Service {
  id: string
  name: string
  price_ars: number
  duration_minutes: number
  description: string | null
}

async function fetchServices(): Promise<Service[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  const { data } = await supabase
    .from('services')
    .select('id, name, price_ars, duration_minutes, description')
    .eq('tenant_id', TENANT_ID)
    .eq('is_active', true)
    .order('price_ars')
  return data ?? []
}

function formatARS(value: number): string {
  return '$' + Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

export default async function HomePage() {
  const services = await fetchServices()

  return (
    <div className="min-h-screen bg-white">

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-zinc-950 px-6 text-center">
        {/* Decorative grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Scissors icon */}
        <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8" aria-hidden="true">
            <circle cx="6" cy="6" r="3" />
            <circle cx="6" cy="18" r="3" />
            <line x1="20" y1="4" x2="8.12" y2="15.88" />
            <line x1="14.47" y1="14.48" x2="20" y2="20" />
            <line x1="8.12" y1="8.12" x2="12" y2="12" />
          </svg>
        </div>

        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">
          Barbería de barrio
        </p>
        <h1 className="mb-4 text-5xl font-black tracking-tight text-white sm:text-6xl">
          Axel-Barber
        </h1>
        <p className="mb-10 max-w-sm text-lg text-zinc-400">
          Reservá tu turno online en segundos. Sin llamadas, sin esperas.
        </p>

        <Link
          href="/book"
          className="group inline-flex h-14 items-center gap-2 rounded-2xl bg-white px-8 text-base font-bold text-zinc-900 shadow-lg transition-all hover:bg-zinc-100 active:scale-95"
        >
          Reservar turno
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>

        {/* Scroll hint */}
        <div className="absolute bottom-8 flex flex-col items-center gap-1 text-zinc-600">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5 animate-bounce" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────────── */}
      <section className="bg-zinc-50 px-6 py-20">
        <div className="mx-auto max-w-lg">
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
            Sin complicaciones
          </p>
          <h2 className="mb-12 text-center text-3xl font-black text-zinc-900">
            Así de simple
          </h2>

          <div className="space-y-6">
            {[
              {
                n: '01',
                title: 'Elegí el día y hora',
                body: 'Ves en tiempo real qué turnos están disponibles. Nada de llamar para preguntar.',
              },
              {
                n: '02',
                title: 'Te confirmamos',
                body: 'Leo revisa tu solicitud y te confirma el turno. Te enterás al toque.',
              },
              {
                n: '03',
                title: 'Venís y listo',
                body: 'Llegás a tu horario y te atendemos. Al final pagás por transferencia con un QR.',
              },
            ].map((step) => (
              <div key={step.n} className="flex gap-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-xs font-black text-white">
                  {step.n}
                </span>
                <div>
                  <p className="font-bold text-zinc-900">{step.title}</p>
                  <p className="mt-0.5 text-sm text-zinc-500">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Services ───────────────────────────────────────────────────────── */}
      {services.length > 0 && (
        <section className="bg-white px-6 py-20">
          <div className="mx-auto max-w-lg">
            <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Precios
            </p>
            <h2 className="mb-12 text-center text-3xl font-black text-zinc-900">
              Servicios
            </h2>

            <div className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200">
              {services.map((service) => (
                <div key={service.id} className="flex items-center justify-between gap-4 px-5 py-5">
                  <div>
                    <p className="font-bold text-zinc-900">{service.name}</p>
                    <p className="text-sm text-zinc-400">{service.duration_minutes} min</p>
                    {service.description && (
                      <p className="mt-0.5 text-xs text-zinc-400">{service.description}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-xl font-black text-zinc-900">
                    {formatARS(service.price_ars)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Loyalty teaser ─────────────────────────────────────────────────── */}
      <section className="bg-zinc-950 px-6 py-20 text-center">
        <div className="mx-auto max-w-lg">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/10 text-2xl">
            ✂️
          </div>
          <h2 className="mb-3 text-2xl font-black text-white">
            Programa de fidelidad
          </h2>
          <p className="mb-2 text-zinc-400">
            Cada corte suma. Al 3.º te hacemos un descuento especial.
          </p>
          <p className="text-zinc-400">
            Al 6.º <span className="font-bold text-amber-400">el corte es gratis</span>.
          </p>
        </div>
      </section>

      {/* ── Hours ──────────────────────────────────────────────────────────── */}
      <section className="bg-white px-6 py-20">
        <div className="mx-auto max-w-lg">
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
            Cuándo encontrarnos
          </p>
          <h2 className="mb-10 text-center text-3xl font-black text-zinc-900">
            Horarios
          </h2>

          <div className="overflow-hidden rounded-2xl border border-zinc-200">
            {[
              { day: 'Lunes a viernes', hours: '9:00 – 21:00' },
              { day: 'Sábados', hours: '9:00 – 21:00' },
              { day: 'Domingos', hours: 'Cerrado', closed: true },
            ].map((row, i, arr) => (
              <div
                key={row.day}
                className={[
                  'flex items-center justify-between px-5 py-4',
                  i < arr.length - 1 ? 'border-b border-zinc-100' : '',
                ].join(' ')}
              >
                <span className={row.closed ? 'text-zinc-400' : 'font-medium text-zinc-900'}>
                  {row.day}
                </span>
                <span className={row.closed ? 'text-sm text-zinc-400' : 'font-bold text-zinc-900'}>
                  {row.hours}
                </span>
              </div>
            ))}
          </div>

          <p className="mt-4 text-center text-xs text-zinc-400">
            Los feriados nacionales pueden variar. Seguinos para novedades.
          </p>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────────────────── */}
      <section className="bg-zinc-950 px-6 py-24 text-center">
        <div className="mx-auto max-w-lg">
          <h2 className="mb-3 text-3xl font-black text-white">
            ¿Listo para tu próximo corte?
          </h2>
          <p className="mb-10 text-zinc-400">
            Reservá en menos de un minuto, sin registrarte.
          </p>
          <Link
            href="/book"
            className="group inline-flex h-14 items-center gap-2 rounded-2xl bg-white px-8 text-base font-bold text-zinc-900 shadow-lg transition-all hover:bg-zinc-100 active:scale-95"
          >
            Reservar mi turno
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-zinc-800 bg-zinc-950 px-6 py-8 text-center">
        <p className="text-xs text-zinc-600">
          © {new Date().getFullYear()} Axel-Barber · Todos los derechos reservados
        </p>
      </footer>
    </div>
  )
}
