# Persistence Split-Brain & Data Integrity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate `localStorage`-only split-brain state across Suppliers, Species, Settings, and Activity Logs; enforce an append-only server-side audit trail; synchronize `resetDemo()` with the server database; and wire server-driven pagination into `useWoodRecords`.

**Architecture:** Extend the SQLite and Supabase persistence bridge with dedicated modular query helpers (`master-data-queries.ts`, `activity-queries.ts`) and Next.js Route Handlers (`/api/suppliers`, `/api/species`, `/api/settings`, `/api/activity`, plus `POST /api/records` reset action), while preserving optimistic `localStorage` caching in React hooks.

**Tech Stack:** Node.js 26.8.1 (Native ESM, `node:sqlite`, global `fetch`), Next.js 15.1.0, React 19, TypeScript 5.7, Node.js Native Test Runner (`node:test` + `node:assert/strict`).

**Spec:** [docs/superpowers/specs/2026-10-20-persistence-split-brain-and-data-integrity-design.md](file:///Users/mac/Web%20Development/wood-inventory-management/docs/superpowers/specs/2026-10-20-persistence-split-brain-and-data-integrity-design.md)

## Global Constraints
- Single Source of Truth (SSOT): All shared domain types and action enums must live in `src/types/index.ts`.
- God File Prevention: Every new or modified module must stay under 250 lines.
- Test-First Execution: Write the failing `node:test` suite first, implement minimal passing code, and verify `0 failures`.
- Resilient Offline Fallback: Client hooks (`useSuppliers`, `useSettings`, `useActivityLog`, `useWoodRecords`) must keep `localStorage` / memory fallback so unit tests and offline tablets continue working without network access.
- Language Standard: All source code, comments, tests, and commit messages strictly in English.

---

### Task 1: Extend SSOT Types & Relational Migrations for Settings and Audit Logs

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/persistence/sqlite/migrations.ts`
- Modify: `supabase/migrations/20261019000000_init_wood_inventory.sql`
- Create: `src/persistence/sqlite/activity-queries.ts`
- Test: `test/sqlite-activity-and-settings.test.ts`

**Interfaces:**
- Extend `ActivityActionType` in `src/types/index.ts` with `'SALE_CREATED' | 'SALE_UPDATED' | 'SALE_DELETED' | 'STORAGE_UPDATED'`.
- Produce SQLite helper functions in `src/persistence/sqlite/activity-queries.ts`:
  - `listActivityLogsFromDb(db: DatabaseSync, actionFilter?: string, limit?: number): ActivityLogEntry[]`
  - `appendActivityLogToDb(db: DatabaseSync, entry: Omit<ActivityLogEntry, 'id' | 'timestamp'> & { id?: string; timestamp?: string }): ActivityLogEntry`
  - `getSettingsFromDb(db: DatabaseSync): AppSettings`
  - `saveSettingsToDb(db: DatabaseSync, patch: Partial<AppSettings>): AppSettings`

- [x] **Step 1: Write the failing test (`test/sqlite-activity-and-settings.test.ts`)**

```typescript
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSqliteDatabase } from '../src/persistence/sqlite/db.ts';
import { runMigrations } from '../src/persistence/sqlite/migrations.ts';
import {
  listActivityLogsFromDb,
  appendActivityLogToDb,
  getSettingsFromDb,
  saveSettingsToDb,
} from '../src/persistence/sqlite/activity-queries.ts';

