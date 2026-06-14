import { computeLoyaltyOutcome, getLoyaltyStatusLabel, LoyaltyConfig } from '@/lib/loyalty'

const DEFAULT_CONFIG: LoyaltyConfig = {
  discount_at: 3,
  free_at: 6,
  discount_pct: 15,
  reset_on_redeem: true,
}

const BASE_PRICE = 9000

describe('computeLoyaltyOutcome', () => {
  // ── Cut 1 (currentCycleCount = 0) ─────────────────────────────────────────

  test('cut 1 → normal price, no discount, no reset', () => {
    const result = computeLoyaltyOutcome(0, BASE_PRICE, DEFAULT_CONFIG)
    expect(result.price_charged).toBe(BASE_PRICE)
    expect(result.is_free).toBe(false)
    expect(result.has_discount).toBe(false)
    expect(result.discount_amount).toBe(0)
    expect(result.new_cycle_count).toBe(1)
    expect(result.triggers_reset).toBe(false)
  })

  // ── Cut 2 (currentCycleCount = 1) ─────────────────────────────────────────

  test('cut 2 → normal price, no discount', () => {
    const result = computeLoyaltyOutcome(1, BASE_PRICE, DEFAULT_CONFIG)
    expect(result.price_charged).toBe(BASE_PRICE)
    expect(result.is_free).toBe(false)
    expect(result.has_discount).toBe(false)
    expect(result.new_cycle_count).toBe(2)
    expect(result.triggers_reset).toBe(false)
  })

  // ── Cut 3 (currentCycleCount = 2) — 15% discount ──────────────────────────

  test('cut 3 → 15% discount applied', () => {
    const result = computeLoyaltyOutcome(2, BASE_PRICE, DEFAULT_CONFIG)
    expect(result.has_discount).toBe(true)
    expect(result.is_free).toBe(false)
    expect(result.discount_amount).toBeCloseTo(1350, 2)   // 9000 * 0.15
    expect(result.price_charged).toBeCloseTo(7650, 2)     // 9000 * 0.85
    expect(result.new_cycle_count).toBe(3)
    expect(result.triggers_reset).toBe(false)
  })

  // ── Cut 4 (currentCycleCount = 3) ─────────────────────────────────────────

  test('cut 4 → normal price again', () => {
    const result = computeLoyaltyOutcome(3, BASE_PRICE, DEFAULT_CONFIG)
    expect(result.price_charged).toBe(BASE_PRICE)
    expect(result.has_discount).toBe(false)
    expect(result.is_free).toBe(false)
    expect(result.new_cycle_count).toBe(4)
  })

  // ── Cut 5 (currentCycleCount = 4) ─────────────────────────────────────────

  test('cut 5 → normal price', () => {
    const result = computeLoyaltyOutcome(4, BASE_PRICE, DEFAULT_CONFIG)
    expect(result.price_charged).toBe(BASE_PRICE)
    expect(result.new_cycle_count).toBe(5)
  })

  // ── Cut 6 (currentCycleCount = 5) — free, resets cycle ───────────────────

  test('cut 6 → free, triggers_reset=true, new_cycle_count=0', () => {
    const result = computeLoyaltyOutcome(5, BASE_PRICE, DEFAULT_CONFIG)
    expect(result.is_free).toBe(true)
    expect(result.price_charged).toBe(0)
    expect(result.has_discount).toBe(false)
    expect(result.discount_amount).toBe(BASE_PRICE)
    expect(result.triggers_reset).toBe(true)
    expect(result.new_cycle_count).toBe(0)
  })

  // ── Cut 7 (currentCycleCount = 0 after reset) — normal price ─────────────

  test('cut 7 (after reset, currentCycleCount=0) → normal price, new cycle', () => {
    const result = computeLoyaltyOutcome(0, BASE_PRICE, DEFAULT_CONFIG)
    expect(result.price_charged).toBe(BASE_PRICE)
    expect(result.is_free).toBe(false)
    expect(result.has_discount).toBe(false)
    expect(result.new_cycle_count).toBe(1)
    expect(result.triggers_reset).toBe(false)
  })

  // ── Custom config ─────────────────────────────────────────────────────────

  test('respects custom config (discount_at=2, free_at=4)', () => {
    const config: LoyaltyConfig = { discount_at: 2, free_at: 4, discount_pct: 20, reset_on_redeem: true }
    const result = computeLoyaltyOutcome(1, 1000, config)   // cut 2
    expect(result.has_discount).toBe(true)
    expect(result.price_charged).toBeCloseTo(800, 2)
  })
})

describe('getLoyaltyStatusLabel', () => {
  test('2 cortes para tu descuento when 1 cut done', () => {
    expect(getLoyaltyStatusLabel(1, DEFAULT_CONFIG)).toBe('2 cortes para tu descuento')
  })

  test('¡Próximo corte con 15% off! when at discount_at - 1', () => {
    expect(getLoyaltyStatusLabel(2, DEFAULT_CONFIG)).toBe('¡Próximo corte con 15% off!')
  })

  test('¡Corte gratis! when at free_at - 1', () => {
    expect(getLoyaltyStatusLabel(5, DEFAULT_CONFIG)).toBe('¡Corte gratis!')
  })
})
