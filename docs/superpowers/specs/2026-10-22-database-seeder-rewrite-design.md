# Design Spec: Database Seeder Rewrite — Realistic Fixtures with FK Consistency

**Document:** `docs/superpowers/specs/2026-10-22-database-seeder-rewrite-design.md`
**Date:** 2026-10-22
**Status:** Draft — Pending Approval
**Related Plan:** `docs/superpowers/plans/2026-10-22-database-seeder-rewrite.md`
**Related ADR:** ADR-0011 (Shared Fixture Source vs Backend-Specific Seeders)
**Architecture:** Replace 3 existing seed files (`seed-db.ts`, `seed-supabase.ts`, `seed-data.ts`) with a unified fixture module (`src/persistence/seed/fixtures.ts`) consumed by two backend-specific seed scripts (`scripts/seed-db.ts` for SQLite, `scripts/seed-supabase.ts` for Supabase). Hand-crafted 5-10 records per entity, realistic Indonesian names, deterministic FK chains, upsert idempotency, 3-month date range.

---

## 1. Executive Summary & Problem Statement

### 1.1 Context

Three legacy seed files exist with overlapping and inconsistent concerns:

- `src/persistence/seed-data.ts` (236 LOC) — constants for 3 entities (WoodReceivingRecord, Supplier, Broker)
- `scripts/seed-db.ts` (120 LOC) — SQLite loader + hardcoded tenant/yards/species
- `scripts/seed-supabase.ts` (338 LOC) — Supabase loader + its own hardcoded SEED_SPECIES, SEED_YARDS, SEED_LOTS, SEED_MANIFESTS, SEED_ITEMS

**Problems with current state:**
- 7 shipped feature modules (contracts, payment forms, pending pricing, production, sorting, brokers linkage, broker master) have NO seed data.
- Duplicate seed definitions between `seed-supabase.ts` and `seed-data.ts` — risk of divergence.
- No FK consistency guarantees — contract numbers in receiving records don't match any `PerhutaniContract` because the latter doesn't exist in seeds.
- No idempotency — reruns truncate+reseed (destructive).

### 1.2 Business Problem

New session (model, developer, or AI pair) spinning up the project:
- Cannot demo contract tracking (no PerhutaniContract rows).
- Cannot demo weekly payment form generation (no FK chain from records → contracts → payments).
- Cannot test production yield calculation (no SawmillProductionRecord).
- Must manually populate test data every time.

### 1.3 Scope

Replace all 3 existing seed files with new architecture:

- `src/persistence/seed/fixtures.ts` — single source of truth for all fixture data
- `src/persistence/seed/fixtures.*.ts` — per-entity fixture modules (split for maintainability if monolithic file exceeds 500 LOC)
- `scripts/seed-db.ts` — SQLite loader (rewritten, upsert-based)
- `scripts/seed-supabase.ts` — Supabase loader (rewritten, upsert-based)

### 1.4 Non-Goals (YAGNI)

- No pseudo-random generation (hand-crafted suffices for Q2=B scope).
- No multi-tenant seed (Q7=A: `default-tenant` only).
- No volume/stress test data (defer to future dedicated plan if performance testing required).
- No seed state management UI (CLI-only).
- No partial seed (always seed all tables; selective seeding is CLI arg complication unneeded).

---

## 2. Data Architecture

### 2.1 Directory Structure

```
src/persistence/seed/
├── fixtures.ts                    # Barrel export — single consumer-facing API
├── fixtures-master-data.ts        # Tenants, yards, lots, species, suppliers, brokers, settings
├── fixtures-contracts.ts          # Contracts, sortiment items, receipts
├── fixtures-receiving.ts          # Receiving manifests, items, flattened records
├── fixtures-sales.ts              # Sales records
├── fixtures-production.ts         # Production records, sorting records
├── fixtures-payment-forms.ts      # Payment forms, line items
└── fixtures-helpers.ts            # Shared date helpers, ID generators

scripts/
├── seed-db.ts                     # SQLite loader (rewritten)
└── seed-supabase.ts               # Supabase loader (rewritten)
```

