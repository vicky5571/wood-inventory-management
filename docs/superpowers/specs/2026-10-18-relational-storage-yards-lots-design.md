# Design Spec: Relational Storage Yards & Kavling Lots (Phase 2)

**Document:** `docs/superpowers/specs/2026-10-18-relational-storage-yards-lots-design.md`  
**Date:** 2026-10-18  
**Status:** Approved for Implementation  
**Decisions Enforced:** Strict Top-Down Cascade (1.A), Soft Warning Pill (2.A), Offline-First Synchronized Store (3.A).

---

## 1. Executive Summary & Problem Statement

### 1.1 Context
In the timber receiving workflow, log shipments arrive at specific log yards (TPK - *Tempat Penimbunan Kayu*) and are stacked into designated inventory lots / kavlings (e.g., `KAV-01`, `KAV-02`). In Phase 1 and prior versions, `storageYard` and `kavlingNumber` were freeform text inputs. This caused:
1. **Data Fragmentation**: Inconsistent naming (`TPK 1`, `TPK-1`, `tpk-1`, `KAV 01`, `KAV-1`) fragmented inventory reporting and volume rollups.
2. **Orphan Lots**: Lots were entered without knowing which physical yard they belonged to.
3. **No Capacity or Lifecycle Awareness**: Operators had no visibility into whether a kavling was full or undergoing yard maintenance.

### 1.2 Objective
Link `kavlingNumber` and `storageYard` to normalized relational tables (`storage_yards` and `storage_lots`) with:
- **Strict Top-Down Cascade**: Operator selects the Storage Yard first, which scopes the Kavling selector to active lots within that specific yard.
- **Status & Capacity Discipline (Soft Warning)**: Lots carry status (`ACTIVE`, `FULL`, `MAINTENANCE`). If a `FULL` or `MAINTENANCE` lot is selected, a soft warning badge is shown without halting gate operations.
- **Offline-First Synchronization**: Client store operates instantly with local storage and seed fallbacks, syncing seamlessly with SQLite via `/api/storage-locations`.
- **Zero Regression**: Preserve the 26-column Buku Besar view, Excel export, and existing test suites.

---

## 2. Architecture & Data Model

### 2.1 Database Schema (SQLite 3NF)
The schema in `src/persistence/sqlite/migrations.ts` already defines:

```sql
CREATE TABLE IF NOT EXISTS storage_yards (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  yard_code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id, yard_code)
);

CREATE TABLE IF NOT EXISTS storage_lots (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  yard_id TEXT NOT NULL REFERENCES storage_yards(id) ON DELETE CASCADE,
  lot_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'FULL', 'MAINTENANCE')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id, yard_id, lot_code)
);
```

Line items in `receiving_items` reference `lot_id REFERENCES storage_lots(id) ON DELETE SET NULL`.  
The dynamic view `v_buku_besar_flat` projects `l.lot_code AS kavlingNumber` and `y.name AS storageYard`.

### 2.2 Domain Interfaces (`src/types/index.ts`)
```ts
export type StorageLotStatus = 'ACTIVE' | 'FULL' | 'MAINTENANCE';

export interface StorageYard {
  id: string;
  tenantId: string;
  yardCode: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StorageLot {
  id: string;
  tenantId: string;
  yardId: string;
  lotCode: string;
  status: StorageLotStatus;
  createdAt: string;
  updatedAt: string;
}

export interface StorageLotWithYard extends StorageLot {
  yardCode: string;
  yardName: string;
}
```

---

## 3. Component & State Design

### 3.1 Offline-First Store (`src/utils/storage-locations.ts`)
- **Default Seed Data**:
  - Yards: `TPK-Timur`, `TPK-Utara`, `TPK-Barat`, `TPK-Selatan`.
  - Lots:
    - `TPK-Timur`: `KAV-01` (ACTIVE), `KAV-02` (ACTIVE)
    - `TPK-Utara`: `KAV-03` (ACTIVE), `KAV-04` (FULL)
    - `TPK-Barat`: `KAV-05` (ACTIVE), `KAV-06` (MAINTENANCE)
    - `TPK-Selatan`: `KAV-07` (ACTIVE), `KAV-08` (ACTIVE)