test('SQLite Activity Logs & App Settings Persistence Suite', async (t) => {
  const db = createSqliteDatabase(':memory:');
  runMigrations(db);
  t.after(() => db.close());

  await t.test('returns default settings and persists partial updates', () => {
    const initial = getSettingsFromDb(db);
    assert.equal(initial.defaultTimberPphRate, 0.5);
    assert.equal(initial.acceptableDiscrepancyThresholdPct, 2.0);

    const updated = saveSettingsToDb(db, {
      defaultTimberPphRate: 1.5,
      yardName: 'TPK-02 Selatan',
    });
    assert.equal(updated.defaultTimberPphRate, 1.5);
    assert.equal(updated.yardName, 'TPK-02 Selatan');
    assert.equal(updated.defaultFreightPphRate, 2.0);
  });

  await t.test('appends immutable activity logs and filters by action', () => {
    appendActivityLogToDb(db, {
      action: 'RECORD_CREATED',
      entityId: 'rec-01',
      entitySummary: 'Truk KB 1234 XY • Meranti (12.5 m³)',
      operatorName: 'Budi Santoso',
      operatorRole: 'Level 1',
    });
    appendActivityLogToDb(db, {
      action: 'SALE_CREATED',
      entityId: 'sale-01',
      entitySummary: 'DO/2026/001 • PT Kayu Jaya (5.0 m³)',
      operatorName: 'Budi Santoso',
      operatorRole: 'Level 1',
    });

    const all = listActivityLogsFromDb(db);
    assert.equal(all.length, 2);

    const salesOnly = listActivityLogsFromDb(db, 'SALE_CREATED');
    assert.equal(salesOnly.length, 1);
    assert.equal(salesOnly[0].entityId, 'sale-01');
  });
});
```

- [x] **Step 2: Run test to confirm it fails**
  - Run: `node --test test/sqlite-activity-and-settings.test.ts`

- [x] **Step 3: Implement schema tables (`app_settings`, `activity_logs`) in `migrations.ts` and `activity-queries.ts`**
  - Add `app_settings` and `activity_logs` tables to `src/persistence/sqlite/migrations.ts` and `supabase/migrations/20261019000000_init_wood_inventory.sql`.
  - Seed default tenant (`default-tenant`) before reading/writing `app_settings`.
  - Implement `src/persistence/sqlite/activity-queries.ts` (<150 lines).

- [x] **Step 4: Run targeted test and verify 0 failures**
  - Run: `node --test test/sqlite-activity-and-settings.test.ts`

---

### Task 2: Master Data SQLite & Server Bridge for Suppliers and Species

**Files:**
- Create: `src/persistence/sqlite/master-data-queries.ts`
- Modify: `src/persistence/sqlite-record-store.ts`
- Modify: `src/persistence/server-record-store.ts`
- Test: `test/sqlite-master-data.test.ts`

**Interfaces:**
- Produce in `src/persistence/sqlite/master-data-queries.ts`:
  - `getSuppliersFromDb(db: DatabaseSync): Supplier[]`
  - `saveSupplierToDb(db: DatabaseSync, data: Partial<Supplier> & { name: string }): Supplier`
  - `deleteSupplierFromDb(db: DatabaseSync, id: string): boolean`
  - `getSpeciesFromDb(db: DatabaseSync): WoodSpecies[]`
  - `saveSpeciesToDb(db: DatabaseSync, species: Partial<WoodSpecies> & { code: string; commonName: string }): WoodSpecies`
- Expose corresponding async methods on `SqliteRecordStore` and `ServerRecordStore` (with Supabase PostgREST delegation when configured).

- [x] **Step 1: Write the failing test (`test/sqlite-master-data.test.ts`)**

```typescript
import test from 'node:test';
import assert from 'node:assert/strict';
import { SqliteRecordStore } from '../src/persistence/sqlite-record-store.ts';

