# Supabase Persistence Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement zero-dependency native Supabase persistence bridge for inbound records, outbound sales, and storage master data with local SQLite fallback.

**Architecture:** A native fetch-based Supabase PostgREST client that acts as the primary cloud database adapter when `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are configured, with automatic fallback to local SQLite for offline/unconfigured environments.

**Tech Stack:** Node.js 26.8.1 (Native ESM, global fetch), Next.js 15.1.0, Supabase PostgREST REST API, Node.js Native Test Runner (node:test + node:assert).

**Spec:** [docs/superpowers/specs/2026-10-19-supabase-persistence-architecture-design.md](file:///Users/mac/Web%20Development/wood-inventory-management/docs/superpowers/specs/2026-10-19-supabase-persistence-architecture-design.md)

## Global Constraints
- Node.js 26.8.1 native standard library only for HTTP communication (native `fetch`, zero npm dependencies).
- Single Source of Truth: All domain types must import from `src/types/index.ts`.
- Non-Breaking: All existing 501 unit and integration tests must continue to pass without regression.
- Resilient Fallback: If Supabase credentials are missing or network requests fail, fall back gracefully to local SQLite.
- Language Standard: Code, comments, commits, and documentation strictly in English.

---

### Task 1: Zero-Dependency Supabase PostgREST Client

**Files:**
- Create: `src/persistence/supabase/supabase-client.ts`
- Test: `test/supabase-client.test.ts`

**Interfaces:**
- Produces:
  - `isSupabaseConfigured(): boolean`
  - `getSupabaseConfig(): { url: string; key: string } | null`
  - `supabaseFetch<T>(endpoint: string, options?: RequestInit & { prefer?: string }): Promise<T>`

- [ ] **Step 1: Write the failing test**

```typescript
// test/supabase-client.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { isSupabaseConfigured, getSupabaseConfig, supabaseFetch } from '../src/persistence/supabase/supabase-client.ts';