- **Functions**:
  - `loadStorageLocations()`: Loads from `localStorage` (`wood_storage_locations_v1`), falling back to seeds.
  - `saveStorageLocations(data)`: Updates client storage.
  - `getYards()`: Returns all active storage yards.
  - `getLotsForYard(yardNameOrCode)`: Returns lots belonging to the selected yard.
  - `addYard(name, description?)`: Creates a new yard with generated ID and code.
  - `addLot(yardNameOrCode, lotCode, status?)`: Adds a lot to a specific yard.
  - `filterLots(lots, query)`: Case-insensitive prefix/sub-string search.

### 3.2 UI Subcomponents
1. **`YardSelect.tsx`** (`src/components/ledger/YardSelect.tsx`):
   - Accessible combobox/select rendering known TPK yards.
   - Quick addition: `+ Tambah TPK Baru (添加新场地)`.
   - On change, resets or updates Kavling if the current lot does not belong to the newly selected yard.
   - Kept under 200 LOC.

2. **`KavlingSelect.tsx`** (`src/components/ledger/KavlingSelect.tsx`):
   - Disabled with placeholder `"Pilih TPK terlebih dahulu..."` when no yard is selected.
   - Populated dynamically with lots from `getLotsForYard(selectedYard)`.
   - Renders lot status badge next to lot code:
     - `ACTIVE`: Normal styling or subtle green indicator.
     - `FULL`: `⚠️ Penuh (已满)` amber pill.
     - `MAINTENANCE`: `🛠️ Perawatan (维护)` rose pill.
   - Soft Warning Pill: When a `FULL` or `MAINTENANCE` lot is selected, displays a non-blocking warning notice below the input.
   - Quick addition: `+ Tambah Kavling Baru (添加新批号)` creates a new lot scoped to the currently selected yard.
   - Kept under 220 LOC.

3. **`ManifestItemRow.tsx` Integration**:
   - Replaces `<input placeholder="KAV-01">` and `<input placeholder="TPK-1">` with `<YardSelect>` and `<KavlingSelect>`.
   - Updates `item.storageYard` and `item.kavlingNumber` on change.
   - Kept strictly under 250 LOC.

---

## 4. API & SQLite Integration

### 4.1 REST Endpoint: `app/api/storage-locations/route.ts`
- **`GET /api/storage-locations`**:
  - Returns `{ success: true, data: { yards: StorageYard[], lots: StorageLotWithYard[] } }`.
- **`POST /api/storage-locations`**:
  - Supports adding a new yard `{ type: 'yard', name: string, code?: string }`.
  - Supports adding a new lot `{ type: 'lot', yardId: string, lotCode: string, status?: StorageLotStatus }`.
  - Validates authentication (Level 1/2 operators).

### 4.2 SQLite Store Integration (`src/persistence/sqlite-record-store.ts`)
- `getStorageLocations()`: Queries `storage_yards` and `storage_lots` JOIN `storage_yards`.
- `saveStorageYard()` and `saveStorageLot()`: Upserts into respective tables.
- In `migrate-json.ts`, `resolveLotId` already links lots to yards. Ensure it marks newly discovered lots as `ACTIVE`.

---

## 5. Verification & Testing Strategy

1. **Unit Tests**:
   - `test/storage-locations.test.ts`:
     - Default seeds, localStorage persistence, and cache hydration.
     - Cascading filter: `getLotsForYard('TPK-Timur')` returns only `KAV-01` and `KAV-02`.
     - Soft warning helper: status recognition for `FULL` and `MAINTENANCE`.
     - Adding dynamic yards and lots with uppercase normalization.
2. **Component Tests**:
   - `test/storage-select.test.ts`:
     - `KavlingSelect` is disabled when yard is empty.
     - Selecting yard enables `KavlingSelect` with scoped options.
     - Selecting full lot shows soft warning without blocking submit.
     - `ManifestItemRow` mounts new selectors and stays under 250 LOC.
3. **Integration Tests**:
   - `test/api-storage-locations.test.ts`:
     - Verifies `GET /api/storage-locations` returns relational yards and lots.
     - Verifies `POST /api/storage-locations` creates lots mapped to yards.
4. **Full Regression**:
   - `npm test` verifying all 330+ tests pass with 0 failures.
   - `npm run build` verifying production compile in under 10s.