test('SqliteRecordStore Suppliers & Species Master Data Suite', async (t) => {
  const store = new SqliteRecordStore(':memory:');
  t.after(() => store.close());

  await t.test('seeds initial suppliers and supports create, update, and safe delete', async () => {
    const initial = await store.getSuppliers();
    assert.ok(initial.length > 0);

    const created = await store.saveSupplier({
      name: 'CV Rimba Borneo',
      contactPerson: 'Hendra',
      phone: '08123456789',
      status: 'ACTIVE',
    });
    assert.ok(created.id);
    assert.equal(created.name, 'CV Rimba Borneo');

    const deleted = await store.deleteSupplier(created.id);
    assert.equal(deleted, true);
  });

  await t.test('prevents deleting a supplier referenced by an active receiving manifest', async () => {
    const suppliers = await store.getSuppliers();
    const activeSupplier = suppliers[0];
    await assert.rejects(
      async () => store.deleteSupplier(activeSupplier.id),
      /referenced by existing receiving manifests|FOREIGN KEY/i
    );
  });

  await t.test('lists and upserts wood species catalog entries', async () => {
    const species = await store.getSpecies();
    assert.ok(species.length > 0);

    const saved = await store.saveSpecies({
      code: 'KMP',
      commonName: 'Kempas',
      botanicalName: 'Koompassia malaccensis',
      densityKgM3: 880,
      isHardwood: true,
    });
    assert.equal(saved.code, 'KMP');
    assert.equal(saved.densityKgM3, 880);
  });
});
```

- [x] **Step 2: Run test to confirm it fails**
  - Run: `node --test test/sqlite-master-data.test.ts`

- [x] **Step 3: Implement `master-data-queries.ts` and wire into `SqliteRecordStore` and `ServerRecordStore`**
  - Seed `SEED_SUPPLIERS` and `TIMBER_SPECIES_CATALOGUE` on initialization if empty.
  - Check foreign-key references in `receiving_manifests` before deleting a supplier so a clear domain error is thrown if manifests exist.

- [x] **Step 4: Run targeted test and verify 0 failures**
  - Run: `node --test test/sqlite-master-data.test.ts`

---

### Task 3: API Route Handlers (`/api/suppliers`, `/api/species`, `/api/settings`, `/api/activity`) & Server-Enforced Audit Logging

**Files:**
- Create: `app/api/suppliers/route.ts`
- Create: `app/api/species/route.ts`
- Create: `app/api/settings/route.ts`
- Create: `app/api/activity/route.ts`
- Modify: `app/api/records/route.ts`
- Modify: `app/api/sales/route.ts`
- Modify: `app/api/storage-locations/route.ts`
- Test: `test/api-master-and-audit.test.ts`

**Behavior:**
- Authenticate every request via `verifySessionToken`.
- Enforce `user.roleLevel === 1` on all `POST` and `DELETE` handlers (`403 Forbidden` for Level 2/3, `401 Unauthorized` for unauthenticated).
- Do NOT expose a `DELETE` handler on `/api/activity` (immutable append-only audit log).
- Automatically append an `ActivityLogEntry` via `serverRecordStore.appendActivityLog(...)` inside `POST`/`DELETE` of `/api/records`, `/api/sales`, `/api/suppliers`, `/api/storage-locations`, and `/api/settings`.
- Support `{ action: 'reset' }` in `POST /api/records` to execute `serverRecordStore.reset()` and log `DEMO_RESET`.

- [x] **Step 1: Write the failing test (`test/api-master-and-audit.test.ts`)**

```typescript
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSessionToken, COOKIE_NAME } from '../src/auth/session.ts';
import { GET as getSuppliers, POST as postSupplier, DELETE as deleteSupplier } from '../app/api/suppliers/route.ts';
import { GET as getSettings, POST as postSettings } from '../app/api/settings/route.ts';
import { GET as getActivity } from '../app/api/activity/route.ts';
import { POST as postRecords } from '../app/api/records/route.ts';

const managerToken = createSessionToken({
  id: 'usr-manager-01',
  email: 'manager@timber.id',
  name: 'Budi Santoso',
  roleLevel: 1,
  title: 'Level 1',
});

const viewerToken = createSessionToken({
  id: 'usr-viewer-03',
  email: 'viewer@timber.id',
  name: 'Robert Tan',
  roleLevel: 3,
  title: 'Level 3',
});

