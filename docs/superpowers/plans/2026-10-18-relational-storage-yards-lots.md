# Relational Storage Yards & Kavling Lots Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform freeform `storageYard` and `kavlingNumber` text inputs into relational, top-down cascading selectors with lot capacity/status warnings and offline-first persistence.

**Architecture:** Client-side offline-first store (`storage-locations.ts`) synchronizes with relational SQLite tables (`storage_yards` and `storage_lots`) via `/api/storage-locations`. UI components (`YardSelect` and `KavlingSelect`) enforce strict top-down cascading (yard must be selected first), display lot status pills (`ACTIVE`, `FULL`, `MAINTENANCE`), and render a non-blocking soft warning when a full/maintenance lot is assigned.

**Tech Stack:** Node.js 26.8.1 (Native ESM & TypeScript), React 19, Tailwind CSS, Native SQLite (`node:sqlite`), Node test runner (`node:test` + `node:assert`).

**Spec:** `docs/superpowers/specs/2026-10-18-relational-storage-yards-lots-design.md`

## Global Constraints
- Maximum file size: keep all modules strictly under ~250 LOC (Strangler pattern on God files).
- Single Source of Truth (SSOT): all domain interfaces and entities must be imported from `src/types/index.ts`.
- Zero external dependencies: rely strictly on native Node.js 26 ESM and existing project primitives.
- Offline-First: all UI workflows must function immediately offline via `localStorage` with non-blocking server synchronization.
- Automated test coverage: every task must provide automated tests executed via `node --test` with 0 failures.
- Language standard: source code, types, and git commits in English; user-facing labels remain bilingual Indonesian-Chinese.

---

### Task 1: SSOT Domain Types & Offline-First Storage Locations Utility

**Files:**
- Modify: `src/types/index.ts:210-230`
- Create: `src/utils/storage-locations.ts`
- Test: `test/storage-locations.test.ts`

**Interfaces:**
- Consumes: `StorageYard`, `StorageLot` from `src/types/index.ts`
- Produces:
  - Types: `StorageLotStatus`, `StorageLotWithYard`, `StorageLocationsData` in `src/types/index.ts`
  - Functions in `src/utils/storage-locations.ts`:
    - `loadStorageLocations(): StorageLocationsData`
    - `saveStorageLocations(data: StorageLocationsData): void`
    - `getYards(): StorageYard[]`
    - `getLotsForYard(yardNameOrId: string): StorageLot[]`
    - `addYard(name: string, description?: string): StorageYard`
    - `addLot(yardNameOrId: string, lotCode: string, status?: StorageLotStatus): StorageLot`
    - `isLotFullOrMaintenance(lot?: StorageLot): { isWarning: boolean; message?: string }`

- [ ] **Step 1: Write failing unit test in `test/storage-locations.test.ts`**
  Asserts that `getYards()` returns default seeds (`TPK-Timur`, `TPK-Utara`, etc.), `getLotsForYard('TPK-Timur')` returns only `KAV-01` and `KAV-02`, adding dynamic lots normalizes uppercase codes, and `isLotFullOrMaintenance` flags `FULL` and `MAINTENANCE` lots.
- [ ] **Step 2: Run test to verify it fails**
  `node --test test/storage-locations.test.ts`
- [ ] **Step 3: Define types in `src/types/index.ts` and implement `src/utils/storage-locations.ts`**
  Implement storage location cache, seeds, and helpers with strict `<250 LOC`.
- [ ] **Step 4: Run test to verify it passes**
  `node --test test/storage-locations.test.ts`
- [ ] **Step 5: Commit**
  `git add src/types/index.ts src/utils/storage-locations.ts test/storage-locations.test.ts && git commit -m "feat(storage): implement offline-first storage locations utility and domain types"`

---

### Task 2: Backend SQLite Relational Master Data & REST API Endpoint

**Files:**
- Modify: `src/persistence/sqlite-record-store.ts:90-130`
- Modify: `src/persistence/server-record-store.ts:180-210`
- Create: `app/api/storage-locations/route.ts`
- Test: `test/api-storage-locations.test.ts`

**Interfaces:**
- Consumes: `sqliteRecordStore` from `src/persistence/sqlite-record-store.ts`
- Produces:
  - `sqliteRecordStore.getStorageLocations(): Promise<{ yards: StorageYard[]; lots: StorageLotWithYard[] }>`
  - `sqliteRecordStore.saveStorageYard(yard: Partial<StorageYard>): Promise<StorageYard>`
  - `sqliteRecordStore.saveStorageLot(lot: Partial<StorageLot>): Promise<StorageLot>`
  - HTTP Endpoints: `GET /api/storage-locations` and `POST /api/storage-locations`

- [ ] **Step 1: Write failing integration test in `test/api-storage-locations.test.ts`**
  Verifies that `GET /api/storage-locations` returns seeded yards and lots, and `POST /api/storage-locations` creates new yards and lots with valid authentication.
