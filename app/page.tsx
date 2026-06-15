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

interface LoyaltyConfig {
  discount_at: number
  free_at: number
  discount_pct: number
}

async function fetchData(): Promise<{ services: Service[]; loyalty: LoyaltyConfig | null }> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  const [svcRes, loyRes] = await Promise.all([
    supabase
      .from('services')
      .select('id, name, price_ars, duration_minutes, description')
      .eq('tenant_id', TENANT_ID)
      .eq('is_active', true)
      .order('price_ars'),
    supabase
      .from('loyalty_config')
      .select('discount_at, free_at, discount_pct')
      .eq('tenant_id', TENANT_ID)
      .maybeSingle<LoyaltyConfig>(),
  ])
  return { services: svcRes.data ?? [], loyalty: loyRes.data }
}

function formatARS(v: number): string {
  return '$' + Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

const WA_HREF = 'https://wa.me/5493815313592'
const IG_HREF = 'https://instagram.com/_leobarber23'

export default async function HomePage() {
  const { services, loyalty } = await fetchData()
  const discountAt = loyalty?.discount_at ?? 3
  const freeAt = loyalty?.free_at ?? 6
  const discountPct = loyalty?.discount_pct ?? 15

  return (
    <div>
      {/* ── Sticky nav ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-zinc-950/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4">
          <a href="#inicio" className="flex shrink-0 items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400/10">
              <svg viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
                <line x1="20" y1="4" x2="8.12" y2="15.88" />
                <line x1="14.47" y1="14.48" x2="20" y2="20" />
                <line x1="8.12" y1="8.12" x2="12" y2="12" />
              </svg>
            </div>
            <span className="font-black tracking-tight text-white">Axel Barber Club</span>
          </a>

          <nav className="hidden items-center gap-6 text-sm md:flex" aria-label="Navegación principal">
            {([['#inicio', 'Inicio'], ['#servicios', 'Servicios'], ['#galeria', 'Galería'], ['#fidelizacion', 'Fidelización'], ['#ubicacion', 'Ubicación']] as [string, string][]).map(([href, label]) => (
              <a key={href} href={href} className="text-zinc-400 transition-colors hover:text-white">
                {label}
              </a>
            ))}
          </nav>

          <Link
            href="/book"
            className="shrink-0 rounded-xl bg-white px-4 py-2 text-sm font-bold text-zinc-900 transition-all hover:bg-zinc-100 active:scale-95"
          >
            Reservar
          </Link>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section id="inicio" className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-zinc-950 px-6 text-center">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}
          aria-hidden="true"
        />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/5 blur-3xl" aria-hidden="true" />

        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-4 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden="true" />
          <span className="text-xs font-semibold uppercase tracking-widest text-amber-300">Tafi Viejo, Tucumán</span>
        </div>

        <h1 className="mb-1 text-6xl font-black tracking-tight text-white sm:text-7xl">
          Axel Barber
        </h1>
        <p className="mb-10 text-4xl font-black tracking-tight text-amber-400 sm:text-5xl">Club</p>
        <p className="mb-10 max-w-sm text-lg text-zinc-400">
          Reservá tu turno online en segundos.<br className="hidden sm:block" />Sin llamadas, sin esperas.
        </p>

        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/book"
            className="group inline-flex h-14 items-center gap-2 rounded-2xl bg-white px-8 text-base font-bold text-zinc-900 shadow-lg transition-all hover:bg-zinc-100 active:scale-95"
          >
            Reservar turno
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
          <a
            href={WA_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-14 items-center gap-2 rounded-2xl bg-[#25D366] px-8 text-base font-bold text-white shadow-lg transition-all hover:bg-[#22C35E] active:scale-95"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Contactame
          </a>
        </div>

        <div className="mt-10">
          <a
            href={IG_HREF}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram @_leobarber23"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-zinc-400 transition-colors hover:border-pink-500/30 hover:text-pink-400"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
            </svg>
            @_leobarber23
          </a>
        </div>

        <div className="absolute bottom-8 flex flex-col items-center gap-1 text-zinc-600" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5 animate-bounce">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </section>

      {/* ── Services ───────────────────────────────────────────────────────── */}
      <section id="servicios" className="bg-white px-6 py-20">
        <div className="mx-auto max-w-lg">
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
            Servicios & Precios
          </p>
          <h2 className="mb-2 text-center text-4xl font-black text-zinc-900">Nuestros Servicios</h2>
          <p className="mb-12 text-center text-sm text-zinc-400">Calidad garantizada en cada corte</p>

          <div className="overflow-hidden rounded-2xl border border-zinc-200 shadow-sm">
            {services.length > 0 ? (
              services.map((svc, i) => (
                <div
                  key={svc.id}
                  className={['flex items-center justify-between gap-4 px-6 py-5', i > 0 ? 'border-t border-zinc-100' : ''].join(' ')}
                >
                  <div>
                    <p className="font-bold text-zinc-900">{svc.name}</p>
                    <p className="text-sm text-zinc-400">{svc.duration_minutes} min</p>
                    {svc.description && <p className="mt-0.5 text-xs text-zinc-400">{svc.description}</p>}
                  </div>
                  <span className="shrink-0 rounded-xl bg-zinc-900 px-4 py-2 text-base font-black text-white">
                    {formatARS(svc.price_ars)}
                  </span>
                </div>
              ))
            ) : (
              <div className="px-6 py-8 text-center text-sm text-zinc-400">Próximamente más servicios.</div>
            )}
          </div>

          <div className="mt-8 text-center">
            <Link href="/book" className="inline-flex h-12 items-center gap-2 rounded-xl bg-zinc-900 px-6 text-sm font-bold text-white transition-opacity hover:opacity-80">
              Reservar ahora
            </Link>
          </div>
        </div>
      </section>

      {/* ── Gallery ────────────────────────────────────────────────────────── */}
      <section id="galeria" className="bg-zinc-900 px-6 py-20">
        <div className="mx-auto max-w-lg">
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Galería
          </p>
          <h2 className="mb-2 text-center text-4xl font-black text-white">Nuestro Trabajo</h2>
          <p className="mb-10 text-center text-sm text-zinc-400">Seguinos en Instagram para ver todos los trabajos</p>

          {/* Placeholder grid — add real photos to /public/gallery/ to replace these */}
          <div className="grid grid-cols-3 gap-2">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-zinc-800 ring-1 ring-white/5"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-zinc-600" aria-hidden="true">
                  <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
                  <line x1="20" y1="4" x2="8.12" y2="15.88" />
                  <line x1="14.47" y1="14.48" x2="20" y2="20" />
                  <line x1="8.12" y1="8.12" x2="12" y2="12" />
                </svg>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <a
              href={IG_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
              Ver galería en @_leobarber23
            </a>
          </div>
        </div>
      </section>

      {/* ── Fidelización ───────────────────────────────────────────────────── */}
      <section id="fidelizacion" className="bg-zinc-950 px-6 py-20">
        <div className="mx-auto max-w-lg">
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Fidelización
          </p>
          <h2 className="mb-2 text-center text-4xl font-black text-white">Programa de Puntos</h2>
          <p className="mb-12 text-center text-sm text-zinc-400">Cada corte te acerca a un premio</p>

          <div className="mb-10 flex justify-center gap-2">
            {Array.from({ length: freeAt }, (_, i) => i + 1).map((n) => {
              const isDiscount = n === discountAt
              const isFree = n === freeAt
              return (
                <div
                  key={n}
                  className={[
                    'flex h-12 w-12 flex-col items-center justify-center rounded-xl text-sm font-black',
                    isFree
                      ? 'bg-green-500/20 text-green-400 ring-2 ring-green-500/40'
                      : isDiscount
                        ? 'bg-amber-400/20 text-amber-400 ring-2 ring-amber-400/40'
                        : 'bg-zinc-800 text-zinc-400',
                  ].join(' ')}
                >
                  {n}
                  {isDiscount && <span className="mt-0.5 text-[8px] font-bold uppercase tracking-wide text-amber-400">%off</span>}
                  {isFree && <span className="mt-0.5 text-[8px] font-bold uppercase tracking-wide text-green-400">free</span>}
                </div>
              )
            })}
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/5 px-5 py-4">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-400/20 text-xs font-black text-amber-400">
                {discountAt}
              </span>
              <div>
                <p className="font-semibold text-white">Descuento especial</p>
                <p className="text-sm text-zinc-400">
                  En tu corte N°{discountAt} del ciclo aplicamos un {discountPct}% de descuento automáticamente.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-green-500/20 bg-green-500/5 px-5 py-4">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-500/20 text-xs font-black text-green-400">
                {freeAt}
              </span>
              <div>
                <p className="font-semibold text-white">Corte gratis</p>
                <p className="text-sm text-zinc-400">
                  Tu corte N°{freeAt} es completamente gratis. El ciclo reinicia automáticamente.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-10 text-center">
            <Link href="/book" className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 text-sm font-bold text-zinc-900 transition-opacity hover:opacity-90">
              Empezar a sumar puntos
            </Link>
          </div>
        </div>
      </section>

      {/* ── Location ───────────────────────────────────────────────────────── */}
      <section id="ubicacion" className="bg-zinc-50 px-6 py-20">
        <div className="mx-auto max-w-lg">
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
            Ubicación
          </p>
          <h2 className="mb-12 text-center text-4xl font-black text-zinc-900">Dónde nos encontramos</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-zinc-700" aria-hidden="true">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <h3 className="mb-2 font-bold text-zinc-900">Dirección</h3>
              <p className="text-sm font-medium text-zinc-700">9 de Julio 450</p>
              <p className="text-sm text-zinc-500">Tafi Viejo, Tucumán</p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-zinc-700" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <h3 className="mb-3 font-bold text-zinc-900">Horario</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-600">Lunes – Sábado</span>
                  <span className="font-semibold text-zinc-900">09:00 – 21:00</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Domingo</span>
                  <span className="text-zinc-400">Cerrado</span>
                </div>
              </div>
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-zinc-400">
            Los feriados nacionales pueden variar. Seguinos para novedades.
          </p>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="bg-zinc-950 px-6 pb-8 pt-16">
        <div className="mx-auto max-w-lg">
          <div className="mb-10 flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400/10">
                <svg viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                  <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
                  <line x1="20" y1="4" x2="8.12" y2="15.88" />
                  <line x1="14.47" y1="14.48" x2="20" y2="20" />
                  <line x1="8.12" y1="8.12" x2="12" y2="12" />
                </svg>
              </div>
              <span className="font-black text-white">Axel Barber Club</span>
            </div>

            <nav aria-label="Navegación del footer">
              <ul className="flex flex-wrap justify-center gap-4 text-sm text-zinc-500">
                {([['#inicio', 'Inicio'], ['#servicios', 'Servicios'], ['#galeria', 'Galería'], ['#fidelizacion', 'Fidelización'], ['#ubicacion', 'Ubicación']] as [string, string][]).map(([href, label]) => (
                  <li key={href}>
                    <a href={href} className="transition-colors hover:text-zinc-300">{label}</a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <div className="mb-8 flex flex-col items-center gap-3">
            <p className="text-sm text-zinc-500">Seguinos en nuestras redes</p>
            <a
              href={IG_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#f09433] via-[#e6683c] to-[#bc1888] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
              @_leobarber23
            </a>
          </div>

          <div className="mb-6 border-t border-zinc-800" />

          <div className="space-y-1 text-center text-xs text-zinc-600">
            <p>Desarrollado por <span className="text-zinc-400">Axel Gonzalez</span>, Tafi Viejo</p>
            <p>© {new Date().getFullYear()} Axel Barber Club · Todos los derechos reservados</p>
          </div>
        </div>
      </footer>

      {/* ── Floating social buttons ─────────────────────────────────────────── */}
      <div className="fixed bottom-6 right-4 z-50 flex flex-col gap-3" aria-label="Contacto rápido">
        <a
          href={IG_HREF}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Seguinos en Instagram"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#bc1888] text-white shadow-lg transition-transform hover:scale-110 active:scale-95"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
          </svg>
        </a>
        <a
          href={WA_HREF}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Contactar por WhatsApp"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-110 active:scale-95"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </a>
      </div>
    </div>
  )
}
