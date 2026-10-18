# IndexedDB & Server Pagination Implementation Plan (Phase 5)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the 5MB browser storage quota limit with native zero-dependency IndexedDB offline storage, and implement parameterized server-side / client-side pagination for scalable ledger table rendering.

**Architecture:** Native `IndexedDbAdapter` implements `StorageAdapter` with automatic `localStorage` migration and in-memory fallback for SSR/tests. `SqliteRecordStore` implements parameterized SQL pagination over `v_buku_besar_flat`. `GET /api/records` serves paginated payloads when query parameters are supplied while preserving full array responses when omitted. UI component `RecordTablePagination` manages page sizing and rendering slices in `RecordTable.tsx`.

**Tech Stack:** Node.js 26.8.1 (Native ESM & TypeScript), Native IndexedDB (`window.indexedDB`), Native SQLite (`node:sqlite`), React 19, Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-10-18-indexeddb-server-pagination-design.md`

## Global Constraints
- Maximum file size: keep all modules strictly under ~250 LOC (Strangler pattern on God files).
- Single Source of Truth (SSOT): all domain interfaces and entities must be imported from `src/types/index.ts`.
- Zero external dependencies: rely strictly on native Node.js 26 ESM and standard browser APIs (no `idb`, `dexie`, or third-party query builders).
- Backward compatibility: unpaginated `GET /api/records` requests must continue to return the full array matching existing test suites.
- Automated test coverage: every task must provide automated tests executed via `node --test` with 0 failures.
- Language standard: source code, types, and git commits in English; user-facing labels remain bilingual Indonesian-Chinese.

---

### Task 1: SSOT Domain Types & Native IndexedDB Storage Adapter

**Files:**
- Modify: `src/types/index.ts`
- Create: `src/persistence/indexed-db-adapter.ts`
- Modify: `src/persistence/storage.ts`
- Test: `test/indexed-db-adapter.test.ts`

**Interfaces:**
- Consumes: `StorageAdapter` from `src/persistence/storage.ts`
- Produces:
  - Types in `src/types/index.ts`: `PaginationMeta`, `PaginatedResult<T>`, `RecordQueryParams`
  - Class `IndexedDbAdapter implements StorageAdapter` in `src/persistence/indexed-db-adapter.ts`:
    - `getItem<T>(key: string): Promise<T | null>`
    - `setItem<T>(key: string, value: T): Promise<void>`
    - `removeItem(key: string): Promise<void>`
    - `clear(): Promise<void>`
    - Auto-migration from `localStorage` on initial open.
  - Integration in `src/persistence/storage.ts`: default storage uses `IndexedDbAdapter` when available.

- [ ] **Step 1: Write failing unit test in `test/indexed-db-adapter.test.ts`**
  Asserts that `IndexedDbAdapter` fulfills the `StorageAdapter` contract, falls back cleanly in Node/mock environments, and migrates legacy `localStorage` keys into IndexedDB.
- [ ] **Step 2: Run test to verify it fails**
  `node --test test/indexed-db-adapter.test.ts`
- [ ] **Step 3: Define types in `src/types/index.ts` and implement `IndexedDbAdapter`**
  Implement native IndexedDB wrapper with `<200 LOC` and wire into `src/persistence/storage.ts`.
- [ ] **Step 4: Run test to verify it passes**
  `node --test test/indexed-db-adapter.test.ts`
- [ ] **Step 5: Run full test suite to ensure existing storage tests pass**
  `npm test`
- [ ] **Step 6: Commit**
  `git add src/types/index.ts src/persistence/indexed-db-adapter.ts src/persistence/storage.ts test/indexed-db-adapter.test.ts && git commit -m "feat(storage): implement native zero-dependency IndexedDbAdapter with localStorage auto-migration"`

---

### Task 2: SQLite Parameterized Pagination & Filtering Queries

**Files:**
- Modify: `src/persistence/sqlite-record-store.ts`
- Modify: `src/persistence/server-record-store.ts`
- Test: `test/sqlite-pagination.test.ts`

**Interfaces:**
- Consumes: `RecordQueryParams`, `PaginatedResult`, `WoodReceivingRecord` from `src/types/index.ts`
- Produces:
  - `sqliteRecordStore.getPaginated(params: RecordQueryParams): Promise<PaginatedResult<WoodReceivingRecord>>`
  - `serverRecordStore.getPaginated(params: RecordQueryParams): Promise<PaginatedResult<WoodReceivingRecord>>`

- [ ] **Step 1: Write failing unit test in `test/sqlite-pagination.test.ts`**
  Asserts that `getPaginated` returns correct page slices (`page=1&pageSize=2`), accurate `totalRecords` and `totalPages`, and handles multi-field filtering (species, kavling, query).
- [ ] **Step 2: Run test to verify it fails**
  `node --test test/sqlite-pagination.test.ts`
- [ ] **Step 3: Implement `getPaginated` in `SqliteRecordStore` and `ServerRecordStore`**
  Build parameterized SQL queries over `v_buku_besar_flat` and compute `PaginationMeta`. Keep files under 250 LOC.
- [ ] **Step 4: Run test to verify it passes**
  `node --test test/sqlite-pagination.test.ts`
- [ ] **Step 5: Commit**
  `git add src/persistence/sqlite-record-store.ts src/persistence/server-record-store.ts test/sqlite-pagination.test.ts && git commit -m "feat(persistence): implement parameterized pagination and filtering in SqliteRecordStore"`

---

### Task 3: REST API Pagination Endpoint & Backward Compatibility

**Files:**
- Modify: `app/api/records/route.ts`
- Test: `test/api-records-pagination.test.ts`

**Interfaces:**
- Consumes: `serverRecordStore.getPaginated()`
- Produces:
  - `GET /api/records?page=1&pageSize=10` returning `{ success: true, data: WoodReceivingRecord[], pagination: PaginationMeta }`
  - `GET /api/records` (no query params) returning `{ success: true, data: WoodReceivingRecord[] }`

- [ ] **Step 1: Write failing integration test in `test/api-records-pagination.test.ts`**
  Verifies that paginated requests return slice data and `pagination` metadata, and unpaginated requests return all records without breaking existing API contracts.
- [ ] **Step 2: Run test to verify it fails**
  `node --test test/api-records-pagination.test.ts`
- [ ] **Step 3: Update `GET` handler in `app/api/records/route.ts`**
  Parse pagination search parameters when present, route to `serverRecordStore.getPaginated()`, and preserve backward-compatible full response when omitted.
- [ ] **Step 4: Run test to verify it passes**
  `node --test test/api-records-pagination.test.ts test/api-records.test.ts`
- [ ] **Step 5: Commit**
  `git add app/api/records/route.ts test/api-records-pagination.test.ts && git commit -m "feat(api): support pagination query parameters in records GET endpoint"`

---

### Task 4: Modular Table Pagination Component & Ledger Integration

**Files:**
- Create: `src/components/ledger/RecordTablePagination.tsx`
- Modify: `src/components/ledger/RecordTable.tsx`
- Test: `test/record-table-pagination.test.ts`

**Interfaces:**
- Consumes: `RecordTablePaginationProps`
- Produces:
  - Subcomponent `RecordTablePagination`: page sizing (`25`, `50`, `100`, `Semua`), navigation buttons, bilingual counters.
  - Upgraded `RecordTable.tsx`: slices records for active page, mounts pagination bar, and resets page to 1 on filter/search changes.

- [ ] **Step 1: Write failing component test in `test/record-table-pagination.test.ts`**
  Verifies that `RecordTable` slices records according to `pageSize`, changes pages on click, displays bilingual record counts, and satisfies `<250 LOC`.
- [ ] **Step 2: Run test to verify it fails**
  `node --test test/record-table-pagination.test.ts`
- [ ] **Step 3: Implement `RecordTablePagination.tsx` and integrate into `RecordTable.tsx`**
  Build pagination controls (<150 LOC) and connect slicing in `RecordTable.tsx` (<250 LOC).
- [ ] **Step 4: Run test to verify it passes**
  `node --test test/record-table-pagination.test.ts test/record-table.test.ts`
- [ ] **Step 5: Verify LOC limit**
  `wc -l src/components/ledger/RecordTablePagination.tsx src/components/ledger/RecordTable.tsx`
- [ ] **Step 6: Commit**
  `git add src/components/ledger/RecordTablePagination.tsx src/components/ledger/RecordTable.tsx test/record-table-pagination.test.ts && git commit -m "feat(ledger): add RecordTablePagination subcomponent and slice records in RecordTable"`

---

### Task 5: End-to-End Verification & Full Regression

**Files:**
- All touched files

- [ ] **Step 1: Run complete test suite**
  `npm test` (verify 370+ passing tests with 0 failures)
- [ ] **Step 2: Run Next.js production build**
  `npm run build:check` (verify 0 TypeScript, lint, or static generation errors)
- [ ] **Step 3: Whole-plan code review**
  Perform diff inspection across all commits and confirm global constraints.
- [ ] **Step 4: Finalize and commit**
  `git commit --allow-empty -m "chore(release): complete Phase 5 IndexedDB and server pagination"`
