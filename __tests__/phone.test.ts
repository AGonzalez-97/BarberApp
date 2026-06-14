import { normalizeArgentinePhone, isValidArgentinePhone } from '@/lib/phone'

describe('normalizeArgentinePhone', () => {
  // ── Happy path: common Argentine formats ──────────────────────────────────

  test('011-15-1234-5678 → +5491112345678', () => {
    expect(normalizeArgentinePhone('011-15-1234-5678')).toBe('+5491112345678')
  })

  test('+54 9 11 1234-5678 → +5491112345678', () => {
    expect(normalizeArgentinePhone('+54 9 11 1234-5678')).toBe('+5491112345678')
  })

  test('1123456789 (10 raw digits, BA area) → +5491123456789', () => {
    expect(normalizeArgentinePhone('1123456789')).toBe('+5491123456789')
  })

  test('+5491123456789 (already E.164 with mobile 9) → +5491123456789', () => {
    expect(normalizeArgentinePhone('+5491123456789')).toBe('+5491123456789')
  })

  test('5491123456789 (digits only, E.164 without +) → +5491123456789', () => {
    expect(normalizeArgentinePhone('5491123456789')).toBe('+5491123456789')
  })

  test('+54 11 1234-5678 (international no mobile 9) → adds 9 → +5491112345678', () => {
    expect(normalizeArgentinePhone('+54 11 1234-5678')).toBe('+5491112345678')
  })

  // ── Invalid inputs ────────────────────────────────────────────────────────

  test('invalid string "abc" → null', () => {
    expect(normalizeArgentinePhone('abc')).toBeNull()
  })

  test('empty string → null', () => {
    expect(normalizeArgentinePhone('')).toBeNull()
  })

  test('too-short number "123" → null', () => {
    expect(normalizeArgentinePhone('123')).toBeNull()
  })
})

describe('isValidArgentinePhone', () => {
  test('returns true for valid number', () => {
    expect(isValidArgentinePhone('1123456789')).toBe(true)
  })

  test('returns false for invalid number', () => {
    expect(isValidArgentinePhone('abc')).toBe(false)
  })
})
