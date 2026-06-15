'use client'

import { useEffect, useState } from 'react'

const DISMISSED_KEY = 'ios-install-banner-dismissed'

function isIOS(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent)
}

function isStandalone(): boolean {
  return (navigator as Navigator & { standalone?: boolean }).standalone === true
}

function isDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === 'true'
  } catch {
    return false
  }
}

export default function IOSInstallBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Only show on iOS, not already installed as PWA, and not previously dismissed
    if (isIOS() && !isStandalone() && !isDismissed()) {
      setVisible(true)
    }
  }, [])

  function dismiss() {
    try {
      localStorage.setItem(DISMISSED_KEY, 'true')
    } catch {
      // Ignore storage errors (private browsing, quota exceeded)
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="banner"
      aria-label="Install app prompt"
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center gap-3 border-t border-zinc-200 bg-white px-4 py-3 shadow-lg"
    >
      {/* Share icon — matches iOS share sheet icon */}
      <div className="flex-shrink-0 text-zinc-500" aria-hidden="true">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
      </div>

      <p className="flex-1 text-sm text-zinc-700">
        Instalá la app: tocá{' '}
        <strong className="font-medium">Compartir</strong> y luego{' '}
        <strong className="font-medium">&quot;Agregar a inicio&quot;</strong>
      </p>

      <button
        onClick={dismiss}
        aria-label="Cerrar"
        className="flex-shrink-0 rounded-full p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  )
}