test('Master Data, Settings, Reset & Immutable Audit API Suite', async (t) => {
  await t.test('blocks Level 3 from mutating suppliers or settings (403)', async () => {
    const req = new Request('http://localhost/api/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: `${COOKIE_NAME}=${viewerToken}`,
      },
      body: JSON.stringify({ defaultTimberPphRate: 1.0 }),
    });
    const res = await postSettings(req);
    assert.equal(res.status, 403);
  });

  await t.test('persists supplier and settings updates and records server-side audit logs', async () => {
    const createReq = new Request('http://localhost/api/suppliers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: `${COOKIE_NAME}=${managerToken}`,
      },
      body: JSON.stringify({ name: 'PT Hutan Lestari', status: 'ACTIVE' }),
    });
    const createRes = await postSupplier(createReq);
    assert.equal(createRes.status, 200);
    const createdJson = await createRes.json();
    assert.equal(createdJson.success, true);

    const logRes = await getActivity(new Request('http://localhost/api/activity'));
    const logJson = await logRes.json();
    assert.equal(logJson.success, true);
    assert.ok(logJson.data.some((l: any) => l.action === 'SUPPLIER_CREATED' && l.entitySummary.includes('PT Hutan Lestari')));
  });

  await t.test('executes full-stack demo reset via POST /api/records { action: "reset" }', async () => {
    const resetReq = new Request('http://localhost/api/records', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: `${COOKIE_NAME}=${managerToken}`,
      },
      body: JSON.stringify({ action: 'reset' }),
    });
    const resetRes = await postRecords(resetReq);
    assert.equal(resetRes.status, 200);
    const resetJson = await resetRes.json();
    assert.equal(resetJson.success, true);
    assert.ok(Array.isArray(resetJson.data));
  });
});
```

- [x] **Step 2: Run test to confirm it fails**
  - Run: `node --test test/api-master-and-audit.test.ts`

- [x] **Step 3: Implement the API route handlers and server-side audit logging**
  - Create `/api/suppliers/route.ts`, `/api/species/route.ts`, `/api/settings/route.ts`, and `/api/activity/route.ts`.
  - Add `{ action: 'reset' }` handling to `POST /api/records`.
  - Append audit log entries inside the mutation routes.

- [x] **Step 4: Run targeted test and verify 0 failures**
  - Run: `node --test test/api-master-and-audit.test.ts`

---

### Task 4: Wire Client Hooks (`useSuppliers`, `useSettings`, `useActivityLog`) & Remove Mutable Audit Controls

**Files:**
- Modify: `src/hooks/useSuppliers.ts`
- Modify: `src/hooks/useSettings.ts`
- Modify: `src/hooks/useActivityLog.ts`
- Modify: `app/activity/page.tsx`
- Modify: `src/components/settings/SpeciesSettings.tsx`
- Test: `test/activity-view.test.ts`

**Behavior:**
- `useSuppliers`: Hydrate optimistically from `SupplierRepository` (`localStorage`/memory), then background-sync with `GET /api/suppliers`. Dispatch `POST /api/suppliers` on `addSupplier`/`updateSupplier` and `DELETE /api/suppliers?id=...` on `deleteSupplier`.
- `useSettings`: Hydrate optimistically from `localStorage`, then sync with `GET /api/settings`. Dispatch `POST /api/settings` on `saveSettings`/`resetSettings`.
- `useActivityLog`: Hydrate from `GET /api/activity` with `localStorage` fallback. Remove destructive `clearLogs` and `resetLogs` buttons from `app/activity/page.tsx` so the audit log UI is strictly read-only and append-only. Add filter tabs for `SALE_CREATED` and `SETTINGS_UPDATED`.

- [x] **Step 1: Update `test/activity-view.test.ts` to assert immutable audit log UI (no delete/clear buttons)**
  - Run: `node --test test/activity-view.test.ts`

- [x] **Step 2: Update `useSuppliers.ts`, `useSettings.ts`, `useActivityLog.ts`, `SpeciesSettings.tsx`, and `app/activity/page.tsx`**

- [x] **Step 3: Run targeted tests and verify 0 failures**
  - Run: `node --test test/activity-view.test.ts test/activity-logger.test.ts test/supplier-crud.test.ts`

---

### Task 5: Server-Driven Pagination & Server Demo Reset in `useWoodRecords`

**Files:**
- Modify: `src/hooks/useWoodRecords.ts`
- Create: `src/utils/record-query-url.ts`
- Test: `test/use-wood-records-pagination.test.ts`

**Interfaces:**
- Produce pure helper `buildRecordsApiUrl(params: RecordQueryParams): string` in `src/utils/record-query-url.ts`.
- Extend `useWoodRecords` return contract with:
  - `pagination: PaginationMeta`
  - `page: number`
  - `pageSize: number`
  - `setPage: (page: number) => void`
  - `setPageSize: (size: number) => void`
- Update `resetDemo()` in `useWoodRecords.ts` to dispatch `POST /api/records` with `{ action: 'reset' }` inside `syncWithServer`.

- [x] **Step 1: Write the failing test (`test/use-wood-records-pagination.test.ts`)**

```typescript
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRecordsApiUrl } from '../src/utils/record-query-url.ts';

test('buildRecordsApiUrl Query String Builder Suite', async (t) => {
  await t.test('serializes pagination and active filter criteria into /api/records URL', () => {
    const url = buildRecordsApiUrl({
      page: 2,
      pageSize: 25,
      searchQuery: 'KB 8888',
      species: 'Meranti',
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      paymentStatus: 'UNPAID',
    });
    assert.equal(
      url,
      '/api/records?page=2&pageSize=25&searchQuery=KB+8888&species=Meranti&startDate=2026-10-01&endDate=2026-10-31&paymentStatus=UNPAID'
    );
  });

  await t.test('omits empty filters and ALL paymentStatus', () => {
    const url = buildRecordsApiUrl({
      page: 1,
      pageSize: 50,
      searchQuery: '   ',
      paymentStatus: 'ALL',
    });
    assert.equal(url, '/api/records?page=1&pageSize=50');
  });
});
```

- [x] **Step 2: Run test to confirm it fails**
  - Run: `node --test test/use-wood-records-pagination.test.ts`

- [x] **Step 3: Implement `src/utils/record-query-url.ts` and update `src/hooks/useWoodRecords.ts`**
  - Wire `buildRecordsApiUrl` into `useWoodRecords` server sync and expose `pagination` metadata.
  - Ensure `resetDemo()` sends `POST /api/records` with `{ action: 'reset' }`.

- [x] **Step 4: Run targeted tests and full test suite**
  - Run: `node --test test/use-wood-records-pagination.test.ts test/api-records-pagination.test.ts`
  - Run: `node --test`
