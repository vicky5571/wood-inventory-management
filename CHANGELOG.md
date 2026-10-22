# Changelog

All notable changes to the Wood & Timber Inventory Management System are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Each entry references the governing Spec, Plan, and (where applicable) ADR documents.

---

## [Unreleased]

### Changed
- **DAO**: Added `findByIdIncludingInactive(id)` method to UserRepository. Replaces O(N) listAll scan workaround at 3 call-sites (session.ts failure-reason disambiguation + AuditedUserRepository.update + AuditedUserRepository.deactivate). Resolves TD-002. Zero behavior change from caller perspective; indexed PK lookup.
  - Spec: `docs/superpowers/specs/2026-10-22-dao-inactive-user-lookup-design.md`
  - Plan: `docs/superpowers/plans/2026-10-22-dao-inactive-user-lookup.md`
  - Refs: ADR-0013, TD-002
- **Auth session**: `getAuthenticatedUser` now performs fresh DAO lookup on every call. User state changes (deactivation, role, permissions) take effect within one request instead of up to 7-day JWT TTL. JWT payload role: identity + session-validity proof only. `/api/auth/me` returns DB-fresh user with new `reason` field on 401. Pre-existing tokens remain compatible.
  - Spec: `docs/superpowers/specs/2026-10-22-session-invalidation-design.md`
  - Plan: `docs/superpowers/plans/2026-10-22-session-invalidation.md`
  - ADR: `docs/adr/0014-fresh-user-lookup-per-request.md`, `docs/adr/0013-user-management-architecture.md`
- **Auth storage**: migrated `PRESET_USERS` hardcoded array to persistent `users` table in SQLite + Supabase. Introduces `UserRepository` DAO. `authenticateUser` and `getUserById` now query DAO. `PRESET_USERS` retained as seed source only. `getUserById` signature changed from sync to async.
  - Spec: `docs/superpowers/specs/2026-10-22-user-storage-migration-design.md`
  - Plan: `docs/superpowers/plans/2026-10-22-user-storage-migration.md`
  - ADR: `docs/adr/0013-user-management-architecture.md`

### Added
- **Auth audit**: Extended ActivityActionType with 7 user-lifecycle actions (USER_CREATED, USER_UPDATED, USER_ROLE_CHANGED, USER_PERMISSION_CHANGED, USER_DEACTIVATED, USER_REACTIVATED, USER_PASSWORD_CHANGED). AuditedUserRepository decorator wraps Spec A DAO to emit structured audit entries on admin mutations. Password values never logged. Zero schema change.
  - Spec: `docs/superpowers/specs/2026-10-22-user-audit-log-extension-design.md`
  - Plan: `docs/superpowers/plans/2026-10-22-user-audit-log-extension.md`
  - ADR: `docs/adr/0013-user-management-architecture.md`
- **Tally Create Permission Flag** — introduces optional `AuthUser.permissions.tallyCreate` capability flag orthogonal to the `roleLevel` hierarchy. Allows designated Level 2 warehouse operators (`gudang@timber.id`) to submit Tally Lapangan manifests at `/tally` while keeping all financial and write restrictions intact. Dedicated endpoint `POST /api/records/tally` with relaxed guard isolates access.
  - Spec: `docs/superpowers/specs/2026-10-22-tally-create-permission-design.md`
  - Plan: `docs/superpowers/plans/2026-10-22-tally-create-permission.md`
  - ADR: `docs/adr/0012-tally-create-permission-flag.md`
