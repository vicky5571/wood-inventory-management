# Plan: Database Seeder Rewrite — Realistic Fixtures with FK Consistency

**Date:** 2026-10-22
**Priority:** P2 (Developer Experience — unblocks new session setup + demo)
**Status:** COMPLETED
**Related Spec:** `docs/superpowers/specs/2026-10-22-database-seeder-rewrite-design.md`
**Related ADR:** ADR-0011

---

## 1. Context Summary

Replace 3 legacy seed files with unified fixture module (`src/persistence/seed/`) and 2 rewritten loader scripts. Hand-crafted 5-10 records per entity, 17 entities total, realistic Indonesian names, deterministic FK chains, upsert idempotency, 3-month date range.

Design detail in spec. This plan is implementation steps.

---

## 2. Implementation Checklist

### Phase 1: Fixture Module Scaffold
- [x] Create directory `src/persistence/seed/`
- [x] Create skeleton `src/persistence/seed/fixtures.ts` (barrel export)
- [x] Create skeleton `src/persistence/seed/fixtures-helpers.ts` with:
  - Shared date constants (`SEED_DATE_RANGE_START = '2026-07-22'`, `SEED_DATE_RANGE_END = '2026-10-22'`)
  - Date utility: `daysAgo(n: number): string` → ISO date
  - ID convention helpers (if any)
  - `validateFixtureConsistency()` stub returning `{ ok: true, errors: [] }` initially

### Phase 2: Master Data Fixtures
- [x] Create `src/persistence/seed/fixtures-master-data.ts`:
  - [x] `SEED_TENANTS` (1 record: `default-tenant`)
  - [x] `SEED_SETTINGS` (1 record: AppSettings with `companyName: 'PT. BRILLIANT JAYA WOOD INDUSTRY'`)
  - [x] `SEED_SPECIES` (8 records: Jati, Merbau, Meranti, Mahoni, Sengon, Jabon, Pinus, Keruing)
  - [x] `SEED_YARDS` (3 records: TPK Timur, TPK Utara, TPK Barat)
  - [x] `SEED_LOTS` (15 records: 5 per yard)
  - [x] `SEED_SUPPLIERS` (7 records per spec Section 2.5)
  - [x] `SEED_BROKERS` (5 records per spec Section 2.5)

### Phase 3: Contract Fixtures
- [x] Create `src/persistence/seed/fixtures-contracts.ts`:
  - [x] `SEED_CONTRACTS` (4 records: Perhutani KPH Randublatung, Mantingan, Cepu, Pati)
  - [x] `SEED_SORTIMENT_ITEMS` (10 records cross-referencing contracts)
  - [x] `SEED_CONTRACT_RECEIPTS` (6 records with mix of paid/partial)

### Phase 4: Receiving Fixtures
- [x] Create `src/persistence/seed/fixtures-receiving.ts`:
  - [x] `SEED_MANIFESTS` (10 records across 3 months, mix Perhutani/private)
  - [x] `SEED_RECEIVING_ITEMS` (~18 records with mix PRICED/PENDING)
  - [x] `SEED_WOOD_RECORDS` (flattened derived for backward compat where needed)

### Phase 5: Sales + Production + Sorting Fixtures
- [x] Create `src/persistence/seed/fixtures-sales.ts`:
  - [x] `SEED_SALES` (10 records across date range)
- [x] Create `src/persistence/seed/fixtures-production.ts`:
  - [x] `SEED_PRODUCTION` (8 records with yields 50-85%)
  - [x] `SEED_SORTING` (5 records with various reasons)

### Phase 6: Payment Form Fixtures (Complex — Last)
- [x] Create `src/persistence/seed/fixtures-payment-forms.ts`:
  - [x] `SEED_PAYMENT_FORMS` (6 records: 2 DRAFT, 2 ISSUED, 2 PAID)
  - [x] Each PaymentForm references weekly window dates matching SEED_MANIFESTS
  - [x] `SEED_PAYMENT_FORM_LINES` (15 records cross-referencing forms + receiving items)
  - [x] Ensure `preprintedNumber` filled for ISSUED/PAID, empty for DRAFT
  - [x] Compute `terbilang` field manually or via helper (if terbilang helper exists)

