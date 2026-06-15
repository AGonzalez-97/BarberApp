/**
 * Loyalty cycle computation utilities — pure functions, no DB access.
 *
 * Business rules (per product decision):
 *   - Every N cuts (discount_at) → percentage discount
 *   - Every M cuts (free_at)     → free cut + cycle reset to 0
 *   - reset_on_redeem is always true
 */

export type LoyaltyConfig = {
  /** Cut number within the cycle that triggers the discount (default: 3) */
  discount_at: number
  /** Cut number within the cycle that triggers the free cut (default: 6) */
  free_at: number
  /** Discount percentage applied at discount_at (default: 15) */
  discount_pct: number
  /** Always true per product decision — cycle resets after the free cut */
  reset_on_redeem: boolean
}

export type LoyaltyOutcome = {
  /** Final price charged after applying any loyalty reward */
  price_charged: number
  /** True when this cut is free (6th in cycle) */
  is_free: boolean
  /** True when a percentage discount was applied (3rd in cycle) */
  has_discount: boolean
  /** Discount amount in the same currency unit as basePrice */
  discount_amount: number
  /** Cycle counter value AFTER recording this cut */
  new_cycle_count: number
  /** True when the free cut was consumed and the cycle resets */
  triggers_reset: boolean
}

/**
 * Computes loyalty outcome for a single cut.
 *
 * @param currentCycleCount - Number of cuts completed in the current cycle
 *                            BEFORE this cut (0-based). E.g. 5 means this is the 6th cut.
 * @param basePrice         - Base price of the service (e.g. 9000)
 * @param config            - Loyalty configuration for the tenant
 * @returns LoyaltyOutcome with all fields populated
 */
export function computeLoyaltyOutcome(
  currentCycleCount: number,
  basePrice: number,
  config: LoyaltyConfig,
): LoyaltyOutcome {
  const cutPosition = currentCycleCount + 1

  if (cutPosition === config.free_at) {
    return {
      price_charged: 0,
      is_free: true,
      has_discount: false,
      discount_amount: basePrice,
      new_cycle_count: 0,
      triggers_reset: true,
    }
  }

  if (cutPosition === config.discount_at) {
    const discount_amount = basePrice * (config.discount_pct / 100)
    const price_charged = basePrice - discount_amount
    return {
      price_charged,
      is_free: false,
      has_discount: true,
      discount_amount,
      new_cycle_count: cutPosition,
      triggers_reset: false,
    }
  }

  return {
    price_charged: basePrice,
    is_free: false,
    has_discount: false,
    discount_amount: 0,
    new_cycle_count: cutPosition,
    triggers_reset: false,
  }
}

/**
 * Returns a human-readable loyalty status label in Spanish.
 *
 * @param cycleCount - Current cycle cut count (cuts completed in this cycle)
 * @param config     - Loyalty configuration for the tenant
 * @returns Spanish label describing the client's loyalty status
 */
export function getLoyaltyStatusLabel(cycleCount: number, config: LoyaltyConfig): string {
  // cycleCount = cuts completed in current cycle
  // The NEXT cut will be at position (cycleCount + 1)
  const nextPosition = cycleCount + 1

  if (nextPosition === config.free_at) {
    return '¡Corte gratis!'
  }

  if (nextPosition === config.discount_at) {
    return `¡Próximo corte con ${config.discount_pct}% off!`
  }

  // Cuts remaining until the discount threshold (based on cuts already done)
  // e.g. cycleCount=1, discount_at=3 → 3-1=2 more cuts needed
  const cutsToDiscount = config.discount_at - cycleCount
  if (cutsToDiscount > 0 && cycleCount < config.discount_at) {
    return `✂️ ${cutsToDiscount} ${cutsToDiscount === 1 ? 'corte' : 'cortes'} para tu próximo descuento del ${config.discount_pct}% 🎉`
  }

  const cutsToFree = config.free_at - cycleCount
  if (cutsToFree > 0) {
    return `✂️ ${cutsToFree} ${cutsToFree === 1 ? 'corte' : 'cortes'} para tu próximo corte gratis 🎉`
  }

  return `✂️ ${cycleCount} ${cycleCount === 1 ? 'corte' : 'cortes'} en el ciclo actual`
}