- **Drift Prevention Infrastructure** — `AGENTS.md` session protocol, `scripts/drift-check.ts` executable invariant verifier with baseline mode, `docs/SESSION_STATE.md` cross-session handoff artifact, `docs/adr/` directory for architecture decision records, this CHANGELOG. [AGENTS.md]
- **ADR-0001** — Dual-mode persistence (SQLite + Supabase). [docs/adr/0001-dual-mode-persistence-sqlite-and-supabase.md]
- **ADR-0002** — NULL vs Zero sentinel for pending price. [docs/adr/0002-null-vs-zero-for-pending-price.md]
- **ADR-0003** — Loose contract-record linkage. [docs/adr/0003-loose-contract-record-linkage.md]
- **ADR-0004** — Broker as separate entity from Supplier. [docs/adr/0004-broker-separate-from-supplier.md]
- **ADR-0005** — Free-text autocomplete over master catalog. [docs/adr/0005-free-text-product-autocomplete.md]
- **ADR-0009** — Sidebar section grouping (not flat list, not collapsible). [docs/adr/0009-sidebar-section-grouping-vs-flat-list.md]
- **ADR-0010** — Role-based nav filter default state. [docs/adr/0010-role-based-nav-filter-default-state.md]
- **ADR-0011** — Shared fixture source with split loaders. [docs/adr/0011-shared-fixture-source-split-loaders.md]
- **Spec Verification Checklist** sections appended to all 7 feature specs (grep-able audit commands with EXPECT clauses).
- **15 retrospective design specs** for historical plans (2026-10-14 through 2026-10-20) that previously lacked spec files. Resolves `MISSING_SPEC` baseline violations.
- **Cleanup plans drafted** (ready for execution, not yet executed):
  - `plans/2026-10-21-refactor-login-page-god-file.md` — reduce `app/login/page.tsx` from 269 LOC to <150 LOC
  - `plans/2026-10-21-cleanup-ssot-violations-rename.md` — resolve 21 SSOT violations via rename + selective moves
  - `specs/2026-10-21-type-safety-replace-any-design.md` + `plans/2026-10-21-type-safety-replace-any.md` — replace 46 unjustified `any` usages with proper types or type guards

### Changed
- **Database Seeders Rewritten** — unified modular fixture architecture replacing 3 legacy seed files. Hand-crafted 130+ realistic records across 17 entities covering all shipped feature modules (contracts, payment forms, production, sorting, pending pricing, broker master, discrepancy alarm). Deterministic FK chains, upsert idempotency, 3-month date range:
  - Created modular fixtures in `src/persistence/seed/`: `fixtures-master-data.ts`, `fixtures-contracts.ts`, `fixtures-receiving.ts`, `fixtures-sales.ts`, `fixtures-production.ts`, `fixtures-payment-forms.ts`, `fixtures-helpers.ts`, `fixtures.ts`.
  - Added pure `validateFixtureConsistency()` asserting 100% relational integrity, valid date ranges, and positive values.
  - Rewrote `scripts/seed-db.ts` for SQLite with atomic transactions, 2-pass payment forms, and `INSERT ... ON CONFLICT DO UPDATE` upserts.
  - Rewrote `scripts/seed-supabase.ts` for Supabase with PostgREST `Prefer: resolution=merge-duplicates`.
  - Removed deprecated `src/persistence/seed-data.ts` and updated all callers across `src/`, `app/`, `scripts/`, `test/`, and `supabase/seed.sql`.
  - Spec: `docs/superpowers/specs/2026-10-22-database-seeder-rewrite-design.md`
  - Plan: `docs/superpowers/plans/2026-10-22-database-seeder-rewrite.md`
  - ADR: `docs/adr/0011-shared-fixture-source-split-loaders.md`
- **Sidebar Navigation Grouping & Role-Based Filter** — reorganized 14-item flat list into 5 semantic sections (Dashboard, Operasi Harian, Stok & Tagihan, Data Master, Admin) with role-based item filtering (Settings hidden from Staff/Monitor):
  - Defined `NavSectionConfig` interface and `NAV_SECTIONS` constant in `src/components/layout/nav-config.ts`.
  - Added pure `filterNavSections` helper with role-based filtering (`minRoleLevel: 1` for Settings).
  - Maintained backward-compatibility `NAV_ITEMS` derived export via `flatMap`.
  - Updated `Sidebar.tsx` coordinator (< 250 LOC: 233 LOC) to render sections with bilingual labels.
  - Added comprehensive test suite `test/nav-config.test.ts` (9 tests passing).
  - Spec: `docs/superpowers/specs/2026-10-22-sidebar-grouping-and-role-filter-design.md`
  - Plan: `docs/superpowers/plans/2026-10-22-sidebar-grouping-and-role-filter.md`
  - ADRs: ADR-0009, ADR-0010
