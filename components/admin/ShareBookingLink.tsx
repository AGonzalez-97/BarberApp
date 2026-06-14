'use client'

/**
 * ShareBookingLink
 *
 * Lets the admin share the public booking URL with one tap.
 * Uses navigator.share() (Web Share API) when available,
 * falls back to opening a WhatsApp deeplink in a new tab.
 *
 * NEXT_PUBLIC_APP_URL must be set in .env.local (and Vercel env vars).
 * Example: https://peluqueria.vercel.app
 */

interface Props {
  tenantSlug: string
}

export default function ShareBookingLink({ tenantSlug: _tenantSlug }: Props) {
  // NEXT_PUBLIC_ vars are inlined at build time — safe to read in a client component.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const bookingUrl = `${appUrl}/book`

  const shareText = `¡Sacá tu turno en Leo Barber! 💈 Reservá acá: ${bookingUrl}`

  async function handleShare() {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'Reservá tu turno',
          text: shareText,
          url: bookingUrl,
        })
      } catch (err) {
        // User dismissed share sheet — not an error worth surfacing
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('[ShareBookingLink] navigator.share error:', err)
        }
      }
    } else {
      // Fallback: open WhatsApp deeplink
      const encoded = encodeURIComponent(shareText)
      window.open(`https://wa.me/?text=${encoded}`, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 active:opacity-75"
    >
      {/* WhatsApp icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.116.553 4.103 1.523 5.824L.057 23.75a.5.5 0 0 0 .609.61l6.094-1.587A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.814 9.814 0 0 1-5.034-1.385l-.361-.215-3.739.975.999-3.647-.236-.376A9.815 9.815 0 0 1 2.182 12C2.182 6.57 6.57 2.182 12 2.182c5.43 0 9.818 4.388 9.818 9.818 0 5.43-4.388 9.818-9.818 9.818z" />
      </svg>
      Compartir link de turnos
    </button>
  )
}