### 2.2 Fixture Volume (per Q2=B, 5-10 per entity)

| Entity | Count | Rationale |
|---|---|---|
| Tenant | 1 | Q7=A single tenant |
| Yard | 3 | Realistic small operation |
| Lot (kavling) | 15 | 5 per yard average |
| WoodSpecies | 8 | Jati, Merbau, Meranti, Mahoni, Sengon, Jabon, Pinus, Keruing |
| Supplier | 7 | Mix PT + CV + Perhutani |
| Broker | 5 | Realistic small roster |
| PerhutaniContract | 4 | Different KPH origins |
| ContractSortimentItem | 10 | ~2.5 per contract |
| ContractReceipt | 6 | Mix paid/partial |
| ReceivingManifest | 10 | 2-3 per month over 3 months |
| ReceivingItem | 18 | ~2 per manifest average |
| WoodSalesRecord | 10 | Spread across 3 months |
| SawmillProductionRecord | 8 | Mix species, yields 50%-85% |
| StockSortingRecord | 5 | Various reasons |
| PaymentForm | 6 | 1-2 per week × 3-4 weeks |
| PaymentFormLineItem | 15 | ~2.5 per form |
| AppSettings | 1 | Default values |

**Total approximately 130 individual records across 17 entities.**

### 2.3 Date Range (per Q10 implicit = 3 months)

All fixture dates fall within `2026-07-22` to `2026-10-22` (3 months before current project date).

**Date distribution strategy:**
- 3 complete weekly windows (Sat-Fri) for Payment Form grouping tests
- Receiving records spread across weeks with mix of PENDING/PRICED
- Sales records spread for inventory flow analytics
- Production records recent (last 2 weeks) for daily KPI relevance

### 2.4 FK Chain Consistency (per Q5=A)

**Canonical chain example:**

```
PerhutaniContract: CTR-RBL-2026-01 (KPH Randublatung)
  └── ContractSortimentItem: 2 items (Jati A1 + Jati A2)
  └── ContractReceipt: 2 kwitansi
       └── ReceivingManifest: MFT-2026-W38-001 (SKSHHK-2026-038)
            └── ReceivingItem: 2 items matching sortimen
                 └── PaymentForm: PAY-W38-RBL-JATI (preprintedNumber: 018532)
                      └── PaymentFormLineItem: 2 lines per item
```

**Not every record is in a chain.** Realistic mix:
- ~60% of ReceivingManifests reference a PerhutaniContract (Perhutani jalur)
- ~40% are standalone (private supplier jalur rakyat — contractNumber as free text)
- ~70% of ReceivingItems have `timberPricePerM3 != null` (PRICED)
- ~30% have `null` price (PENDING — for /pending-pricing demo)
- ~50% of PRICED records have `paymentFormId` set (consolidated into PaymentForm)
- Mix of PaymentForm statuses: 2 DRAFT, 2 ISSUED, 2 PAID

### 2.5 Realistic Indonesian Names (per Q6=B, Q11 confirmed)

**Suppliers (mix PT/CV/Perhutani):**
- Perum Perhutani KPH Randublatung
- Perum Perhutani KPH Mantingan
- CV Jati Makmur Sentosa
- PT Hutan Lestari Nusantara
- CV Rimba Kayu Jaya
- Koperasi Tani Hutan Rakyat Blora
- PT Wana Mitra Abadi

**Brokers (nama Jawa/Indonesia umum):**
- Pak Agus Suparjo
- H. Mahmudi
- Pak Sutrisno Hadi
- Bu Yanti Rahayu
- Pak Darmawan Setia

**KPH Origins:**
- KPH Randublatung
- KPH Mantingan
- KPH Cepu
- KPH Pati

**Kavling naming:**
- `KAV-TMR-01` to `KAV-TMR-05` (TPK Timur)
- `KAV-UTR-01` to `KAV-UTR-05` (TPK Utara)
- `KAV-BRT-01` to `KAV-BRT-05` (TPK Barat)