- **`scripts/drift-check.ts`** — added exemption for plans with prefix `refactor-`, `cleanup-`, or `chore-` (single-file hygiene work does not require spec pairing).
- **Baseline** — reduced from 84 → 0 violations (100% debt elimination across GOD_FILE, SSOT_VIOLATION, MISSING_SPEC, MISSING_DOC, and UNJUSTIFIED_ANY).
- **Type Safety: Replace Unjustified `any`** — replaced all unjustified `any` usages with proper row interfaces, `unknown` + type guards, or safe property checks:
  - Added centralized error normalization utility `src/utils/error-message.ts` (`extractErrorMessage`) with test suite `test/error-message.test.ts`.
  - Added persistence row interfaces `SupabaseBrokerRow`, `SqliteStorageYardRow`, `SqliteStorageLotRow`, `SupabaseYardRow`, `SupabaseLotRow`.
  - Typed contract status selection and payment forms modal handlers (`Promise<unknown>`).
  - Replaced dynamic `globalThis` property checks in `record-draft.ts` and `indexed-db-adapter.ts`.
  - Zero runtime behavior change. `UNJUSTIFIED_ANY` count: 46 → 0.
  - Spec: `docs/superpowers/specs/2026-10-21-type-safety-replace-any-design.md`
  - Plan: `docs/superpowers/plans/2026-10-21-type-safety-replace-any.md`
- **Payment Form → Lembar Tagihan Refactor** — aligned PaymentForm entity, UI, and print layout to match physical form `LEMBAR TAGIHAN / 请款单` from PT. Brilliant Jaya Wood Industry:
  - Renamed `formNumber` → `preprintedNumber` (user-input manual, no auto-generation per ADR-0006).
  - Added `issueDate`, `terbilang`, `totalAmountIDR`, `lines[]`, `notes` fields.
  - Line items restructured to 6-column physical table (`kategori`, `konten`, `tujuan`, `hargaSatuanIDR`, `jumlah`, `unit`, `totalIDR`).
  - Added `LineItemUnit` enum (`'m³' | 'batang' | 'rit' | 'lain-lain'`).
  - Added `AppSettings.companyName` (editable from `/settings`, default: "PT. BRILLIANT JAYA WOOD INDUSTRY").
  - Created zero-dependency pure Indonesian amount-in-words helper `src/utils/terbilang.ts` with 11 comprehensive unit tests (`test/terbilang.test.ts`).
  - Created `src/components/payment-forms/LineItemEditor.tsx` interactive 6-column editor for DRAFT forms.
  - Created `src/components/payment-forms/PaymentFormMetaEditor.tsx` subcomponent.
  - Updated `src/components/payment-forms/PaymentFormLinesTable.tsx` for read-only 6-column presentation of issued/paid forms.
  - Rewrote `src/components/payment-forms/PrintPaymentFormModal.tsx` to A4 portrait bilingual layout (Indonesian + Mandarin) with preprinted serial number, date breakdown, and 5 template-only blank signature slots.
  - Updated SQLite schema migrations (`payment_form_lines`, `preprinted_number`, `issue_date`, `total_amount_idr`, `terbilang`, `company_name`) and Supabase migration `20261022000000_lembar_tagihan_refactor.sql`.
  - Deleted obsolete `payment-form-number.ts` and `payment-form-numbering.test.ts`.
  - Spec: `docs/superpowers/specs/2026-10-21-weekly-payment-form-design.md` Section 13
  - Plan: `docs/superpowers/plans/2026-10-22-refactor-payment-form-to-lembar-tagihan.md`
  - ADRs: ADR-0006, ADR-0007
- **ADR-0006** added — Pre-printed form number manual input.
- **ADR-0007** added — Terbilang zero-dependency implementation.
- **ADR-0008** added (retrospective) — Expand SSOT exemption suffixes to 17 total (adds Input, Row, Adapter, ChartData, Shape, Value, Action, Option, Field, Direction). Documents design decision realized in commit `5292aed` for future audit traceability.

---

## [2026-10-21] — Client Feedback Items #1-#7 Shipped

Seven client-requested modules implemented, tested, and merged. All verified via `npm test` (741 pass, 0 fail), `npm run build:check` (0 errors), and manual smoke test.