- [ ] **Step 2: Run test to verify it fails**
  `node --test test/api-storage-locations.test.ts`
- [ ] **Step 3: Implement persistence methods and API route**
  Add queries to `SqliteRecordStore`, delegate in `ServerRecordStore`, and create route handler `app/api/storage-locations/route.ts`.
- [ ] **Step 4: Run test to verify it passes**
  `node --test test/api-storage-locations.test.ts`
- [ ] **Step 5: Run full suite to prevent regression**
  `npm test`
- [ ] **Step 6: Commit**
  `git add src/persistence/sqlite-record-store.ts src/persistence/server-record-store.ts app/api/storage-locations/route.ts test/api-storage-locations.test.ts && git commit -m "feat(api): add storage locations relational queries and REST API endpoint"`

---

### Task 3: Cascading UI Select Components (`YardSelect.tsx`, `KavlingSelect.tsx`)

**Files:**
- Create: `src/components/ledger/YardSelect.tsx`
- Create: `src/components/ledger/KavlingSelect.tsx`
- Test: `test/storage-select.test.ts`

**Interfaces:**
- Consumes: `getYards`, `getLotsForYard`, `addYard`, `addLot`, `isLotFullOrMaintenance` from `src/utils/storage-locations.ts`
- Produces:
  - `YardSelect`: `({ value, onChange, disabled }) => JSX.Element`
  - `KavlingSelect`: `({ value, selectedYard, onChange, disabled }) => JSX.Element`

- [ ] **Step 1: Write failing component tests in `test/storage-select.test.ts`**
  Verifies that `KavlingSelect` renders disabled when `selectedYard` is empty, filters to yard's lots when yard is provided, renders warning badge when selecting a `FULL` or `MAINTENANCE` lot, and supports adding a new lot.
- [ ] **Step 2: Run test to verify it fails**
  `node --test test/storage-select.test.ts`
- [ ] **Step 3: Implement `YardSelect.tsx` and `KavlingSelect.tsx`**
  Build clean, accessible comboboxes with keyboard support and bilingual labels. Keep each file strictly under 230 LOC.
- [ ] **Step 4: Run test to verify it passes**
  `node --test test/storage-select.test.ts`
- [ ] **Step 5: Commit**
  `git add src/components/ledger/YardSelect.tsx src/components/ledger/KavlingSelect.tsx test/storage-select.test.ts && git commit -m "feat(ledger): create YardSelect and KavlingSelect cascading comboboxes"`

---

### Task 4: Integrate Cascading Selectors into `ManifestItemRow.tsx`

**Files:**
- Modify: `src/components/ledger/ManifestItemRow.tsx:135-165`
- Test: `test/manifest-items-table.test.ts`
- Test: `test/record-modal.test.ts`

**Interfaces:**
- Consumes: `YardSelect` and `KavlingSelect`
- Produces: Upgraded `ManifestItemRow` with relational yard/kavling bindings and soft capacity warning badge

- [ ] **Step 1: Update unit tests in `test/manifest-items-table.test.ts`**
  Verify that `ManifestItemRow` mounts `YardSelect` and `KavlingSelect`, changing yard updates item state, and file size remains `<250 LOC`.
- [ ] **Step 2: Run test to verify it fails or needs updates**
  `node --test test/manifest-items-table.test.ts`
- [ ] **Step 3: Refactor `ManifestItemRow.tsx`**
  Replace freeform `<input>` fields with `<YardSelect>` and `<KavlingSelect>`. When `storageYard` changes, if current `kavlingNumber` does not belong to the newly selected yard, reset or update `kavlingNumber`.
- [ ] **Step 4: Run test to verify it passes**
  `node --test test/manifest-items-table.test.ts test/record-modal.test.ts`
- [ ] **Step 5: Verify LOC constraint**
  Confirm `wc -l src/components/ledger/ManifestItemRow.tsx` is < 250 LOC.
- [ ] **Step 6: Commit**
  `git add src/components/ledger/ManifestItemRow.tsx test/manifest-items-table.test.ts && git commit -m "feat(ledger): wire YardSelect and KavlingSelect into ManifestItemRow"`

---

### Task 5: End-to-End Verification & Full Regression

**Files:**
- All touched files

- [ ] **Step 1: Run complete test suite**
  `npm test` (verify 335+ passing tests with 0 failures)
- [ ] **Step 2: Run production Next.js build**
  `npm run build` (verify 0 TypeScript or compile errors)
- [ ] **Step 3: Whole-plan code review**
  Perform diff inspection and confirm all global constraints are satisfied.
- [ ] **Step 4: Commit and finalize**
  `git commit --allow-empty -m "chore(release): complete Phase 2 relational storage yards and kavling lots"`