**Wood species (Indonesian + Mandarin):**
- `Jati (柚木)`, `Merbau (菠萝格)`, `Meranti (梅兰蒂)`, `Mahoni (桃花心木)`,
  `Sengon (白柚)`, `Jabon (白楝)`, `Pinus (松木)`, `Keruing (克鲁)`

---

## 3. Idempotency Strategy (per Q4=D Upsert)

### 3.1 SQLite Loader Approach

```sql
-- Use INSERT ... ON CONFLICT ... DO UPDATE pattern
INSERT INTO suppliers (id, tenant_id, code, name, ...)
VALUES (?, ?, ?, ?, ...)
ON CONFLICT(id) DO UPDATE SET
  code = excluded.code,
  name = excluded.name,
  updated_at = datetime('now');
```

**Rationale:**
- Preserves `created_at` on existing rows (not overwritten)
- Updates all mutable fields to match fixture
- Idempotent — reruns yield identical final state
- Safe for incremental fixture additions (new IDs inserted, existing updated)

### 3.2 Supabase Loader Approach

Use PostgREST `on_conflict` query parameter with `resolution=merge-duplicates`:

```ts
await supabaseFetch('/suppliers?on_conflict=id', {
  method: 'POST',
  headers: { Prefer: 'resolution=merge-duplicates' },
  body: JSON.stringify(suppliersArray),
});
```

### 3.3 Order of Operations

Both loaders must respect FK dependencies:

```
1. tenants
2. app_settings
3. wood_species
4. storage_yards
5. storage_lots (FK → yards)
6. suppliers
7. brokers
8. perhutani_contracts
9. contract_sortiment_items (FK → contracts)
10. contract_receipts (FK → contracts)
11. receiving_manifests (FK → suppliers, nullable FK → brokers, nullable FK → payment_forms)
12. receiving_items (FK → manifests, FK → species, nullable FK → lots, nullable FK → payment_forms)
13. payment_forms (circular FK — handled via 2-pass: insert without payment_form_id refs, then update)
14. payment_form_lines (FK → payment_forms)
15. sales_records (FK → lots, FK → species)
16. sawmill_production_records (FK → lots, FK → species)
17. stock_sorting_records (FK → source lot, FK → target lot, FK → species)
```

**Payment forms circular dependency** (manifest → payment_form AND payment_form → records):
- Phase 1: Insert payment_forms without record ID back-references (empty JSON arrays)
- Phase 2: Insert receiving_manifests with payment_form_id FKs
- Phase 3: Update payment_forms to populate recordIds / itemIds arrays
- Phase 4: Insert payment_form_lines

### 3.4 Pre-Seed Validation

Before executing writes:
- [ ] Fixture file syntax check (all exports resolve)
- [ ] Internal consistency check: every FK string in fixtures must have a matching parent ID
- [ ] Date validity: all dates within declared range `2026-07-22` to `2026-10-22`
- [ ] Numeric sanity: no negative volumes, no negative prices (except intentional nulls for PENDING)

Validation runs as part of `seedDatabase()` function; failure throws before any DB write.

---

## 4. Pure Logic (`fixtures.ts`)

### 4.1 Exported Shape

```ts
// src/persistence/seed/fixtures.ts (barrel)
export { SEED_TENANTS } from './fixtures-master-data.ts';
export { SEED_YARDS } from './fixtures-master-data.ts';
export { SEED_LOTS } from './fixtures-master-data.ts';
export { SEED_SPECIES } from './fixtures-master-data.ts';
export { SEED_SUPPLIERS } from './fixtures-master-data.ts';
export { SEED_BROKERS } from './fixtures-master-data.ts';
export { SEED_SETTINGS } from './fixtures-master-data.ts';

export { SEED_CONTRACTS } from './fixtures-contracts.ts';
export { SEED_SORTIMENT_ITEMS } from './fixtures-contracts.ts';
export { SEED_CONTRACT_RECEIPTS } from './fixtures-contracts.ts';

export { SEED_MANIFESTS } from './fixtures-receiving.ts';
export { SEED_RECEIVING_ITEMS } from './fixtures-receiving.ts';
export { SEED_WOOD_RECORDS } from './fixtures-receiving.ts';  // Flattened for backward compat

export { SEED_SALES } from './fixtures-sales.ts';

export { SEED_PRODUCTION } from './fixtures-production.ts';
export { SEED_SORTING } from './fixtures-production.ts';

export { SEED_PAYMENT_FORMS } from './fixtures-payment-forms.ts';
export { SEED_PAYMENT_FORM_LINES } from './fixtures-payment-forms.ts';

export { validateFixtureConsistency } from './fixtures-helpers.ts';
```

