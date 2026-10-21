/**
 * src/persistence/seed/fixtures.ts
 *
 * Unified fixture barrel exporting all seed entities and consistency validator.
 * Replaces legacy src/persistence/seed-data.ts with complete domain coverage.
 */

import {
  validateFixtureConsistency as runValidation,
  type FixtureValidationInput,
  type FixtureValidationResult,
} from './fixtures-helpers.ts';
import {
  SEED_TENANTS,
  SEED_SETTINGS,
  SEED_SPECIES,
  SEED_YARDS,
  SEED_LOTS,
  SEED_SUPPLIERS,
  SEED_BROKERS,
} from './fixtures-master-data.ts';
import {
  SEED_CONTRACTS,
  SEED_SORTIMENT_ITEMS,
  SEED_CONTRACT_RECEIPTS,
  SEED_PERHUTANI_CONTRACTS,
  SEED_CONTRACT_ITEMS,
} from './fixtures-contracts.ts';
import {
  SEED_MANIFESTS,
  SEED_RECEIVING_ITEMS,
  SEED_WOOD_RECORDS,
} from './fixtures-receiving.ts';
import {
  SEED_SALES,
  SEED_WOOD_SALES,
} from './fixtures-sales.ts';
import {
  SEED_PRODUCTION,
  SEED_SORTING,
} from './fixtures-production.ts';
import {
  SEED_PAYMENT_FORMS,
  SEED_PAYMENT_FORM_LINES,
} from './fixtures-payment-forms.ts';
import {
  SEED_DATE_RANGE_START,
  SEED_DATE_RANGE_END,
} from './fixtures-helpers.ts';

// Master data
export {
  SEED_TENANTS,
  SEED_SETTINGS,
  SEED_SPECIES,
  SEED_YARDS,
  SEED_LOTS,
  SEED_SUPPLIERS,
  SEED_BROKERS,
};

// Contracts
export {
  SEED_CONTRACTS,
  SEED_SORTIMENT_ITEMS,
  SEED_CONTRACT_RECEIPTS,
  SEED_PERHUTANI_CONTRACTS,
  SEED_CONTRACT_ITEMS,
};

// Inbound Receiving
export {
  SEED_MANIFESTS,
  SEED_RECEIVING_ITEMS,
  SEED_WOOD_RECORDS,
};

// Sales
export {
  SEED_SALES,
  SEED_WOOD_SALES,
};

// Production & Sorting
export {
  SEED_PRODUCTION,
  SEED_SORTING,
};

// Payment Forms
export {
  SEED_PAYMENT_FORMS,
  SEED_PAYMENT_FORM_LINES,
};

// Date bounds
export {
  SEED_DATE_RANGE_START,
  SEED_DATE_RANGE_END,
};

/**
 * Validates relational FK integrity, date bounds, and numeric sanity
 * across all seed fixtures.
 */
export function validateFixtureConsistency(customData?: FixtureValidationInput): FixtureValidationResult {
  return runValidation(
    customData ?? {
      tenants: SEED_TENANTS,
      yards: SEED_YARDS,
      lots: SEED_LOTS,
      species: SEED_SPECIES,
      suppliers: SEED_SUPPLIERS,
      brokers: SEED_BROKERS,
      contracts: SEED_CONTRACTS,
      sortimentItems: SEED_SORTIMENT_ITEMS,
      contractReceipts: SEED_CONTRACT_RECEIPTS,
      manifests: SEED_MANIFESTS,
      receivingItems: SEED_RECEIVING_ITEMS,
      sales: SEED_SALES,
      production: SEED_PRODUCTION,
      sorting: SEED_SORTING,
      paymentForms: SEED_PAYMENT_FORMS,
      paymentFormLines: SEED_PAYMENT_FORM_LINES,
    }
  );
}