test('Supabase Client Configuration & Fetch Suite', async (t) => {
  const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const origKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  t.after(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = origUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = origKey;
  });

  await t.test('isSupabaseConfigured returns false when env is unset', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    assert.equal(isSupabaseConfigured(), false);
  });

  await t.test('isSupabaseConfigured returns true when URL and KEY are set', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'secret-service-key';
    assert.equal(isSupabaseConfigured(), true);
    const config = getSupabaseConfig();
    assert.deepEqual(config, {
      url: 'https://example.supabase.co',
      key: 'secret-service-key',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/supabase-client.test.ts`
Expected: FAIL with module not found `../src/persistence/supabase/supabase-client.ts`

- [ ] **Step 3: Implement minimal code in `src/persistence/supabase/supabase-client.ts`**

```typescript
// src/persistence/supabase/supabase-client.ts
export interface SupabaseConfig {
  url: string;
  key: string;
}

export function getSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.trim();

  if (!url || !key) return null;
  return { url: url.replace(/\/+$/, ''), key };
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfig() !== null;
}

export async function supabaseFetch<T>(
  endpoint: string,
  options: RequestInit & { prefer?: string } = {}
): Promise<T> {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error('Supabase credentials are not configured.');
  }

  const { prefer, headers: customHeaders, ...rest } = options;
  const cleanPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = `${config.url}/rest/v1${cleanPath}`;

  const headers: Record<string, string> = {
    'apikey': config.key,
    'Authorization': `Bearer ${config.key}`,
    'Content-Type': 'application/json',
    ...(prefer ? { 'Prefer': prefer } : {}),
    ...(customHeaders as Record<string, string> || {}),
  };

  const response = await fetch(fullUrl, {
    ...rest,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`Supabase PostgREST error (${response.status} ${response.statusText}): ${errorBody}`);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null as T;
  }

  return response.json() as Promise<T>;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/supabase-client.test.ts`
Expected: PASS (2 tests pass)

- [ ] **Step 5: Commit**

```bash
git add src/persistence/supabase/supabase-client.ts test/supabase-client.test.ts
git commit -m "feat(supabase): add zero-dependency native fetch postgrest client"
```

---

### Task 2: Supabase Outbound Sales Store (`SupabaseSalesStore`)

**Files:**
- Create: `src/persistence/supabase/supabase-sales-store.ts`
- Test: `test/supabase-sales-store.test.ts`

**Interfaces:**
- Consumes: `supabaseFetch`, `WoodSalesRecord`, `SalesFormInput` from `src/types/index.ts`.
- Produces:
  - `getAll(): Promise<WoodSalesRecord[]>`
  - `getById(id: string): Promise<WoodSalesRecord | null>`
  - `save(input: SalesFormInput): Promise<WoodSalesRecord>`
  - `delete(id: string): Promise<boolean>`

- [ ] **Step 1: Write the failing test**

```typescript
// test/supabase-sales-store.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { SupabaseSalesStore } from '../src/persistence/supabase/supabase-sales-store.ts';
import type { SalesFormInput } from '../src/types/index.ts';

test('SupabaseSalesStore Contract Suite', async (t) => {
  // Mock fetch runner
  const origFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = origFetch;
  });

  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-key';

  await t.test('getAll maps PostgreSQL snake_case rows to WoodSalesRecord', async () => {
    globalThis.fetch = async () => new Response(JSON.stringify([
      {
        id: 'sls-001',
        sale_date: '2026-10-15',
        delivery_order_number: 'DO-001',
        truck_plate_number: 'B 1234 CD',
        driver_name: 'Driver 1',
        customer_name: 'Customer A',
        storage_yard: 'TPK-Timur',
        kavling_number: 'KAV-01',
        wood_species: 'Teak / Jati (柚木)',
        pieces: 10,
        volume_m3: 2.5,
        price_per_m3: 5000000,
        total_price: 12500000,
        payment_status: 'PAID',
        invoice_number: 'INV-001',
        notes: 'Test note',
        created_at: '2026-10-15T00:00:00Z',
        updated_at: '2026-10-15T00:00:00Z',
      }
    ]), { status: 200, headers: { 'Content-Type': 'application/json' } });

    const store = new SupabaseSalesStore();
    const sales = await store.getAll();

    assert.equal(sales.length, 1);
    assert.equal(sales[0].id, 'sls-001');
    assert.equal(sales[0].deliveryOrderNumber, 'DO-001');
    assert.equal(sales[0].totalPrice, 12500000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/supabase-sales-store.test.ts`
Expected: FAIL with module not found `../src/persistence/supabase/supabase-sales-store.ts`

- [ ] **Step 3: Implement `src/persistence/supabase/supabase-sales-store.ts`**

```typescript
// src/persistence/supabase/supabase-sales-store.ts
import { supabaseFetch } from './supabase-client.ts';
import type { WoodSalesRecord, SalesFormInput, PaymentStatus } from '../../types/index.ts';

interface SupabaseSaleRow {
  id: string;
  sale_date: string;
  delivery_order_number: string;
  truck_plate_number: string;
  driver_name: string | null;
  customer_name: string;
  storage_yard: string;
  kavling_number: string;
  wood_species: string;
  pieces: number;
  volume_m3: number;
  price_per_m3: number;
  total_price: number;
  payment_status: string;
  invoice_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function mapRowToRecord(row: SupabaseSaleRow): WoodSalesRecord {
  return {
    id: row.id,
    saleDate: row.sale_date,
    deliveryOrderNumber: row.delivery_order_number,
    truckPlateNumber: row.truck_plate_number,
    driverName: row.driver_name || undefined,
    customerName: row.customer_name,
    storageYard: row.storage_yard,
    kavlingNumber: row.kavling_number,
    woodSpecies: row.wood_species,
    pieces: Number(row.pieces),
    volumeM3: Number(row.volume_m3),
    pricePerM3: Number(row.price_per_m3),
    totalPrice: Number(row.total_price),
    paymentStatus: (row.payment_status as PaymentStatus) || 'UNPAID',
    invoiceNumber: row.invoice_number || undefined,
    notes: row.notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SupabaseSalesStore {
  async getAll(): Promise<WoodSalesRecord[]> {
    const rows = await supabaseFetch<SupabaseSaleRow[]>(
      '/sales_records?select=*&order=sale_date.desc,created_at.desc'
    );
    return rows.map(mapRowToRecord);
  }

  async getById(id: string): Promise<WoodSalesRecord | null> {
    const rows = await supabaseFetch<SupabaseSaleRow[]>(
      `/sales_records?id=eq.${encodeURIComponent(id)}&select=*`
    );
    return rows.length > 0 ? mapRowToRecord(rows[0]) : null;
  }

  async save(sale: SalesFormInput): Promise<WoodSalesRecord> {
    const id = sale.id || `sls-${Date.now()}`;
    const vol = Number(sale.volumeM3) || 0;
    const price = Number(sale.pricePerM3) || 0;
    const totalPrice = Math.round(vol * price);
    const now = new Date().toISOString();

    const rowPayload = {
      id,
      sale_date: sale.saleDate,
      delivery_order_number: sale.deliveryOrderNumber,
      truck_plate_number: sale.truckPlateNumber,
      driver_name: sale.driverName || null,
      customer_name: sale.customerName,
      storage_yard: sale.storageYard,
      kavling_number: sale.kavlingNumber,
      wood_species: sale.woodSpecies,
      pieces: Number(sale.pieces) || 0,
      volume_m3: vol,
      price_per_m3: price,
      total_price: totalPrice,
      payment_status: sale.paymentStatus || 'UNPAID',
      invoice_number: sale.invoiceNumber || null,
      notes: sale.notes || null,
      updated_at: now,
    };

    const inserted = await supabaseFetch<SupabaseSaleRow[]>(
      '/sales_records',
      {
        method: 'POST',
        prefer: 'resolution=merge-duplicates,return=representation',
        body: JSON.stringify(rowPayload),
      }
    );

    return mapRowToRecord(inserted[0]);
  }

  async delete(id: string): Promise<boolean> {
    await supabaseFetch(
      `/sales_records?id=eq.${encodeURIComponent(id)}`,
      { method: 'DELETE' }
    );
    return true;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/supabase-sales-store.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/persistence/supabase/supabase-sales-store.ts test/supabase-sales-store.test.ts
git commit -m "feat(supabase): add SupabaseSalesStore outbound sales adapter"
```

---

### Task 3: Supabase Inbound Receiving Store (`SupabaseRecordStore`)

**Files:**
- Create: `src/persistence/supabase/supabase-record-store.ts`
- Test: `test/supabase-record-store.test.ts`

**Interfaces:**
- Consumes: `supabaseFetch`, `WoodReceivingRecord`, `ManifestFormInput`, `RecordQueryParams`, `PaginatedResult` from `src/types/index.ts`.
- Produces:
  - `getAll(): Promise<WoodReceivingRecord[]>`
  - `getPaginated(params?: RecordQueryParams): Promise<PaginatedResult<WoodReceivingRecord>>`
  - `getById(id: string): Promise<WoodReceivingRecord | null>`
  - `save(record: WoodReceivingRecord): Promise<WoodReceivingRecord>`
  - `saveManifest(manifest: ManifestFormInput): Promise<WoodReceivingRecord[]>`
  - `delete(id: string): Promise<boolean>`
  - `deleteManifest(manifestId: string): Promise<boolean>`

- [ ] **Step 1: Write the failing test**

```typescript
// test/supabase-record-store.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { SupabaseRecordStore } from '../src/persistence/supabase/supabase-record-store.ts';

test('SupabaseRecordStore Suite', async (t) => {
  const origFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = origFetch;
  });

  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-key';

  await t.test('getAll queries v_buku_besar_flat', async () => {
    globalThis.fetch = async (url) => {
      assert.ok(String(url).includes('v_buku_besar_flat'));
      return new Response(JSON.stringify([
        {
          id: 'rec-001',
          manifest_id: 'rec-001',
          item_id: 'item-001',
          tenant_id: 'default-tenant',
          receiptDate: '2026-10-01',
          truckPlateNumber: 'B 9283 TDA',
          woodSpecies: 'Teak / Jati (柚木)',
          tallyPieces: 85,
          tallyVolumeM3: 14.65,
          grandNetPayable: 65311600,
        }
      ]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };

    const store = new SupabaseRecordStore();
    const records = await store.getAll();
    assert.equal(records.length, 1);
    assert.equal(records[0].id, 'rec-001');
    assert.equal(records[0].tallyVolumeM3, 14.65);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/supabase-record-store.test.ts`
Expected: FAIL with module not found

- [ ] **Step 3: Implement `src/persistence/supabase/supabase-record-store.ts`**

Implement `SupabaseRecordStore` reading from `v_buku_besar_flat` and inserting into `receiving_manifests` and `receiving_items`. Resolve `species_id`, `supplier_id`, `lot_id` deterministically from Supabase tables with fallback creation if not registered.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/supabase-record-store.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/persistence/supabase/supabase-record-store.ts test/supabase-record-store.test.ts
git commit -m "feat(supabase): add SupabaseRecordStore inbound receiving manifest adapter"
```

---

### Task 4: Server Persistence Bridge Integration (Dual-Mode Cloud/Local)

**Files:**
- Modify: `src/persistence/server-record-store.ts`
- Modify: `src/persistence/sales-store.ts`
- Test: `test/server-store-supabase-bridge.test.ts`

**Interfaces:**
- Consumes: `isSupabaseConfigured()`, `SupabaseRecordStore`, `SupabaseSalesStore`, `SqliteRecordStore`.
- Produces: Seamless delegation to Supabase when configured, or SQLite fallback when unconfigured.

- [ ] **Step 1: Write the failing test**

```typescript
// test/server-store-supabase-bridge.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { ServerRecordStore } from '../src/persistence/server-record-store.ts';

test('ServerRecordStore Bridge Delegation Suite', async (t) => {
  const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  t.after(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = origUrl;
  });

  await t.test('delegates to sqlite when supabase is unconfigured', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const store = new ServerRecordStore();
    const records = await store.getAll();
    assert.ok(Array.isArray(records));
  });
});
```

- [ ] **Step 2: Run test to verify it fails or validates delegation**

Run: `node --test test/server-store-supabase-bridge.test.ts`

- [ ] **Step 3: Update `server-record-store.ts` and `sales-store.ts`**

Update `serverRecordStore` and `salesStore` to check `isSupabaseConfigured()`. If true, delegate queries and mutations to `SupabaseRecordStore` and `SupabaseSalesStore`, with automatic fallback to SQLite on runtime connection failure.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/server-store-supabase-bridge.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/persistence/server-record-store.ts src/persistence/sales-store.ts test/server-store-supabase-bridge.test.ts
git commit -m "feat(persistence): connect ServerRecordStore and SalesStore to Supabase with local fallback"
```

---

### Task 5: Automated Supabase Database Seeding Engine

**Files:**
- Create: `scripts/seed-supabase.ts`
- Modify: `package.json` (add `"db:seed:supabase": "node scripts/seed-supabase.ts"`)
- Test: `test/seed-supabase.test.ts`

**Interfaces:**
- Consumes: `supabaseFetch`, `SEED_WOOD_RECORDS`, `SEED_SUPPLIERS`, `SEED_WOOD_SALES`.
- Produces: Executable CLI script that seeds `default-tenant`, `wood_species`, `storage_yards`, `storage_lots`, `suppliers`, `receiving_manifests`, `receiving_items`, and `sales_records` directly into Supabase.

- [ ] **Step 1: Write test for seed-supabase utility**
- [ ] **Step 2: Implement `scripts/seed-supabase.ts`**
- [ ] **Step 3: Run `npm run db:seed:supabase` to seed the user's remote Supabase database**
- [ ] **Step 4: Commit**

```bash
git add scripts/seed-supabase.ts package.json test/seed-supabase.test.ts
git commit -m "feat(db): add automated Supabase seeder script"
```

---

### Task 6: Cloud Verification & Full Test Suite

- [ ] **Step 1: Run `npm run db:seed:supabase`**
- [ ] **Step 2: Verify Supabase tables (`receiving_items`, `sales_records`) contain records**
- [ ] **Step 3: Run full test suite: `node --test` (verify 0 failures)**
- [ ] **Step 4: Verify Next.js production build: `npm run build:check`**
- [ ] **Step 5: Final review and commit**

---

### Execution Choice

Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, with fast iteration.
2. **Inline Execution** — Execute tasks in this current session using checkpoints.

Which approach would you prefer?