### Added — Inventory Stock View (Item #1)
- Live lot balance dashboard at `/inventory` displaying remaining stock per `(storageYard, kavlingNumber)` across 4 stock flows (inbound, outbound, consumed, transferred).
- Pure helper `aggregateAllLotBalances()` in `src/utils/stock-balance.ts` enumerates all unique lots and computes balances in a single pass.
- `LotStockBalance` interface extended with `consumedPieces/VolumeM3` and `transferredIn/OutPieces/VolumeM3` fields (SSOT).
- 5 UI components: `InventoryView` (coordinator), `InventoryKpiStrip`, `InventoryToolbar`, `InventoryTable`, `InventoryEmptyState`.
- Depleted-lot visibility toggle (default: hidden).
- Case-insensitive search + yard dropdown filter.
- Nav entry "Inventaris" / 库存.

Spec: `docs/superpowers/specs/2026-10-20-inventory-stock-view-design.md`
Plan: `docs/superpowers/plans/2026-10-20-inventory-stock-view.md`
Commit: `65e309d`

### Added — Perhutani Contract Tracking (Item #5, #8)
- New entities: `PerhutaniContract`, `ContractSortimentItem`, `ContractReceipt` (SSOT).
- Derived aggregates: `ContractFulfillmentSummary`, `ContractWithDetails`.
- Pure calculator `src/utils/contract-calc.ts` with `computeContractTotals()`, `computeFulfillmentSummary()`, `deriveContractStatus()`.
- Dedicated routes: `/contracts` (list) and `/contracts/[id]` (detail with sortiment items + receipts panel + linked receiving records).
- 15 UI components under `src/components/contracts/`.
- 4 API routes with CRUD operations and tenant scoping.
- SQLite + Supabase schema migrations (3 new tables with cascade rules).
- Hybrid `<ContractCombobox>` using HTML `<datalist>` for receiving form integration — Perhutani contracts suggested, non-Perhutani free-text preserved.
- Auto-fill `supplierName` to "Perhutani {KPH}" when a Perhutani contract is selected (only if supplier field is empty).
- Nav entry "Kontrak" / 合同.

Spec: `docs/superpowers/specs/2026-10-21-perhutani-contract-tracking-design.md`
Plan: `docs/superpowers/plans/2026-10-21-perhutani-contract-tracking.md`
ADR: ADR-0003
Commit: `c162360`

### Added — Discrepancy Alarm (Item #1)
- 4-level severity model: `MATCH` / `SURPLUS` / `WITHIN_TOLERANCE` / `ALARM` replacing legacy binary surplus/shortage.
- Pure evaluator `evaluateDiscrepancy()` in `src/utils/discrepancy.ts` with OR-logic threshold gating.
- Input validator `validateDiscrepancyInputs()` rejects negative tally/delivered values at client + server.
- Reusable `<DiscrepancyBadge>` component with color-coded tooltips.
- Dashboard KPI card "Alarm Diskrepansi" showing count of records in alarm state.
- Settings UI exposes dual threshold inputs (volume m³ + percent %).

**Breaking change in UI:** Surplus badge color changed from green to blue (surplus is informational, not positive).

### Changed — Settings Schema
- Deprecated `AppSettings.acceptableDiscrepancyThresholdPct` (kept read-only for backward compat).
- Added `AppSettings.discrepancyAlarmVolumeM3` (default `1.5`) and `AppSettings.discrepancyAlarmPercent` (default `2.0`).
- Settings loader auto-migrates old value forward on first load.

Spec: `docs/superpowers/specs/2026-10-21-discrepancy-alarm-design.md`
Plan: `docs/superpowers/plans/2026-10-21-discrepancy-alarm.md`
Commit: `aa9b6df`

### Added — Broker Master Data (Item #6)
- New `Broker` entity (tenant-scoped master data) with CRUD routes at `/brokers`.
- Pure metrics calculator `aggregateBrokerMetrics()` in `src/utils/broker-metrics.ts` producing per-broker scorecards (deal count, total commission IDR, volume facilitated, primary suppliers top-3, last deal date, avg commission per m³).
- `WoodReceivingRecord.brokerId?: string` optional FK with `ON DELETE SET NULL` cascade.
- `<BrokerCombobox>` in receiving form with "no broker" option + default commission prefill.
- Advisory warning when `brokerFee > 0` but no broker selected (non-blocking).
- Nav entry "Broker" / 中间人.