### Phase 7: Barrel Export + Validation
- [x] Update `src/persistence/seed/fixtures.ts` to re-export all SEED_* constants from submodules
- [x] Implement `validateFixtureConsistency()` in `fixtures-helpers.ts`:
  - [x] Check every FK string resolves to a parent record
  - [x] Check all dates within range
  - [x] Check numeric sanity (non-negative except intentional null)
  - [x] Return `{ ok: boolean, errors: string[] }`
- [x] Create `test/seed-fixtures.test.ts`:
  - [x] `validateFixtureConsistency()` returns `ok: true` for current fixtures
  - [x] Mutation test: inject invalid FK → returns `ok: false` with specific error
  - [x] Date range enforcement: inject out-of-range date → returns `ok: false`
  - [x] Entity count assertions match spec Section 2.2 table

### Phase 8: SQLite Loader Rewrite
- [x] Backup legacy: `git mv scripts/seed-db.ts scripts/seed-db.ts.bak` (restore if issues)
- [x] Create new `scripts/seed-db.ts`:
  - [x] Import all SEED_* from `src/persistence/seed/fixtures.ts`
  - [x] Call `validateFixtureConsistency()` first, throw if invalid
  - [x] Implement upsert helpers for each entity (one function per table)
  - [x] Use `INSERT ... ON CONFLICT(id) DO UPDATE SET ... updated_at = datetime('now')` pattern
  - [x] Wrap all writes in `db.transaction(() => { ... })()` for atomicity
  - [x] 2-pass payment forms: insert without ref arrays, update after manifests inserted
  - [x] `formatSeedReport(result)` prints summary table
  - [x] CLI entry point: `if (import.meta.url === file://${process.argv[1]}) { seedDatabase(); }`
- [x] Delete `scripts/seed-db.ts.bak` after verification

### Phase 9: Supabase Loader Rewrite
- [x] Backup legacy: `git mv scripts/seed-supabase.ts scripts/seed-supabase.ts.bak`
- [x] Create new `scripts/seed-supabase.ts`:
  - [x] Import all SEED_* from unified fixture barrel
  - [x] Call `validateFixtureConsistency()` first
  - [x] Implement `upsertViaSupabase(table, rows)` using PostgREST `on_conflict` + `Prefer: resolution=merge-duplicates` header
  - [x] Sequential upserts respecting FK order
  - [x] Same 2-pass pattern for payment forms
  - [x] Error handling with meaningful messages (HTTP status + table name)
  - [x] CLI entry point with `.catch(err => process.exit(1))`
- [x] Delete `scripts/seed-supabase.ts.bak` after verification

### Phase 10: Legacy File Deletion
- [x] Delete `src/persistence/seed-data.ts` (replaced by `src/persistence/seed/`)
- [x] Verify no references remain: `grep -rn "from.*seed-data" src/ app/ test/ scripts/`
  - If references found → update imports to point to `src/persistence/seed/fixtures.ts`
- [x] Delete any old `.bak` files

### Phase 11: Verification Gate
- [x] `npm run drift:check` → ✅ No new drift
- [x] `npm test` → 0 failures (new test suite + existing tests)
- [x] `npm run build:check` → 0 TypeScript errors
- [x] `npm run db:seed` → runs successfully, prints summary table
- [x] `npm run db:seed` again → idempotent (no errors, same counts)
- [x] If Supabase credentials available: `npm run db:seed:supabase` → runs successfully
- [x] Manual smoke test:
  - [x] `/contracts` shows 4 contracts with calculated fulfillment
  - [x] `/payment-forms` shows 6 forms (2 DRAFT, 2 ISSUED, 2 PAID)
  - [x] `/pending-pricing` shows ~5 records with null prices
  - [x] `/inventory` shows lots with non-zero remaining stock
  - [x] `/suppliers` shows 7 suppliers with correct scorecard metrics
  - [x] `/brokers` shows 5 brokers with commission totals
  - [x] `/production` shows 8 production records with yield calculations
  - [x] `/sorting` shows 5 sorting records

### Phase 12: Documentation
- [x] Mark this plan `Status: COMPLETED` after merge
- [x] Update `docs/SESSION_STATE.md`:
  - [x] Record completion under "Recently Completed"
  - [x] Note that new sessions can run `npm run db:seed` for full project state
