# Design Spec: IndexedDB & Server Pagination Architecture (Phase 5)

**Document:** `docs/superpowers/specs/2026-10-18-indexeddb-server-pagination-design.md`  
**Date:** 2026-10-18  
**Status:** Approved for Implementation  
**Architecture:** Zero-Dependency Native IndexedDB Storage Adapter + Parameterized SQLite / REST Pagination + Client Table Pagination Controls.

---

## 1. Executive Summary & Problem Statement

### 1.1 Context
In the timber inventory management system:
1. **5MB LocalStorage Quota Limit**: `useWoodRecords.ts` and `storage-locations.ts` store data in browser `localStorage`. `localStorage` is synchronous, blocks the main UI thread during serialization, and enforces a hard ~5MB quota across browsers (equivalent to roughly 1,500 - 2,500 detailed timber receiving records). Exceeding this quota throws an uncatchable `QuotaExceededError`.
2. **DOM & Memory Overhead**: The ledger table renders *all* records into the DOM at once. As the dataset grows, rendering hundreds or thousands of table rows (especially in the 26-column Excel view) degrades scrolling performance and causes interaction delays.
3. **Unpaginated Server API**: `GET /api/records` executes a full table scan and serializes the entire database in every request.

### 1.2 Objectives
1. **Zero-Dependency Native IndexedDB Adapter (`IndexedDbAdapter`)**:
   - Provide an asynchronous `StorageAdapter` implementation using the native browser `window.indexedDB` API (database `wood_inventory_db`, store `keyval`).
   - Automatically migrate existing data from `localStorage` on first access so offline users never lose records.
   - Maintain seamless in-memory fallback for Node.js / SSR test environments.
2. **Relational SQLite Parameterized Pagination (`getPaginated`)**:
   - Add parameterized query execution in `SqliteRecordStore` supporting `page`, `pageSize`, `searchQuery`, `species`, `kavling`, `yard`, `startDate`, `endDate`, and `paymentStatus`.
   - Calculate total record counts and pagination metadata (`totalPages`, `hasNextPage`, `hasPreviousPage`).
   - Maintain 100% backward compatibility for unpaginated `GET /api/records` requests.
3. **Client Table Pagination & DOM Optimization (`RecordTablePagination.tsx`)**:
   - Add a modular pagination toolbar to `RecordTable.tsx` allowing page size selection (`25`, `50`, `100`, `Semua`).
   - Render only the slice of records corresponding to the active page, keeping DOM nodes lightweight.
   - Bilingual pagination indicators (`Menampilkan 1-50 dari 1,240 data / 显示 1-50 条，共 1,240 条`).

---

## 2. Architecture & Data Model

### 2.1 SSOT Domain Types (`src/types/index.ts`)
```ts
export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface RecordQueryParams {
  page?: number;
  pageSize?: number;
  searchQuery?: string;
  species?: string;
  kavling?: string;
  yard?: string;
  startDate?: string;
  endDate?: string;
  paymentStatus?: PaymentStatus | 'ALL';
  sortBy?: 'receiptDate' | 'truckPlateNumber' | 'supplierName' | 'tallyVolumeM3' | 'grandNetPayable' | 'createdAt';
  sortOrder?: 'ASC' | 'DESC';
}
```

### 2.2 Storage Layer: Native IndexedDB Adapter
- **File**: `src/persistence/indexed-db-adapter.ts`
- **Interface**: `StorageAdapter` (`getItem<T>`, `setItem<T>`, `removeItem`, `clear`)
- **Lifecycle**:
  - `DB_NAME = 'wood_inventory_db'`
  - `STORE_NAME = 'keyval'`
  - `VERSION = 1`
  - On `upgradeneeded`: creates object store `'keyval'`.
  - On open: checks if `window.localStorage` has legacy keys (`wood_receiving_records_v1`, `wood_storage_locations_v1`, `wood_suppliers_v1`). If present and not yet in IndexedDB, copies them into IndexedDB asynchronously.
  - If `indexedDB` is unavailable (e.g. Node.js unit tests or disabled in browser), falls back to `MemoryStorageAdapter`.
  - All operations wrapped in standard Promises without external npm libraries.

---

## 3. Server Pagination & REST API

