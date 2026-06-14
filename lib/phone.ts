/**
 * Argentine phone number normalization utilities.
 * Normalizes to E.164 format: +549XXXXXXXXXX for mobiles.
 *
 * Handled input formats:
 *   011-15-XXXX-XXXX  →  +5491XXXXXXXX
 *   +54 9 11 XXXX-XXXX →  +5491XXXXXXXX
 *   15-XXXX-XXXX       →  +5491XXXXXXXX  (assumes BA area code 11)
 *   1123456789         →  +5491123456789
 */

import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js'

/**
 * Strips all non-digit characters from a string.
 */
function digitsOnly(value: string): string {
  return value.replace(/\D/g, '')
}

/**
 * Pre-cleans Argentine-specific local formats before applying E.164 rules.
 *
 * Key rules:
 *   - Leading trunk 0 removed: 011... → 11...
 *   - Mobile infix 15 removed after area code:
 *       0111SXXXXXXX → strip leading 0 → 111SXXXXXXX — not this case
 *       011 + 15 + XXXXXXXX → strip 0 → 11 + 15 + XXXXXXXX → strip 15 → 11XXXXXXXX
 *   - Buenos Aires metro area code = 11 (2 digits)
 *   - Interior area codes = 3–4 digits (e.g., 221, 3511)
 */
function preClean(digits: string): string {
  // Remove leading trunk 0 (0XX → XX)
  if (digits.startsWith('0')) {
    digits = digits.slice(1)
  }

  // Remove mobile infix 15 after 2-digit BA area code: 1115XXXXXXXX
  // BA: starts with 11, then 15, then 8 digits → total 12 digits → remove 15 → 10 digits
  if (digits.startsWith('11') && digits.length === 12 && digits.slice(2, 4) === '15') {
    digits = '11' + digits.slice(4)
  }

  // Remove mobile infix 15 after 3-digit area code: XXX15XXXXXXX → XXXXXXXXX (10 digits)
  // Pattern: 3-digit area + 15 + 7 digits = 12 total
  if (digits.length === 12 && digits.slice(3, 5) === '15') {
    const area = digits.slice(0, 3)
    const number = digits.slice(5)
    digits = area + number
  }

  // Remove mobile infix 15 after 4-digit area code: XXXX15XXXXXX → XXXXXXXXXX (10 digits)
  // Pattern: 4-digit area + 15 + 6 digits = 12 total
  if (digits.length === 12 && digits.slice(4, 6) === '15') {
    const area = digits.slice(0, 4)
    const number = digits.slice(6)
    digits = area + number
  }

  return digits
}

/**
 * Normalizes an Argentine phone number to E.164 format.
 *
 * @param raw - Raw phone string in any local or international format
 * @returns E.164 string (e.g. "+5491112345678") or null if unparseable
 */
export function normalizeArgentinePhone(raw: string): string | null {
  if (!raw || typeof raw !== 'string') return null

  const stripped = digitsOnly(raw)
  if (stripped.length === 0) return null

  let digits = preClean(stripped)

  let e164: string

  if (digits.length === 10) {
    // 10 clean digits → Argentine mobile → +549XXXXXXXXXX
    e164 = '+549' + digits
  } else if (digits.startsWith('549') && digits.length === 13) {
    // Already has +549 prefix (without +)
    e164 = '+' + digits
  } else if (digits.startsWith('54') && digits.length === 12) {
    // +54 + 10 digits but missing mobile 9 marker
    e164 = '+549' + digits.slice(2)
  } else if (digits.startsWith('9') && digits.length === 11) {
    // 9 + 10 digits (mobile marker without country code)
    e164 = '+54' + digits
  } else {
    // Attempt libphonenumber-js as final fallback
    try {
      const parsed = parsePhoneNumber(raw, 'AR')
      return parsed.isValid() ? parsed.format('E.164') : null
    } catch {
      return null
    }
  }

  // Final validation via libphonenumber-js
  try {
    const parsed = parsePhoneNumber(e164)
    return parsed.isValid() ? parsed.format('E.164') : null
  } catch {
    return null
  }
}

/**
 * Returns true if the raw string is a valid Argentine phone number
 * that can be normalized to E.164.
 */
export function isValidArgentinePhone(phone: string): boolean {
  return normalizeArgentinePhone(phone) !== null
}