Spec: `docs/superpowers/specs/2026-10-21-broker-master-data-design.md`
Plan: `docs/superpowers/plans/2026-10-21-broker-master-data.md`
ADR: ADR-0004
Commit: `17d07d0`

### Changed — Pending Pricing Workflow (Item #3)
- **BREAKING SCHEMA:** `WoodReceivingRecord.timberPricePerM3` changed from `number` to `number | null`. SQLite + Supabase CHECK constraints updated to permit NULL.
- Null propagated through `timberGrossTotal`, `timberPphAmount`, `timberNetPayable`, `grandNetPayable`.
- New derived type `PricingStatus` ('PENDING' | 'PRICED') via `derivePricingStatus()`.
- Dashboard aggregator excludes PENDING records from financial totals; surfaces separately via new KPI fields `pendingPricingCount`, `pendingPricingVolumeM3`, `pendingPricingValueExposureIDR`.
- Dedicated workflow page `/pending-pricing` with inline price edit (enter-to-save).
- New API endpoint `PATCH /api/records/[id]/price` for price-only updates with `RECORD_PRICED` activity log.
- Nav entry "Pending Harga" / 待定价 with count badge.

**No data migration performed.** Existing records with `price = 0` remain PRICED (preserves intentional free-lot semantics).

Spec: `docs/superpowers/specs/2026-10-21-pending-pricing-workflow-design.md`
Plan: `docs/superpowers/plans/2026-10-21-pending-pricing-workflow.md`
ADR: ADR-0002
Commit: `af94654`

### Added — Weekly Payment Form (Item #2)
- New `PaymentForm` entity consolidating receiving records within a Saturday-Friday weekly window, grouped per unique `(supplierName, woodSpecies, contractNumber)` tuple.
- Status workflow: `DRAFT` → `ISSUED` → `PAID` → `VOID`.
- Pure helpers: `getWeekWindow()`, `groupRecordsForPayment()`, `computeFormTotals()`, `generateFormNumber()`.
- Dedicated routes: `/payment-forms` (list) and `/payment-forms/[id]` (detail).
- 15 UI components including `<GenerateFormsModal>`, `<IssueFormModal>`, `<MarkPaidModal>`, `<VoidFormModal>`, `<PrintPaymentFormModal>` (A4 portrait, `@media print` CSS).
- Multi-item manifest handling: each item evaluated independently, splits into per-species forms when applicable.
- PENDING-priced records excluded from generation with explicit skip reasons (`PENDING_PRICE`, `ALREADY_IN_LOCKED_FORM`, `OUT_OF_WINDOW`).
- Status cascade: form PAID → linked records' `paymentStatus` → PAID. Form VOID from PAID → records revert to UNPAID.
- Edit guard: records linked to ISSUED/PAID forms cannot modify financial fields until form is voided.
- Bidirectional FK: `WoodReceivingRecord.paymentFormId?` and `ReceivingItem.paymentFormId?`.
- Nav entry "Form Pembayaran" / 付款单 with DRAFT count badge.

**Timezone:** All week calculations fixed to WIB (UTC+7).

Spec: `docs/superpowers/specs/2026-10-21-weekly-payment-form-design.md`
Plan: `docs/superpowers/plans/2026-10-21-weekly-payment-form.md`
Commit: `83b2178`

### Added — Sawmill Production + Stock Sorting (Item #4)
- Two separate entities with distinct semantics:
  - `SawmillProductionRecord` — raw log → sawn products with computed yield + waste.
  - `StockSortingRecord` — bidirectional transfer between kavlings for regrade/relocate.