### 3.1 SQLite Store (`src/persistence/sqlite-record-store.ts`)
Method signature:
```ts
async getPaginated(params: RecordQueryParams = {}): Promise<PaginatedResult<WoodReceivingRecord>>
```
Query construction:
- Base view: `v_buku_besar_flat`
- Parameterized `WHERE` conditions:
  - `searchQuery`: matches `truckPlateNumber LIKE ? OR forestryDocNumber LIKE ? OR receiptNumber LIKE ? OR contractNumber LIKE ? OR supplierName LIKE ? OR invoiceNumber LIKE ?`
  - `species`: exact or case-insensitive match on `woodSpecies`
  - `kavling`: exact match on `kavlingNumber`
  - `yard`: exact match on `storageYard`
  - `startDate` / `endDate`: date range on `receiptDate`
  - `paymentStatus`: match on `paymentStatus` (unless `'ALL'`)
- Uses `COUNT(*) OVER() AS totalCount` or count query to calculate total matching records.
- Order by: `ORDER BY ${sortBy} ${sortOrder}` (default: `receiptDate DESC, id DESC`).
- Limit & Offset: `LIMIT ? OFFSET ?` (page 1 with pageSize 50 -> `LIMIT 50 OFFSET 0`).

### 3.2 REST API Endpoint (`app/api/records/route.ts`)
- In `GET`:
  - Inspects `request.url` search params.
  - If `page` or `pageSize` is present:
    - Parses parameters into `RecordQueryParams`.
    - Calls `serverRecordStore.getPaginated(params)`.
    - Returns `{ success: true, data: result.data, pagination: result.pagination, timestamp }`.
  - If no pagination query parameters are provided:
    - Calls `serverRecordStore.getAll()`.
    - Returns `{ success: true, data: records, timestamp }` (100% backward compatible with existing tests and scripts).

---

## 4. UI Pagination & Table Integration

### 4.1 Pagination Subcomponent (`RecordTablePagination.tsx`)
- **File**: `src/components/ledger/RecordTablePagination.tsx` (< 150 LOC)
- **Props**:
  ```ts
  export interface RecordTablePaginationProps {
    currentPage: number;
    pageSize: number; // 25, 50, 100, or -1 for All
    totalRecords: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
  }
  ```
- **UI Elements**:
  - Left: Record counter (`Menampilkan {start}-{end} dari {total} data`).
  - Center: Page buttons (`<`, `1`, `2`, `...`, `N`, `>`).
  - Right: Page size selector dropdown / pills (`25`, `50`, `100`, `Semua`).

### 4.2 Coordinator Integration (`RecordTable.tsx`)
- Keeps `RecordTable.tsx` under 250 LOC by slicing `sortedRecords`:
  ```ts
  const displayedRecords = useMemo(() => {
    if (pageSize === -1) return sortedRecords;
    const start = (currentPage - 1) * pageSize;
    return sortedRecords.slice(start, start + pageSize);
  }, [sortedRecords, currentPage, pageSize]);
  ```
- When filter criteria change, `currentPage` automatically resets to 1.
- Passes `displayedRecords` to `RecordTableExcelView` and `RecordTableCompactView`, rendering only the active page in the DOM.

---

## 5. Verification & Testing Strategy

1. **Unit Tests**:
   - `test/indexed-db-adapter.test.ts`:
     - Verifies `StorageAdapter` contract (`getItem`, `setItem`, `removeItem`, `clear`).
     - Verifies graceful memory fallback in Node environment.
     - Verifies migration logic from `localStorage`.
   - `test/sqlite-pagination.test.ts`:
     - Verifies `getPaginated` pagination offsets, total count, and multi-field filtering on `SqliteRecordStore`.
2. **API Tests**:
   - `test/api-records-pagination.test.ts`:
     - Verifies `GET /api/records?page=1&pageSize=2` returns paginated slice and `pagination` metadata.
     - Verifies backward compatibility when `page` is omitted (returns full array).
3. **Component Tests**:
   - `test/record-table-pagination.test.ts`:
     - Verifies page slicing, page change callbacks, and page size toggling.
     - Verifies LOC limit `<250 LOC`.
4. **Full Regression**:
   - `npm test` verifying all 365+ tests pass with 0 failures.
   - `npm run build:check` verifying clean Next.js production build.

