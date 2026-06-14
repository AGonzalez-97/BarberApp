'use client'

import { useEffect, useState } from 'react'
import { generatePaymentQR } from '@/lib/qr'

type PaymentQRProps = {
  alias: string
  amount: number
  isFree?: boolean
}

/**
 * Formats an ARS amount with thousands separator.
 * Example: 9000 → "9.000"
 */
function formatARS(amount: number): string {
  return amount.toLocaleString('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

/**
 * PaymentQR — shows a QR code for Argentine Transferencias 3.0 alias payment.
 *
 * When isFree is true, renders a "free cut" message instead of the QR.
 * Otherwise generates a QR code client-side and shows the amount owed.
 */
export default function PaymentQR({ alias, amount, isFree = false }: PaymentQRProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isFree) return

    let cancelled = false

    generatePaymentQR(alias)
      .then((dataUrl) => {
        if (!cancelled) setQrDataUrl(dataUrl)
      })
      .catch(() => {
        if (!cancelled) setError('No se pudo generar el QR. Usá el alias manualmente.')
      })

    return () => {
      cancelled = true
    }
  }, [alias, isFree])

  if (isFree) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="text-6xl">🎉</div>
        <h2 className="text-2xl font-bold text-green-600">¡Corte gratis!</h2>
        <p className="text-lg text-gray-600">No necesitás pagar</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-6 text-center">
      <p className="text-lg font-medium text-gray-700">Total a pagar</p>
      <p className="text-4xl font-bold text-gray-900">${formatARS(amount)}</p>

      {error ? (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
      ) : qrDataUrl ? (
        <>
          <img
            src={qrDataUrl}
            alt={`QR de pago — alias ${alias}`}
            width={256}
            height={256}
            className="rounded-xl shadow-md"
          />
          <p className="text-sm text-gray-500">
            Alias: <span className="font-mono font-medium text-gray-700">{alias}</span>
          </p>
        </>
      ) : (
        <div className="flex h-64 w-64 items-center justify-center rounded-xl bg-gray-100">
          <span className="text-sm text-gray-400">Generando QR...</span>
        </div>
      )}
    </div>
  )
}
