# Wood Sales & Outbound Stock Ledger Implementation Plan (Phase 7)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide a dedicated Outbound Sales Ledger (`/sales`) to record timber sales and dispatches with freeform customer input, live kavling stock balance evaluation and deduction, and printable bilingual Delivery Orders.

**Architecture:** 
1. SSOT Domain Types & Engine: Add `WoodSalesRecord`, `SalesFormInput`, and `LotStockBalance` to `src/types/index.ts`, with pure stock deduction and financial math in `src/utils/stock-balance.ts`.
2. Relational Backend & API: SQLite `sales_records` table with parameterized queries in `src/persistence/sqlite/sales-queries.ts`, and Next.js REST endpoint at `app/api/sales/route.ts` with Level 1 RBAC protection.
3. Offline-First Client Persistence: `useWoodSalesRecords.ts` hook backed by native `defaultStorage` (`IndexedDbAdapter`) and non-blocking background server sync.
4. UI Subcomponents: `SalesModal.tsx` with live kavling stock gauge, `SalesTable.tsx` for desktop/mobile views, and `PrintDeliveryOrderModal.tsx` for official delivery slips (Surat Jalan Keluar).
5. Dedicated Outbound Route: `app/sales/page.tsx` (< 200 LOC) integrating summary KPIs, filtering, and table.

**Tech Stack:** Node.js 26.8.1 (Native ESM & TypeScript), React 19, Tailwind CSS, Native IndexedDB (`window.indexedDB`), Native SQLite (`node:sqlite`).

**Spec:** `docs/superpowers/specs/2026-10-18-wood-sales-outbound-design.md`

## Global Constraints
- Maximum file size: keep all modules strictly under ~250 LOC (Strangler pattern on God files).
- Single Source of Truth (SSOT): all domain interfaces and entities must be imported from `src/types/index.ts`.
- Zero external dependencies: rely strictly on native Node.js 26 ESM, native browser APIs (`window.indexedDB`), Tailwind CSS, and Lucide icons.
- Backward compatibility: existing inbound ledger (`/ledger`), field workstation (`/tally`), and supplier scorecard (`/suppliers`) must continue to function with 0 regressions.
- Automated test coverage: every task must provide automated tests executed via `node --test` with 0 failures.
- Language standard: source code, types, and git commits in English; user-facing labels remain bilingual Indonesian-Chinese.

---

### Task 1: SSOT Domain Types & Pure Stock Balance Calculation Engine

**Files:**
- Modify: `src/types/index.ts`
- Create: `src/utils/stock-balance.ts`
- Test: `test/stock-balance.test.ts`

**Interfaces:**
- Produces in `src/types/index.ts`:
  - `WoodSalesRecord`
  - `SalesFormInput`
  - `LotStockBalance`
- Produces in `src/utils/stock-balance.ts`:
  - `calculateLotStockBalance(inboundRecords: WoodReceivingRecord[], salesRecords: WoodSalesRecord[], yard: string, kavling: string): LotStockBalance`
  - `validateSalesStockAllowance(balance: LotStockBalance, requestedVolumeM3: number, requestedPieces: number): { isAllowed: boolean; warning?: string }`
  - `calculateSalesFinancials(volumeM3: number, pricePerM3: number): { totalPrice: number }`

- [x] **Step 1: Write failing unit test in `test/stock-balance.test.ts`**
  Asserts that:
  - `calculateLotStockBalance` computes $V_{\text{in}} - V_{\text{out}}$ and $B_{\text{in}} - B_{\text{out}}$ accurately for a specific yard and kavling.
  - Handles cases where kavling has zero sales or zero inbound records without `NaN` or negative results.
  - `validateSalesStockAllowance` permits sales within remaining stock and returns descriptive warning when overdrawn.
  - `calculateSalesFinancials` computes accurate rounded gross sales revenue.
- [x] **Step 2: Run test to verify it fails**
  `node --test test/stock-balance.test.ts`
- [x] **Step 3: Define types in `src/types/index.ts` and implement `src/utils/stock-balance.ts`**
  Implement pure calculation engine with zero side effects. Keep `src/utils/stock-balance.ts` < 150 LOC.
- [x] **Step 4: Run test to verify it passes**
  `node --test test/stock-balance.test.ts`
- [x] **Step 5: Verify LOC limits and TypeScript compile**
  `wc -l src/utils/stock-balance.ts` (< 150 LOC) && `npx tsc --noEmit`
- [x] **Step 6: Commit**
  `git add src/types/index.ts src/utils/stock-balance.ts test/stock-balance.test.ts && git commit -m "feat(sales): add sales SSOT domain types and stock balance calculation engine"`