### 4.2 Validation Function

```ts
// src/persistence/seed/fixtures-helpers.ts
export function validateFixtureConsistency(): {
  ok: boolean;
  errors: string[];
}
```

**Checks performed:**
- Every `supplierId` in SEED_CONTRACTS references a SEED_SUPPLIERS id
- Every `contractId` in SEED_SORTIMENT_ITEMS and SEED_CONTRACT_RECEIPTS references SEED_CONTRACTS
- Every `yardId` + `kavlingNumber` in SEED_RECEIVING_ITEMS/SEED_SALES/SEED_PRODUCTION/SEED_SORTING references SEED_LOTS
- Every `speciesId` references SEED_SPECIES
- Every `brokerId` in SEED_MANIFESTS (if non-null) references SEED_BROKERS
- Every `paymentFormId` reference points to a valid SEED_PAYMENT_FORMS id
- All dates within range
- All non-null numeric fields positive

Returns `{ ok: false, errors: [...] }` on any violation; seed loader must abort.

### 4.3 ID Convention

Deterministic human-readable IDs for easy debugging:

- Tenants: `default-tenant`
- Yards: `YARD-TMR`, `YARD-UTR`, `YARD-BRT`
- Lots: `LOT-TMR-01`, ..., `LOT-BRT-05`
- Species: `SPC-JATI`, `SPC-MRB`, `SPC-MER`, etc.
- Suppliers: `SPL-001` to `SPL-007`
- Brokers: `BRK-001` to `BRK-005`
- Contracts: `CTR-RBL-2026-01` (KPH-year-seq)
- Sortiment items: `SRT-{contractId}-{seq}`
- Contract receipts: `CRC-{contractId}-{seq}`
- Receiving manifests: `MFT-2026-W{weeknum}-{seq}`
- Receiving items: `ITM-{manifestId}-{seq}`
- Wood records (flattened): same as manifest+item combo, backward compat
- Sales: `SLS-2026-{seq}`
- Production: `PROD-2026-{seq}`
- Sorting: `SRT-2026-{seq}`
- Payment forms: `PAY-W{weeknum}-{supplier}-{species}`
- Payment form lines: `PFL-{formId}-{seq}`

---

## 5. Loader Scripts

### 5.1 `scripts/seed-db.ts` (SQLite)

