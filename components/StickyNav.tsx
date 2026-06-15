'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const WA_HREF = 'https://wa.me/5493815313592'

const NAV_LINKS: [string, string][] = [
  ['#inicio', 'Inicio'],
  ['#servicios', 'Servicios'],
  ['#galeria', 'Galería'],
  ['#fidelizacion', 'Promos'],
  ['#ubicacion', 'Ubicación'],
]

export function StickyNav() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handler, { passive: true })
    handler()
    return () => window.removeEventListener('scroll', handler)
  }, [])

  function closeMenu() {
    setMenuOpen(false)
  }

  function handleNavClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    e.preventDefault()
    setMenuOpen(false)
    // Wait for the panel close animation before scrolling so layout shift doesn't misplace the target
    setTimeout(() => {
      const target = document.querySelector(href)
      if (target) target.scrollIntoView({ behavior: 'smooth' })
    }, 320)
  }

  return (
    <>
      <header
        className={[
          'sticky top-0 z-50 border-b transition-all duration-500',
          scrolled || menuOpen
            ? 'border-white/5 bg-zinc-950/95 backdrop-blur-md'
            : 'border-transparent bg-transparent',
        ].join(' ')}
      >
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4">
          {/* Logo */}
          <a href="#inicio" onClick={(e) => handleNavClick(e, '#inicio')} className="flex shrink-0 items-center gap-2">
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

          {/* Desktop nav */}
          <nav className="hidden items-center gap-6 text-sm md:flex" aria-label="Navegación principal">
            {NAV_LINKS.map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="relative text-zinc-400 transition-colors hover:text-white after:absolute after:bottom-[-3px] after:left-0 after:h-[2px] after:w-0 after:rounded-full after:bg-amber-400 after:transition-all after:duration-300 hover:after:w-full"
              >
                {href === '#fidelizacion' && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-amber-400 px-1 py-px text-[8px] font-black uppercase leading-tight tracking-wider text-zinc-900">New</span>
                )}
                {label}
              </a>
            ))}
          </nav>

          {/* Desktop action buttons */}
          <div className="hidden shrink-0 items-center gap-2 md:flex">
            <Link
              href="/book"
              className="shrink-0 rounded-xl !bg-white px-4 py-2 text-sm font-bold !text-zinc-900 transition-all hover:!bg-zinc-100 active:scale-95"
            >
              Reservar
            </Link>
            <a
              href={WA_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-zinc-900 transition-all hover:bg-amber-300 active:scale-95"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Contactame
            </a>
          </div>

          {/* Mobile hamburger — 3 lines morph into X */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuOpen}
            className="flex h-10 w-10 flex-col items-center justify-center gap-[5px] rounded-xl border border-white/10 bg-white/5 text-white transition-colors hover:bg-white/10 md:hidden"
          >
            <span className={['block h-[2px] w-5 rounded-full bg-white transition-all duration-300', menuOpen ? 'translate-y-[7px] rotate-45' : ''].join(' ')} />
            <span className={['block h-[2px] w-5 rounded-full bg-white transition-all duration-300', menuOpen ? 'opacity-0 scale-x-0' : ''].join(' ')} />
            <span className={['block h-[2px] w-5 rounded-full bg-white transition-all duration-300', menuOpen ? '-translate-y-[7px] -rotate-45' : ''].join(' ')} />
          </button>
        </div>

        {/* Mobile menu panel — animates height via grid trick */}
        <div className={['grid transition-all duration-300 ease-in-out md:hidden', menuOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'].join(' ')}>
          <div className="overflow-hidden">
            <div className={['border-t border-white/5 bg-zinc-950/98 px-4 pb-6 pt-4 transition-all duration-300', menuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'].join(' ')}>
              {/* Nav links */}
              <nav aria-label="Menú móvil">
                <ul className="mb-5 space-y-1">
                  {NAV_LINKS.map(([href, label], i) => (
                    <li
                      key={href}
                      className="transition-all duration-300"
                      style={{ transitionDelay: menuOpen ? `${i * 40}ms` : '0ms', opacity: menuOpen ? 1 : 0, transform: menuOpen ? 'translateY(0)' : 'translateY(-8px)' }}
                    >
                      <a
                        href={href}
                        onClick={(e) => handleNavClick(e, href)}
                        className="flex items-center justify-between rounded-xl px-4 py-3.5 text-base font-medium text-zinc-300 transition-colors hover:bg-white/5 hover:text-white active:bg-white/10"
                      >
                        <span>{label}</span>
                        {href === '#fidelizacion' && (
                          <span className="rounded bg-amber-400 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-zinc-900">New</span>
                        )}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>

              {/* Action buttons */}
              <div
                className="space-y-3 transition-all duration-300"
                style={{ transitionDelay: menuOpen ? `${NAV_LINKS.length * 40}ms` : '0ms', opacity: menuOpen ? 1 : 0, transform: menuOpen ? 'translateY(0)' : 'translateY(-8px)' }}
              >
                <Link
                  href="/book"
                  onClick={closeMenu}
                  className="flex h-14 w-full items-center justify-center rounded-2xl !bg-white text-base font-bold !text-zinc-900 transition-all hover:!bg-zinc-100 active:scale-[0.98]"
                >
                  Reservar turno
                </Link>
                <a
                  href={WA_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={closeMenu}
                  className="flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-amber-400 text-base font-bold text-zinc-900 transition-all hover:bg-amber-300 active:scale-[0.98]"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Contactame
                </a>
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  )
}