---

### Task 2: SQLite Relational Outbound Sales Schema & REST API Endpoint

**Files:**
- Modify: `src/persistence/sqlite/migrations.ts`
- Create: `src/persistence/sqlite/sales-queries.ts`
- Create: `app/api/sales/route.ts`
- Test: `test/api-sales.test.ts`

**Interfaces:**
- Produces:
  - `sales_records` table in SQLite with foreign key to `tenants(id)`.
  - `salesQueries.getAll()`, `salesQueries.insert(record)`, `salesQueries.update(record)`, `salesQueries.delete(id)`.
  - `GET /api/sales`: returns `{ success: true, data: WoodSalesRecord[], timestamp }`.
  - `POST /api/sales`: validates payload, enforces Level 1 RBAC, saves to SQLite, returns saved record.
  - `DELETE /api/sales?id=XXX`: deletes record with Level 1 RBAC guard.

- [ ] **Step 1: Write failing integration test in `test/api-sales.test.ts`**
  Asserts that:
  - `GET /api/sales` returns array of sales records.
  - `POST /api/sales` validates required fields (`customerName`, `storageYard`, `kavlingNumber`, `pieces`, `volumeM3`).
  - Rejects write operations when unauthorized.
  - Deletes sales records by id.
- [ ] **Step 2: Run test to verify it fails**
  `node --test test/api-sales.test.ts`
- [ ] **Step 3: Implement SQLite migrations, `sales-queries.ts`, and `app/api/sales/route.ts`**
  Add `sales_records` table, query helpers with SQL injection safety, and Next.js Route Handler.
- [ ] **Step 4: Run test to verify it passes**
  `node --test test/api-sales.test.ts`
- [ ] **Step 5: Verify LOC limits and TypeScript compile**
  `wc -l src/persistence/sqlite/sales-queries.ts app/api/sales/route.ts` && `npx tsc --noEmit`
- [ ] **Step 6: Commit**
  `git add src/persistence/sqlite/migrations.ts src/persistence/sqlite/sales-queries.ts app/api/sales/route.ts test/api-sales.test.ts && git commit -m "feat(api): implement sales SQLite schema and REST API endpoint"`

---

### Task 3: Client State & Offline-First Persistence Hook (`useWoodSalesRecords.ts`)

**Files:**
- Create: `src/hooks/useWoodSalesRecords.ts`
- Test: `test/use-wood-sales-records.test.ts`

**Interfaces:**
- Produces:
  - `useWoodSalesRecords(inboundRecords?: WoodReceivingRecord[])`:
    - `sales: WoodSalesRecord[]`
    - `isSyncing: boolean`
    - `saveSale: (sale: SalesFormInput) => Promise<WoodSalesRecord>`
    - `deleteSale: (id: string) => Promise<void>`
    - `getLotBalance: (yard: string, kavling: string) => LotStockBalance`
    - `customerHistory: string[]` (unique customer names for datalist / auto-suggest)

- [ ] **Step 1: Write failing hook test in `test/use-wood-sales-records.test.ts`**
  Asserts that:
  - Initializes with local storage / IndexedDB cache and syncs with `/api/sales`.
  - `saveSale` computes total price, updates state immediately, persists to storage, and dispatches background sync.
  - `getLotBalance` correctly computes remaining lot stock using current inbound and sales records.
  - Extracts unique `customerHistory` for convenient autofill.
- [ ] **Step 2: Run test to verify it fails**
  `node --test test/use-wood-sales-records.test.ts`
- [ ] **Step 3: Implement `src/hooks/useWoodSalesRecords.ts`**
  Build hook respecting offline-first resilience and concurrency ref guards. Keep < 200 LOC.
- [ ] **Step 4: Run test to verify it passes**
  `node --test test/use-wood-sales-records.test.ts`
- [ ] **Step 5: Verify LOC limits and TypeScript compile**
  `wc -l src/hooks/useWoodSalesRecords.ts` (< 200 LOC) && `npx tsc --noEmit`
- [ ] **Step 6: Commit**
  `git add src/hooks/useWoodSalesRecords.ts test/use-wood-sales-records.test.ts && git commit -m "feat(sales): implement useWoodSalesRecords offline-first hook"`

---

### Task 4: Sales Entry Modal (`SalesModal.tsx`) & Delivery Order Print (`PrintDeliveryOrderModal.tsx`)

**Files:**
- Create: `src/components/sales/SalesModal.tsx`
- Create: `src/components/sales/PrintDeliveryOrderModal.tsx`
- Test: `test/sales-components.test.ts`