```ts
import { createSqliteDatabase } from '../src/persistence/sqlite/db.ts';
import { runMigrations } from '../src/persistence/sqlite/migrations.ts';
import * as fixtures from '../src/persistence/seed/fixtures.ts';

export function seedDatabase(customDbPath?: string): SeedResult {
  // 1. Validate fixtures before any DB write
  const check = fixtures.validateFixtureConsistency();
  if (!check.ok) {
    throw new Error(`Fixture validation failed:\n${check.errors.join('\n')}`);
  }

  const db = createSqliteDatabase(customDbPath);
  runMigrations(db);

  // 2. Upsert in FK-safe order (see Section 3.3)
  const result = db.transaction(() => {
    const counts = {
      tenants: upsertTenants(db, fixtures.SEED_TENANTS),
      settings: upsertSettings(db, fixtures.SEED_SETTINGS),
      species: upsertSpecies(db, fixtures.SEED_SPECIES),
      yards: upsertYards(db, fixtures.SEED_YARDS),
      lots: upsertLots(db, fixtures.SEED_LOTS),
      suppliers: upsertSuppliers(db, fixtures.SEED_SUPPLIERS),
      brokers: upsertBrokers(db, fixtures.SEED_BROKERS),
      contracts: upsertContracts(db, fixtures.SEED_CONTRACTS),
      sortimentItems: upsertSortimentItems(db, fixtures.SEED_SORTIMENT_ITEMS),
      contractReceipts: upsertContractReceipts(db, fixtures.SEED_CONTRACT_RECEIPTS),
      paymentFormsPass1: upsertPaymentFormsNoRefs(db, fixtures.SEED_PAYMENT_FORMS),
      manifests: upsertManifests(db, fixtures.SEED_MANIFESTS),
      receivingItems: upsertReceivingItems(db, fixtures.SEED_RECEIVING_ITEMS),
      paymentFormsPass2: updatePaymentFormRefs(db, fixtures.SEED_PAYMENT_FORMS),
      paymentFormLines: upsertPaymentFormLines(db, fixtures.SEED_PAYMENT_FORM_LINES),
      sales: upsertSales(db, fixtures.SEED_SALES),
      production: upsertProduction(db, fixtures.SEED_PRODUCTION),
      sorting: upsertSorting(db, fixtures.SEED_SORTING),
    };
    return counts;
  })();

  console.log(formatSeedReport(result));
  return result;
}
```

### 5.2 `scripts/seed-supabase.ts` (Supabase)

Same structure, same fixture consumption, different HTTP calls to PostgREST:

```ts
export async function seedSupabase(): Promise<SeedResult> {
  const check = fixtures.validateFixtureConsistency();
  if (!check.ok) {
    throw new Error(`Fixture validation failed:\n${check.errors.join('\n')}`);
  }

  // Sequential upserts respecting FK order
  const result = {
    tenants: await upsertViaSupabase('tenants', fixtures.SEED_TENANTS),
    settings: await upsertViaSupabase('app_settings', [fixtures.SEED_SETTINGS]),
    species: await upsertViaSupabase('wood_species', fixtures.SEED_SPECIES),
    yards: await upsertViaSupabase('storage_yards', fixtures.SEED_YARDS),
    lots: await upsertViaSupabase('storage_lots', fixtures.SEED_LOTS),
    // ... (same order as SQLite)
  };

  console.log(formatSeedReport(result));
  return result;
}
```

### 5.3 CLI Entry Points

Both scripts invokable at module execution:

```ts
// seed-db.ts
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase();
}

// seed-supabase.ts
if (import.meta.url === `file://${process.argv[1]}`) {
  seedSupabase().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
}
```

### 5.4 Output Format

Both loaders print a summary table:

```
✅ Seed completed successfully (SQLite)
   Target: data/wood_inventory.db
   Elapsed: 142ms

   Entity                      Count   Status
   ─────────────────────────────────────────
   Tenants                        1    upserted
   Settings                       1    upserted
   Species                        8    upserted
   Yards                          3    upserted
   Lots                          15    upserted
   Suppliers                      7    upserted
   Brokers                        5    upserted
   Contracts                      4    upserted
   Sortiment Items               10    upserted
   Contract Receipts              6    upserted
   Payment Forms                  6    upserted (2-pass)
   Receiving Manifests           10    upserted
   Receiving Items               18    upserted
   Payment Form Lines            15    upserted
   Sales                         10    upserted
   Production                     8    upserted
   Sorting                        5    upserted
   ─────────────────────────────────────────
   TOTAL                        132 records