- Pure calculator `src/utils/production-calc.ts` with `computeProductionYield()` and `aggregateProductionMetrics()`.
- Free-text autocomplete for `outputProduct` and `reason` fields (learns from history).
- `<ProductSuggestionCombobox>`, `<SortingReasonCombobox>`, `<KavlingPickerDual>` components.
- Dedicated routes `/production` and `/sorting` with KPI strips (today's totals + weekly yield average).
- Yield badge thresholds: ≥70% green, 50-70% amber, <50% red (advisory).
- SQL CHECK constraint prevents self-transfer (`source != target`) at DB level.
- Soft stock-allowance warnings when input exceeds remaining lot stock (non-blocking).
- Nav entries "Produksi" / 生产 and "Sortir Stok" / 分拣.

Spec: `docs/superpowers/specs/2026-10-21-production-and-sorting-design.md`
Plan: `docs/superpowers/plans/2026-10-21-production-and-sorting.md`
ADR: ADR-0005
Commit: `68ca6ad`

### Changed — Stock Balance Calculator (Backward Compatible)
- `calculateLotStockBalance()` signature extended with optional `productionRecords` and `sortingRecords` arrays.
- `aggregateAllLotBalances()` enumerates lots from all 4 record types.
- Backward compat preserved: existing callers (`SalesModal`, `/api/sales`) unchanged.
- `LotStockBalance` interface extended with 6 new fields documenting consumed + transferred flows.

Spec: `docs/superpowers/specs/2026-10-21-production-and-sorting-design.md` Section 4.1

---

## [2026-10-20] — UX Hygiene & Design System Cleanup

### Changed
- Removed emoji usage from UI (replaced with Lucide icons for consistency and i18n neutrality). Added emoji hygiene regression test. [Commit: `0f32c9b`]
- Chart re-render optimization: in-place updates for volume trend, species donut, supplier ranking, inventory flow, and customer sales charts. Added module-level memory cache and sync equality guards to hooks. [Commits: `c3e6530`, `3ac42fc`, `2fc1552`]

### Fixed
- Chart instance cleanup in `InventoryFlowChart`.
- Rules of Hooks compliance in ledger quick-fill handler.

---

## [2026-10-19] — Supabase Integration

### Added
- Zero-dependency Supabase PostgREST persistence bridge (`src/persistence/supabase/`).
- Supabase seed script `scripts/seed-supabase.ts`.
- Dev quick-fill utilities for RecordModal, SalesModal, SupplierModal (reduces manual test data entry).

### Changed
- Supplier storage locations mapping aligned with `StorageLotWithYard` contract.

Commits: `e3be874`, `21a0e90`

---

## [2026-10-18] — Relational Database Architecture

### Added
- `node:sqlite` relational database with migrations (manifest-items normalization, storage yards + lots).
- Multi-item receiving manifest support (`ReceivingManifest` + `ReceivingItem` with `receiving_items_calc_view`).
- Mobile tally mode (`/tally`) for yard-side quick entry.
- Wood sales outbound ledger (`/sales`) with stock deduction and printable delivery order.
- Sales analytics on Ringkasan dashboard.
- IndexedDB server-side pagination for large record sets.
- Instant optimistic navigation across all routes.

Specs: multiple under `docs/superpowers/specs/2026-10-18-*`

---

## [2026-10-17] — Business Foundation & Workflow Fixes

### Added
- Core financial calculations (`src/utils/timber-calc.ts`): timber + freight payment, dashboard aggregates, dimensional helpers.
- Safe-search haystack expansion covering invoice numbers and contract numbers.

### Fixed
- Domain and operational workflow fixes across receiving flow.

---

## [2026-10-16] — Supplier Master Data & Navigation Redesign

### Added
- Supplier master CRUD with directory UI and scorecard metrics.
- Sidebar navigation redesign with mobile-friendly layout.
- Multi-page dashboard expansion (Ringkasan + Buku Besar + Suppliers + Activity + Settings).

### Changed
- Navbar spacing and ergonomics refined for information density.

---

## [2026-10-15] — Role-Based Login & TypeScript Modernization

### Added
- Role-based login system with 3-level RBAC (Owner, Staff, Viewer).
- TypeScript core modernization with native Node 22+ type stripping.
- Frontend LMS ISAT design system foundation (color tokens, spacing, typography).

---

## [2026-10-14] — Project Foundation

### Added
- Next.js 15 App Router + React 19 + Tailwind CSS 3.4 migration.
- Wood stock dashboard with CRUD operations.
- Initial `WoodReceivingRecord` entity and ledger view.

---

## Legend

- **Added** — New features or files.
- **Changed** — Changes to existing functionality (non-breaking).
- **Deprecated** — Features marked for future removal.
- **Removed** — Features removed in this release.
- **Fixed** — Bug fixes.
- **Security** — Security-related changes.

Each entry references:
- `Spec:` design specification document
- `Plan:` implementation plan document
- `ADR:` architecture decision record (when applicable)
- `Commit:` canonical git hash for the change