**Interfaces:**
- `SalesModalProps`:
  ```ts
  export interface SalesModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (sale: SalesFormInput) => Promise<void>;
    inboundRecords: WoodReceivingRecord[];
    existingSales: WoodSalesRecord[];
    customerHistory: string[];
    initialData?: WoodSalesRecord | null;
  }
  ```
- `PrintDeliveryOrderModalProps`:
  ```ts
  export interface PrintDeliveryOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    record: WoodSalesRecord | null;
  }
  ```

- [ ] **Step 1: Write failing component tests in `test/sales-components.test.ts`**
  Asserts that:
  - `SalesModal.tsx` contains freeform customer input with `<datalist>` auto-suggest.
  - Integrates `YardSelect` and `KavlingSelect`.
  - Renders live remaining stock badge for chosen yard and kavling.
  - Displays warning message when requested volume exceeds remaining stock.
  - `PrintDeliveryOrderModal.tsx` formats bilingual delivery order with `@media print` styles.
  - Both files satisfy `< 220 LOC` and `< 180 LOC` constraints.
- [ ] **Step 2: Run test to verify it fails**
  `node --test test/sales-components.test.ts`
- [ ] **Step 3: Implement `SalesModal.tsx` and `PrintDeliveryOrderModal.tsx`**
  Build accessible, touch-friendly modals with Tailwind CSS and Lucide icons.
- [ ] **Step 4: Run test to verify it passes**
  `node --test test/sales-components.test.ts`
- [ ] **Step 5: Verify LOC limits and TypeScript compile**
  `wc -l src/components/sales/SalesModal.tsx src/components/sales/PrintDeliveryOrderModal.tsx` && `npx tsc --noEmit`
- [ ] **Step 6: Commit**
  `git add src/components/sales/ test/sales-components.test.ts && git commit -m "feat(sales): create SalesModal with live stock gauge and PrintDeliveryOrderModal"`

---

### Task 5: Outbound Sales Ledger Table & Dedicated Route (`SalesTable.tsx`, `app/sales/page.tsx`)

**Files:**
- Create: `src/components/sales/SalesTable.tsx`
- Create: `src/components/sales/SalesSummaryCards.tsx`
- Create: `app/sales/page.tsx`
- Modify: `app/ledger/page.tsx` (Add navigation link to `/sales`)
- Test: `test/sales-page.test.ts`

**Interfaces:**
- Produces:
  - `SalesSummaryCards.tsx` (< 120 LOC): Volume Terjual, Batang Keluar, Total Omzet, Piutang Belum Lunas.
  - `SalesTable.tsx` (< 220 LOC): Desktop & touch-friendly card presentation with Cetak DO, Edit, Delete triggers.
  - `app/sales/page.tsx` (< 220 LOC): Full Outbound Sales Workstation page with search and filter toolbar.

- [ ] **Step 1: Write failing page integration test in `test/sales-page.test.ts`**
  Asserts that:
  - `app/sales/page.tsx` exists and satisfies `< 220 LOC` ceiling.
  - Wires `useWoodSalesRecords`, `useWoodRecords`, and `useAuth`.
  - Contains summary cards and sales table.
  - Enforces `canWrite` Level 1 guard for sales creation.
- [ ] **Step 2: Run test to verify it fails**
  `node --test test/sales-page.test.ts`
- [ ] **Step 3: Implement `SalesSummaryCards.tsx`, `SalesTable.tsx`, and `app/sales/page.tsx`**
  Build clean sales ledger interface and link seamlessly in header navigation.
- [ ] **Step 4: Run test to verify it passes**
  `node --test test/sales-page.test.ts`
- [ ] **Step 5: Verify LOC limits and TypeScript compile**
  `wc -l src/components/sales/SalesSummaryCards.tsx src/components/sales/SalesTable.tsx app/sales/page.tsx` && `npx tsc --noEmit`
- [ ] **Step 6: Commit**
  `git add src/components/sales/ app/sales/ app/ledger/page.tsx test/sales-page.test.ts && git commit -m "feat(sales): implement dedicated sales ledger route and table"`

---

### Task 6: End-to-End Verification & Full Regression

**Files:**
- All touched files

- [ ] **Step 1: Run complete test suite**
  `npm test` (verify 430+ passing tests with 0 failures)
- [ ] **Step 2: Run Next.js production build**
  `npm run build:check` (verify 0 TypeScript, lint, or static generation errors across all 15 routes)
- [ ] **Step 3: Whole-plan code review**
  Perform diff inspection across all commits and confirm global constraints.
- [ ] **Step 4: Finalize and commit**
  `git commit --allow-empty -m "chore(release): complete Phase 7 Wood Sales and Outbound Stock Ledger"`