```

---

## 6. Acceptance Criteria

1. `npm run db:seed` runs successfully, exits 0.
2. `npm run db:seed:supabase` runs successfully, exits 0.
3. Running either command twice in a row produces identical final DB state (idempotent).
4. All 17 entity types have hand-crafted fixture data with realistic Indonesian names.
5. FK consistency validated: `validateFixtureConsistency()` returns `ok: true`.
6. After seeding, `/contracts` page shows 4 contracts with correct remaining stock calculations.
7. After seeding, `/payment-forms` shows 6 forms with mix of DRAFT/ISSUED/PAID.
8. After seeding, `/pending-pricing` shows ~5 records awaiting price input.
9. After seeding, `/inventory` shows lots with non-zero remaining stock.
10. All existing seeder entry points (`npm run db:seed`, `npm run db:seed:supabase`) continue to work.
11. 3 legacy files deleted: `src/persistence/seed-data.ts`, old `scripts/seed-db.ts`, old `scripts/seed-supabase.ts`.
12. No references to old `SEED_WOOD_RECORDS`, `SEED_SUPPLIERS`, `SEED_BROKERS` exports from `seed-data.ts` remain in code (grep check).
13. `npm test` → 0 failures (existing tests continue to pass).
14. `npm run drift:check` → ✅ No new drift.
15. `npm run build:check` → 0 errors.

---

## 7. Verification Checklist (Grep-Able Audit)

### 7.1 Fixture Module Structure

```bash
ls src/persistence/seed/fixtures.ts \
   src/persistence/seed/fixtures-master-data.ts \
   src/persistence/seed/fixtures-contracts.ts \
   src/persistence/seed/fixtures-receiving.ts \
   src/persistence/seed/fixtures-sales.ts \
   src/persistence/seed/fixtures-production.ts \
   src/persistence/seed/fixtures-payment-forms.ts \
   src/persistence/seed/fixtures-helpers.ts
# EXPECT: all 8 files found
```

### 7.2 Fixture Exports

```bash
grep -c "export const SEED_" src/persistence/seed/*.ts
# EXPECT: >= 17 total export const SEED_* declarations
```

### 7.3 Validation Function

```bash
grep -c "export function validateFixtureConsistency" src/persistence/seed/fixtures-helpers.ts
# EXPECT: 1
```

### 7.4 Legacy Deletion

```bash
# Old files removed
test ! -f src/persistence/seed-data.ts && echo OK || echo FAIL
# EXPECT: OK

# No references to old exports remain
grep -rn "SEED_WOOD_RECORDS\|SEED_SUPPLIERS\|SEED_BROKERS" src/ app/ test/ scripts/ --include="*.ts" --include="*.tsx" | \
  grep -v "src/persistence/seed/" | \
  grep -v "test/.*seed.*test"
# EXPECT: zero output (all references replaced)
```

### 7.5 Loader Scripts

```bash
# SQLite loader
grep -c "export function seedDatabase" scripts/seed-db.ts
# EXPECT: 1

# Supabase loader
grep -c "export async function seedSupabase" scripts/seed-supabase.ts
# EXPECT: 1

# Both consume unified fixture barrel
grep -c "from.*fixtures" scripts/seed-db.ts scripts/seed-supabase.ts
# EXPECT: >= 2
```

### 7.6 Idempotency Test (Manual)

```bash
# Run seed twice, compare DB file hashes
npm run db:seed
md5 data/wood_inventory.db > /tmp/seed1.md5
npm run db:seed
md5 data/wood_inventory.db > /tmp/seed2.md5
# Minor differences in updated_at timestamps acceptable; row counts must match
```

### 7.7 Overall Gate

```bash
npm run drift:check && npm test && npm run build:check
# EXPECT: all green
```

---

## 8. Non-Goals

- No pseudo-random generation (hand-crafted is explicit choice).
- No CLI arguments for partial seeding, custom data, or dry-run (CLI complication unneeded for v1).
- No seed state management UI.
- No seed data versioning / snapshots (git handles this).
- No multi-tenant seeding (Q7=A).
- No performance stress-test data (defer to future dedicated plan).
- No deletion/truncation mode (upsert handles reruns; manual `DROP TABLE` if full reset needed).

---

## 9. Dependencies

- **Blocks:** None.
- **Blocked by:** None (all 7 feature entities already shipped and have proper schema).
- **Related:**
  - ADR-0001 (Dual-mode persistence — this spec maintains the symmetry)
  - ADR-0011 (NEW — rationale for shared fixture + split loaders design)
  - All existing entity specs (contracts, payment forms, production, sorting, pending pricing, brokers)