- [x] Append `CHANGELOG.md` entry under `[Unreleased]`:
  ```
  ### Changed
  - **Database Seeders Rewritten**: unified fixture architecture replacing 3 legacy
    files. Hand-crafted 130+ realistic records across 17 entities covering all 7
    shipped feature modules (contracts, payment forms, production, sorting,
    pending pricing, broker master, discrepancy alarm). Deterministic FK chains,
    upsert idempotency, 3-month date range.
    - Spec: docs/superpowers/specs/2026-10-22-database-seeder-rewrite-design.md
    - ADR: ADR-0011 (Shared Fixture Source vs Backend-Specific Seeders)
  ```

---

## 3. File Change Manifest

| File | Action | Est. LOC |
|---|---|---|
| `src/persistence/seed/fixtures.ts` | Create (barrel) | ~30 |
| `src/persistence/seed/fixtures-helpers.ts` | Create | ~120 |
| `src/persistence/seed/fixtures-master-data.ts` | Create | ~250 |
| `src/persistence/seed/fixtures-contracts.ts` | Create | ~200 |
| `src/persistence/seed/fixtures-receiving.ts` | Create | ~400 |
| `src/persistence/seed/fixtures-sales.ts` | Create | ~150 |
| `src/persistence/seed/fixtures-production.ts` | Create | ~180 |
| `src/persistence/seed/fixtures-payment-forms.ts` | Create | ~250 |
| `test/seed-fixtures.test.ts` | Create | ~150 |
| `scripts/seed-db.ts` | Rewrite (120 LOC → ~250 LOC) | +130 |
| `scripts/seed-supabase.ts` | Rewrite (338 LOC → ~280 LOC) | -58 |
| `src/persistence/seed-data.ts` | **Delete** | -236 |

**Net:** +1,800 LOC fixture data, -236 legacy, +130 loader logic refactor. 11 new files + 2 rewrites + 1 deletion.

**All fixture files under 500 LOC** (split by entity domain for maintainability).

---

## 4. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Fixture FK references break during authoring (typo in ID) | `validateFixtureConsistency()` test catches at build time. |
| 130+ records tedious to hand-craft | Follow spec Section 2.2 count exactly. Group related records (e.g. 3 receiving items for 1 manifest) for sanity. |
| Terbilang field in payment forms error-prone to type manually | Import `terbilang()` helper (shipped in Lembar Tagihan refactor) and compute at fixture authoring time via comment-doc. |
| Payment form 2-pass insert breaks on Supabase (PostgREST sync) | Use `Prefer: return=minimal` + wait for completion between passes. Document pattern. |
| Idempotency breaks if schema evolves | Fixture updates ride with schema migrations — co-locate changes. |
| Legacy test file depends on old `SEED_WOOD_RECORDS` shape | Phase 10 grep validates no leftover refs. If found, update imports. |
| Supabase credentials missing in local dev | Supabase loader gracefully errors with "SUPABASE_URL not set" — doesn't block SQLite seeder. |
| Deletion of `seed-data.ts` breaks production code (not just tests) | Phase 10 grep scope includes `src/` + `app/` — not just tests. |

---

## 5. Done Criteria

- All Phase 1-12 checkboxes ticked.
- `npm run drift:check && npm test && npm run build:check` all green.
- Both seeders run idempotently (verified via rerun).
- All 7 shipped feature UI pages populate with meaningful data after seed.
- Legacy `seed-data.ts` deleted; no residual imports.
- Documentation updates committed (SESSION_STATE, CHANGELOG, ADR-0011).
- Commit message:
  ```
  feat(seeder): rewrite database seeders with unified fixtures and FK consistency

  Replaces 3 legacy seed files with modular fixture architecture under
  src/persistence/seed/. Hand-crafted 130+ realistic records across 17 entities
  covering contracts, payment forms, production, sorting, pending pricing,
  broker master, and discrepancy alarm. Deterministic FK chains, upsert
  idempotency, 3-month date range.

  Spec: docs/superpowers/specs/2026-10-22-database-seeder-rewrite-design.md
  Plan: docs/superpowers/plans/2026-10-22-database-seeder-rewrite.md
  Refs: ADR-0011
  ```

---

## 6. Dependencies

- **Blocks:** None.
- **Blocked by:** None.
- **Related:**
  - All 17 entity types must exist in `src/types/index.ts` (verified: already shipped).
  - `terbilang()` helper (shipped with Lembar Tagihan refactor) used during fixture authoring.
  - ADR-0001 (dual-mode persistence) — this plan preserves the 2-target symmetry.
