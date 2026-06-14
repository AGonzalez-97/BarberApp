/**
 * QR code generation utilities for Argentine Transferencias 3.0 alias payments.
 *
 * The QR payload is a plain alias string compatible with Argentine banking apps
 * (Mercado Pago, BBVA, Santander, etc.) that support CBU/CVU alias scanning.
 */

import QRCode from 'qrcode'

/**
 * The payment alias for Transferencias 3.0.
 * Configurable via NEXT_PUBLIC_PAYMENT_ALIAS env var.
 */
export const PAYMENT_ALIAS = process.env.NEXT_PUBLIC_PAYMENT_ALIAS ?? 'Leo.barber4316'

/**
 * Generates a QR code data URL encoding the given alias.
 *
 * @param alias - Transferencias 3.0 alias string (e.g. 'Leo.barber4316')
 * @returns Base64 data URL string suitable for use in an <img> src attribute
 */
export async function generatePaymentQR(alias: string): Promise<string> {
  return QRCode.toDataURL(alias, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 256,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  })
}
