/**
 * src/utils/pricing-status.ts
 *
 * Single Source of Truth for deriving the pricing status of timber receiving records.
 */

import type { PricingStatus } from '../types/index.ts';

export function derivePricingStatus(timberPricePerM3: number | null | undefined): PricingStatus {
  return timberPricePerM3 == null ? 'PENDING' : 'PRICED';
}
