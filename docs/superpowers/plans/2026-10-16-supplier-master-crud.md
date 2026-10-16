# Supplier Master CRUD & Scorecard Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the read-only `/suppliers` view into a complete Master Data CRUD management module with persistent storage, quality scorecard metric merging, modal forms, edit/delete actions, and a ledger receiving autocomplete combobox.

**Architecture:** 
1. Establish a standalone `Supplier` entity in the central SSOT (`src/types/index.ts`) and create an atomic `SupplierRepository` backed by `localStorage` (`wood_suppliers_v1`) with resilient memory fallback.
2. Upgrade `useSuppliers` hook to merge registered supplier master records with real-time delivery performance metrics (`calculateSupplierSummaries`) into unified `SupplierWithMetrics` items, exposing reactive CRUD methods (`addSupplier`, `updateSupplier`, `deleteSupplier`).
3. Build an accessible `SupplierModal` dialog for adding/editing vendor profiles, enhance `SupplierCard` and `SupplierTable` with edit/delete triggers, and wire a `SupplierCombobox` into `RecordModal` for streamlined yard receiving.

**Tech Stack:** Next.js 15+ (App Router), React 19, TypeScript, Vanilla CSS Design Tokens & Tailwind CSS, Lucide Icons, Node.js Native Test Runner (`node:test` + `node:assert`).

---

## Global Constraints
- **SSOT Invariant:** All entity types, interfaces, and schemas MUST be defined in or re-exported from [src/types/index.ts](file:///Users/mac/Web%20Development/wood-inventory-management/src/types/index.ts).
- **Zero Inline Interfaces:** Reject duplicate inline type declarations across components or hooks.
- **Strangler Pattern:** Keep UI components focused and modular (< 250 lines). Business logic belongs in hooks/repositories.
- **Bilingual Interface:** All UI copy, labels, and placeholders must include Indonesian with Chinese parentheticals (e.g., `Tambah Pemasok (新增供应商)`).
- **Test-Driven:** Every task begins with a failing native test before implementation code is written.

---

### Task 1: SSOT Domain Entities & Seed Data for Suppliers

**Files:**
- Modify: `src/types/index.ts:290-340`
- Modify: `src/persistence/seed-data.ts:1-30`
- Modify: `src/utils/activity-logger.ts:25-45`
- Test: `test/supplier-domain.test.ts`

**Interfaces:**
- Consumes: Nothing
- Produces: `Supplier`, `SupplierWithMetrics`, `SupplierFilterCriteria`, `SEED_SUPPLIERS`, updated `ActivityActionType`.

- [ ] **Step 1: Write failing test for Supplier domain entities and seed data structure**

Create `test/supplier-domain.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SEED_SUPPLIERS } from '../src/persistence/seed-data.ts';
import { formatActivityDescription } from '../src/utils/activity-logger.ts';
import type { Supplier } from '../src/types/index.ts';

test('Supplier SSOT Domain & Seed Invariants Suite', async (t) => {
  await t.test('SEED_SUPPLIERS contains valid active supplier profiles matching receiving records', () => {
    assert.ok(Array.isArray(SEED_SUPPLIERS));
    assert.ok(SEED_SUPPLIERS.length >= 4);

    const names = SEED_SUPPLIERS.map((s) => s.name);
    assert.ok(names.includes('PT Wana Lestari Abadi'));
    assert.ok(names.includes('CV Papua Rimba Sejahtera'));
    assert.ok(names.includes('PT Kayu Makmur Nusantara'));
    assert.ok(names.includes('Koperasi Hutan Lestari'));

    for (const s of SEED_SUPPLIERS) {
      assert.ok(s.id.startsWith('spl-'));
      assert.ok(s.code.startsWith('SPL-'));
      assert.ok(s.name.trim().length > 0);
      assert.equal(s.status, 'ACTIVE');
      assert.ok(s.createdAt);
      assert.ok(s.updatedAt);
    }
  });

  await t.test('formatActivityDescription formats supplier lifecycle actions with bilingual labels', () => {
    const createdMsg = formatActivityDescription('SUPPLIER_CREATED', 'PT Rimba Baru');
    assert.equal(createdMsg, 'Pemasok baru didaftarkan: PT Rimba Baru (新增供应商)');

    const updatedMsg = formatActivityDescription('SUPPLIER_UPDATED', 'PT Rimba Baru');
    assert.equal(updatedMsg, 'Data pemasok diperbarui: PT Rimba Baru (更新供应商)');

    const deletedMsg = formatActivityDescription('SUPPLIER_DELETED', 'PT Rimba Baru');
    assert.equal(deletedMsg, 'Pemasok dihapus: PT Rimba Baru (删除供应商)');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/supplier-domain.test.ts`
Expected: FAIL (`SEED_SUPPLIERS is not defined`).

- [ ] **Step 3: Update `src/types/index.ts`, `src/persistence/seed-data.ts`, and `src/utils/activity-logger.ts`**

In [src/types/index.ts](file:///Users/mac/Web%20Development/wood-inventory-management/src/types/index.ts):
```typescript
/**
 * Global Master Data: Timber Supplier / Vendor Profile
 */
export interface Supplier {
  id: string;
  code: string;               // e.g. "SPL-001"
  name: string;               // PT / CV / Koperasi name
  contactPerson?: string;     // PIC / Perwakilan
  phone?: string;             // WhatsApp / Phone
  address?: string;           // Base of operations / TPK Origin
  taxId?: string;             // NPWP
  notes?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

/**
 * Filter & Search Criteria for Supplier Directory
 */
export interface SupplierFilterCriteria {
  searchQuery?: string;
  status?: 'ALL' | 'ACTIVE' | 'INACTIVE';
}

/**
 * Supplier Profile merged with dynamic receiving ledger scorecard metrics
 */
export interface SupplierWithMetrics extends Supplier {
  totalDeliveries: number;
  totalDeliveredVolumeM3: number;
  totalTallyVolumeM3: number;
  volumeDiscrepancyM3: number;
  discrepancyRatePercent: number;
  totalGrandNetPayable: number;
  primarySpecies: string[];
  lastDeliveryDate: string;
  ratingStatus: 'OPTIMAL' | 'ACCEPTABLE' | 'ATTENTION';
}

export type ActivityActionType =
  | 'RECORD_CREATED'
  | 'RECORD_UPDATED'
  | 'RECORD_DELETED'
  | 'RECORD_RESTORED'
  | 'DEMO_RESET'
  | 'SETTINGS_UPDATED'
  | 'SUPPLIER_CREATED'
  | 'SUPPLIER_UPDATED'
  | 'SUPPLIER_DELETED'
  | 'SUPPLIER_RESTORED';
```

In [src/persistence/seed-data.ts](file:///Users/mac/Web%20Development/wood-inventory-management/src/persistence/seed-data.ts):
```typescript
import type { WoodReceivingRecord, Supplier } from '../types/index.ts';

export const SEED_SUPPLIERS: Supplier[] = [
  {
    id: 'spl-001',
    code: 'SPL-001',
    name: 'PT Wana Lestari Abadi',
    contactPerson: 'Hendra Wijaya',
    phone: '0812-8821-4401',
    address: 'Jl. Trans Nabire Km 18, Nabire, Papua',
    taxId: '01.345.678.9-951.000',
    notes: 'Konsesi HPH resmi Nabire, spesialisasi Merbau dan Meranti Merah.',
    status: 'ACTIVE',
    createdAt: '2026-09-01T08:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z',
  },
  {
    id: 'spl-002',
    code: 'SPL-002',
    name: 'CV Papua Rimba Sejahtera',
    contactPerson: 'Suryanto Tan',
    phone: '0813-9012-3342',
    address: 'Kawasan Industri Arso, Keerom, Jayapura',
    taxId: '02.456.789.1-952.000',
    notes: 'Pemasok kayu log bulat alam, kuota stabil 200m³/bulan.',
    status: 'ACTIVE',
    createdAt: '2026-09-05T09:00:00Z',
    updatedAt: '2026-10-02T09:00:00Z',
  },
  {
    id: 'spl-003',
    code: 'SPL-003',
    name: 'PT Kayu Makmur Nusantara',
    contactPerson: 'Bambang Irawan',
    phone: '0811-2345-6789',
    address: 'Jl. Pelabuhan Jayapura No. 45, Jayapura',
    taxId: '03.567.890.2-953.000',
    notes: 'Rekanan Teak/Jati dan Kamper bersertifikat SVLK.',
    status: 'ACTIVE',
    createdAt: '2026-09-10T10:00:00Z',
    updatedAt: '2026-10-03T10:00:00Z',
  },
  {
    id: 'spl-004',
    code: 'SPL-004',
    name: 'Koperasi Hutan Lestari',
    contactPerson: 'Markus Waromi',
    phone: '0821-4455-6677',
    address: 'Distrik Sentani Timur, Jayapura',
    taxId: '04.678.901.3-954.000',
    notes: 'Koperasi hutan kemasyarakatan lokal, kayu Sengon dan Mahoni.',
    status: 'ACTIVE',
    createdAt: '2026-09-15T11:00:00Z',
    updatedAt: '2026-10-04T11:00:00Z',
  },
];
```

In [src/utils/activity-logger.ts](file:///Users/mac/Web%20Development/wood-inventory-management/src/utils/activity-logger.ts):
Add cases for `'SUPPLIER_CREATED'`, `'SUPPLIER_UPDATED'`, `'SUPPLIER_DELETED'`, `'SUPPLIER_RESTORED'`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/supplier-domain.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts src/persistence/seed-data.ts src/utils/activity-logger.ts test/supplier-domain.test.ts
git commit -m "feat(suppliers): define SSOT supplier domain entities, seed data, and activity actions"
```

---

### Task 2: Implement Resilient `SupplierRepository`

**Files:**
- Create: `src/persistence/supplier-repository.ts`
- Test: `test/supplier-repository.test.ts`

**Interfaces:**
- Consumes: `Supplier`, `SupplierFilterCriteria`, `StorageAdapter`, `SEED_SUPPLIERS`.
- Produces: `SupplierRepository` class.

- [ ] **Step 1: Write failing test for `SupplierRepository`**

Create `test/supplier-repository.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SupplierRepository } from '../src/persistence/supplier-repository.ts';
import { MemoryStorageAdapter } from '../src/persistence/storage.ts';
import { SEED_SUPPLIERS } from '../src/persistence/seed-data.ts';

test('SupplierRepository CRUD & Persistence Suite', async (t) => {
  await t.test('initializes with seed data when storage is empty', () => {
    const storage = new MemoryStorageAdapter();
    const repo = new SupplierRepository(SEED_SUPPLIERS, storage);
    const all = repo.getAll();

    assert.equal(all.length, SEED_SUPPLIERS.length);
    assert.equal(all[0].name, SEED_SUPPLIERS[0].name);
  });

  await t.test('filters suppliers by search query and active status', () => {
    const storage = new MemoryStorageAdapter();
    const repo = new SupplierRepository(SEED_SUPPLIERS, storage);

    const papuaSearch = repo.getAll({ searchQuery: 'papua' });
    assert.equal(papuaSearch.length, 1);
    assert.equal(papuaSearch[0].code, 'SPL-002');

    const activeOnly = repo.getAll({ status: 'ACTIVE' });
    assert.equal(activeOnly.length, 4);
  });

  await t.test('creates new supplier and generates deterministic unique code and id', () => {
    const storage = new MemoryStorageAdapter();
    const repo = new SupplierRepository(SEED_SUPPLIERS, storage);

    const created = repo.save({
      name: 'PT Rimba Nusantara Mandiri',
      contactPerson: 'Agus Salim',
      phone: '0812-9988-7766',
      status: 'ACTIVE',
    });

    assert.ok(created.id.startsWith('spl-'));
    assert.equal(created.code, 'SPL-005');
    assert.equal(created.name, 'PT Rimba Nusantara Mandiri');

    const fetched = repo.getById(created.id);
    assert.equal(fetched?.name, 'PT Rimba Nusantara Mandiri');
    assert.equal(repo.getAll().length, 5);
  });

  await t.test('updates existing supplier attributes while preserving id and timestamps', () => {
    const storage = new MemoryStorageAdapter();
    const repo = new SupplierRepository(SEED_SUPPLIERS, storage);

    const original = repo.getAll()[0];
    const updated = repo.save({
      ...original,
      contactPerson: 'Hendra Wijaya (Updated)',
      phone: '0812-0000-1111',
    });

    assert.equal(updated.id, original.id);
    assert.equal(updated.contactPerson, 'Hendra Wijaya (Updated)');
    assert.equal(updated.phone, '0812-0000-1111');
    assert.notEqual(updated.updatedAt, original.createdAt);
  });

  await t.test('deletes supplier by id successfully', () => {
    const storage = new MemoryStorageAdapter();
    const repo = new SupplierRepository(SEED_SUPPLIERS, storage);

    const targetId = SEED_SUPPLIERS[0].id;
    const deleted = repo.delete(targetId);

    assert.equal(deleted, true);
    assert.equal(repo.getById(targetId), null);
    assert.equal(repo.getAll().length, SEED_SUPPLIERS.length - 1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/supplier-repository.test.ts`
Expected: FAIL (`Cannot find module '../src/persistence/supplier-repository.ts'`).

- [ ] **Step 3: Implement `src/persistence/supplier-repository.ts`**

Create `src/persistence/supplier-repository.ts`:

```typescript
import type { Supplier, SupplierFilterCriteria } from '../types/index.ts';
import { StorageAdapter, LocalStorageAdapter } from './storage.ts';
import { SEED_SUPPLIERS } from './seed-data.ts';

const STORAGE_KEY = 'wood_suppliers_v1';

export class SupplierRepository {
  private memoryCache: Supplier[] = [];
  private storage: StorageAdapter;

  constructor(initialData: Supplier[] = SEED_SUPPLIERS, storage?: StorageAdapter) {
    this.storage = storage || new LocalStorageAdapter();
    this.load(initialData);
  }

  private load(fallbackData: Supplier[]): void {
    const serialized = this.storage.getItem(STORAGE_KEY);
    if (!serialized) {
      this.memoryCache = [...fallbackData];
      this.persist();
      return;
    }

    try {
      const parsed = JSON.parse(serialized);
      if (Array.isArray(parsed) && parsed.length > 0) {
        this.memoryCache = parsed;
      } else {
        this.memoryCache = [...fallbackData];
        this.persist();
      }
    } catch {
      this.memoryCache = [...fallbackData];
      this.persist();
    }
  }

  private persist(): void {
    this.storage.setItem(STORAGE_KEY, JSON.stringify(this.memoryCache));
  }

  public getAll(filter?: SupplierFilterCriteria): Supplier[] {
    let result = [...this.memoryCache];

    if (filter?.status && filter.status !== 'ALL') {
      result = result.filter((s) => s.status === filter.status);
    }

    if (filter?.searchQuery && filter.searchQuery.trim()) {
      const q = filter.searchQuery.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.code.toLowerCase().includes(q) ||
          (s.contactPerson && s.contactPerson.toLowerCase().includes(q)) ||
          (s.address && s.address.toLowerCase().includes(q))
      );
    }

    return result;
  }

  public getById(id: string): Supplier | null {
    return this.memoryCache.find((s) => s.id === id) || null;
  }

  public getByName(name: string): Supplier | null {
    const trimmed = name.trim().toLowerCase();
    return this.memoryCache.find((s) => s.name.trim().toLowerCase() === trimmed) || null;
  }

  public save(data: Partial<Supplier> & { name: string }): Supplier {
    const now = new Date().toISOString();
    const existingIndex = data.id ? this.memoryCache.findIndex((s) => s.id === data.id) : -1;

    if (existingIndex >= 0) {
      const current = this.memoryCache[existingIndex];
      const updated: Supplier = {
        ...current,
        ...data,
        id: current.id,
        code: data.code || current.code,
        updatedAt: now,
      };
      this.memoryCache[existingIndex] = updated;
      this.persist();
      return updated;
    }

    // New Supplier Creation
    const id = data.id || `spl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const nextCodeNumber = this.memoryCache.length + 1;
    const code = data.code || `SPL-${String(nextCodeNumber).padStart(3, '0')}`;

    const newSupplier: Supplier = {
      id,
      code,
      name: data.name.trim(),
      contactPerson: data.contactPerson?.trim() || undefined,
      phone: data.phone?.trim() || undefined,
      address: data.address?.trim() || undefined,
      taxId: data.taxId?.trim() || undefined,
      notes: data.notes?.trim() || undefined,
      status: data.status || 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    };

    this.memoryCache.push(newSupplier);
    this.persist();
    return newSupplier;
  }

  public delete(id: string): boolean {
    const initialLen = this.memoryCache.length;
    this.memoryCache = this.memoryCache.filter((s) => s.id !== id);
    if (this.memoryCache.length !== initialLen) {
      this.persist();
      return true;
    }
    return false;
  }

  public resetToSeed(): void {
    this.memoryCache = [...SEED_SUPPLIERS];
    this.persist();
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/supplier-repository.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/persistence/supplier-repository.ts test/supplier-repository.test.ts
git commit -m "feat(suppliers): implement SupplierRepository with resilient storage adapter"
```

---

### Task 3: Metric Merging Logic & Reactive `useSuppliers` Hook

**Files:**
- Modify: `src/utils/supplier-metrics.ts:1-65`
- Modify: `src/hooks/useSuppliers.ts:1-40`
- Test: `test/use-suppliers-crud.test.ts`

**Interfaces:**
- Consumes: `WoodReceivingRecord[]`, `SupplierRepository`, `SupplierWithMetrics`.
- Produces: `mergeSuppliersWithMetrics()`, updated `useSuppliers(records)` hook exposing CRUD methods.

- [ ] **Step 1: Write failing test for merged suppliers and CRUD hook behavior**

Create `test/use-suppliers-crud.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeSuppliersWithMetrics } from '../src/utils/supplier-metrics.ts';
import { SEED_SUPPLIERS, SEED_WOOD_RECORDS } from '../src/persistence/seed-data.ts';
import type { Supplier } from '../src/types/index.ts';

test('Supplier Merging & Scorecard Association Suite', async (t) => {
  await t.test('merges registered suppliers with receiving records correctly', () => {
    const merged = mergeSuppliersWithMetrics(SEED_SUPPLIERS, SEED_WOOD_RECORDS);

    assert.equal(merged.length, SEED_SUPPLIERS.length);
    const wana = merged.find((s) => s.name === 'PT Wana Lestari Abadi');
    assert.ok(wana);
    assert.equal(wana.code, 'SPL-001');
    assert.ok(wana.totalDeliveries > 0);
    assert.ok(wana.totalTallyVolumeM3 > 0);
    assert.ok(['OPTIMAL', 'ACCEPTABLE', 'ATTENTION'].includes(wana.ratingStatus));
  });

  await t.test('includes newly registered suppliers with 0 deliveries gracefully', () => {
    const newVendor: Supplier = {
      id: 'spl-999',
      code: 'SPL-999',
      name: 'PT Rekanan Baru',
      status: 'ACTIVE',
      createdAt: '2026-10-16T12:00:00Z',
      updatedAt: '2026-10-16T12:00:00Z',
    };

    const merged = mergeSuppliersWithMetrics([...SEED_SUPPLIERS, newVendor], SEED_WOOD_RECORDS);
    const added = merged.find((s) => s.id === 'spl-999');

    assert.ok(added);
    assert.equal(added.totalDeliveries, 0);
    assert.equal(added.totalTallyVolumeM3, 0);
    assert.equal(added.discrepancyRatePercent, 0);
    assert.equal(added.ratingStatus, 'OPTIMAL');
  });

  await t.test('synthesizes unregistered supplier names found in ledger records', () => {
    const adHocRecords = [
      ...SEED_WOOD_RECORDS,
      {
        ...SEED_WOOD_RECORDS[0],
        id: 'rec-adhoc-1',
        supplierName: 'UD Kayu Liar Adhoc',
      },
    ];

    const merged = mergeSuppliersWithMetrics(SEED_SUPPLIERS, adHocRecords);
    const adhoc = merged.find((s) => s.name === 'UD Kayu Liar Adhoc');

    assert.ok(adhoc);
    assert.equal(adhoc.totalDeliveries, 1);
    assert.equal(adhoc.status, 'ACTIVE');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/use-suppliers-crud.test.ts`
Expected: FAIL (`mergeSuppliersWithMetrics is not defined`).

- [ ] **Step 3: Update `src/utils/supplier-metrics.ts` and `src/hooks/useSuppliers.ts`**

In [src/utils/supplier-metrics.ts](file:///Users/mac/Web%20Development/wood-inventory-management/src/utils/supplier-metrics.ts):
Export `mergeSuppliersWithMetrics(suppliers: Supplier[], records: WoodReceivingRecord[]): SupplierWithMetrics[]`:
- Matches by normalized supplier name.
- Fills delivery metrics from receiving records.
- Adds virtual `Supplier` items for any supplier name in `records` not yet in `suppliers`.
- Assigns `ratingStatus` based on discrepancy rate threshold.

In [src/hooks/useSuppliers.ts](file:///Users/mac/Web%20Development/wood-inventory-management/src/hooks/useSuppliers.ts):
```typescript
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { WoodReceivingRecord, Supplier, SupplierWithMetrics } from '../types/index.ts';
import { SupplierRepository } from '../persistence/supplier-repository.ts';
import { mergeSuppliersWithMetrics } from '../utils/supplier-metrics.ts';

const repo = new SupplierRepository();

export function useSuppliers(records: WoodReceivingRecord[] = []) {
  const [rawSuppliers, setRawSuppliers] = useState<Supplier[]>([]);

  const reload = useCallback(() => {
    setRawSuppliers(repo.getAll());
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const suppliers: SupplierWithMetrics[] = useMemo(() => {
    return mergeSuppliersWithMetrics(rawSuppliers, records);
  }, [rawSuppliers, records]);

  const topSuppliers = useMemo(() => {
    return [...suppliers]
      .sort((a, b) => b.totalTallyVolumeM3 - a.totalTallyVolumeM3)
      .slice(0, 5);
  }, [suppliers]);

  const stats = useMemo(() => {
    const totalVendors = suppliers.length;
    const optimalCount = suppliers.filter((s) => s.ratingStatus === 'OPTIMAL').length;
    const attentionCount = suppliers.filter((s) => s.ratingStatus === 'ATTENTION').length;
    const totalVolumeM3 = suppliers.reduce((acc, s) => acc + s.totalTallyVolumeM3, 0);
    const avgDiscrepancyPct =
      totalVendors > 0
        ? Number((suppliers.reduce((acc, s) => acc + s.discrepancyRatePercent, 0) / totalVendors).toFixed(2))
        : 0;

    return {
      totalVendors,
      optimalCount,
      attentionCount,
      totalVolumeM3,
      avgDiscrepancyPct,
    };
  }, [suppliers]);

  const addSupplier = useCallback((data: Partial<Supplier> & { name: string }) => {
    const saved = repo.save(data);
    reload();
    return saved;
  }, [reload]);

  const updateSupplier = useCallback((id: string, data: Partial<Supplier>) => {
    const saved = repo.save({ ...data, id, name: data.name || '' });
    reload();
    return saved;
  }, [reload]);

  const deleteSupplier = useCallback((id: string) => {
    const success = repo.delete(id);
    if (success) reload();
    return success;
  }, [reload]);

  return {
    suppliers,
    rawSuppliers,
    topSuppliers,
    stats,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    refreshSuppliers: reload,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/use-suppliers-crud.test.ts test/supplier-metrics.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/supplier-metrics.ts src/hooks/useSuppliers.ts test/use-suppliers-crud.test.ts
git commit -m "feat(suppliers): implement supplier-metric merging and reactive CRUD hook methods"
```

---

### Task 4: Interactive Supplier Form Modal (`SupplierModal.tsx`)

**Files:**
- Create: `src/components/suppliers/SupplierModal.tsx`
- Test: `test/supplier-modal.test.ts`

**Interfaces:**
- Consumes: `Supplier` or `Partial<Supplier>`, `isOpen: boolean`, `onClose()`, `onSave(data)`.
- Produces: `SupplierModal` component.

- [ ] **Step 1: Write test verifying modal form validation & payload generation**

Create `test/supplier-modal.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('SupplierModal Validation Invariants Suite', async (t) => {
  await t.test('rejects empty or whitespace supplier names', () => {
    const validate = (name: string) => name.trim().length >= 3;
    assert.equal(validate(''), false);
    assert.equal(validate('   '), false);
    assert.equal(validate('PT'), false);
    assert.equal(validate('PT Rimba'), true);
  });

  await t.test('formats default code when empty', () => {
    const getCode = (code?: string, nextIndex = 5) => {
      if (code && code.trim()) return code.trim();
      return `SPL-${String(nextIndex).padStart(3, '0')}`;
    };
    assert.equal(getCode(undefined, 5), 'SPL-005');
    assert.equal(getCode('CUSTOM-01', 5), 'CUSTOM-01');
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `node --test test/supplier-modal.test.ts`
Expected: PASS.

- [ ] **Step 3: Implement `src/components/suppliers/SupplierModal.tsx`**

Create `src/components/suppliers/SupplierModal.tsx`:
- Render fixed modal overlay (`z-50 backdrop-blur-xs bg-black/40 flex items-center justify-center p-4`).
- Support Add mode (`initialSupplier == null`) vs Edit mode (`initialSupplier != null`).
- Fields:
  - `name`: Nama Pemasok / Rekanan (Required, text input).
  - `code`: Kode Rekanan (e.g. `SPL-005`).
  - `contactPerson`: Penanggung Jawab / PIC (e.g. `Hendra Wijaya`).
  - `phone`: Nomor Telepon / WA (e.g. `0812-xxxx-xxxx`).
  - `address`: Alamat / Lokasi Operasional TPK.
  - `taxId`: NPWP / Nomor Pokok Wajib Pajak.
  - `notes`: Catatan / Legalitas SVLK / Izin HPH.
  - `status`: Radio or select (`ACTIVE` / `INACTIVE`).
- Prevent empty submit; trigger `onSave` and `onClose`.
- Close on `Escape` key or backdrop click.

- [ ] **Step 4: Commit**

```bash
git add src/components/suppliers/SupplierModal.tsx test/supplier-modal.test.ts
git commit -m "feat(suppliers): create responsive SupplierModal with bilingual field validation"
```

---

### Task 5: Upgrade `SupplierCard` & `SupplierTable` with Actions

**Files:**
- Modify: `src/components/suppliers/SupplierCard.tsx`
- Modify: `src/components/suppliers/SupplierTable.tsx`
- Test: `test/supplier-components-action.test.ts`

**Interfaces:**
- Consumes: `SupplierWithMetrics`, `onEdit(supplier)`, `onDelete(id, name)`.
- Produces: Updated card and table views displaying supplier contact details and action buttons.

- [ ] **Step 1: Write test verifying props and action handler contracts**

Create `test/supplier-components-action.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SupplierCard } from '../src/components/suppliers/SupplierCard.tsx';
import { SupplierTable } from '../src/components/suppliers/SupplierTable.tsx';

test('Supplier View Components Action Contracts Suite', async (t) => {
  await t.test('SupplierCard and SupplierTable export valid React components', () => {
    assert.equal(typeof SupplierCard, 'function');
    assert.equal(typeof SupplierTable, 'function');
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `node --test test/supplier-components-action.test.ts`
Expected: PASS.

- [ ] **Step 3: Update `SupplierCard.tsx` and `SupplierTable.tsx`**

In [src/components/suppliers/SupplierCard.tsx](file:///Users/mac/Web%20Development/wood-inventory-management/src/components/suppliers/SupplierCard.tsx):
- Accept optional `onEdit?: (supplier: SupplierWithMetrics) => void` and `onDelete?: (id: string, name: string) => void`.
- Display `supplier.code` badge next to the title.
- If `supplier.contactPerson` or `supplier.phone` is present, display a contact info row (`User`, `Phone` icons).
- Add an action row with `Edit` (Pencil icon) and `Delete` (Trash icon) buttons.

In [src/components/suppliers/SupplierTable.tsx](file:///Users/mac/Web%20Development/wood-inventory-management/src/components/suppliers/SupplierTable.tsx):
- Accept optional `onEdit` and `onDelete` handlers.
- Add `Kode & Kontak` to the primary supplier column.
- Add a sticky right `Aksi (操作)` column with Edit and Delete icon buttons.

- [ ] **Step 4: Run tests to verify no regressions**

Run: `node --test test/supplier-components-action.test.ts test/supplier-page.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/suppliers/SupplierCard.tsx src/components/suppliers/SupplierTable.tsx test/supplier-components-action.test.ts
git commit -m "feat(suppliers): add contact metadata and edit/delete actions to SupplierCard and SupplierTable"
```

---

### Task 6: Wire Full CRUD Workflows in `app/suppliers/page.tsx`

**Files:**
- Modify: `app/suppliers/page.tsx`
- Test: `test/supplier-page-crud.test.ts`

**Interfaces:**
- Consumes: `useWoodRecords()`, `useSuppliers()`, `useAuth()`, `useActivityLog()`, `SupplierModal`.
- Produces: Complete CRUD supplier management dashboard route.

- [ ] **Step 1: Write test for suppliers page CRUD interactions**

Create `test/supplier-page-crud.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateSupplierSummaries } from '../src/utils/supplier-metrics.ts';
import { SEED_WOOD_RECORDS } from '../src/persistence/seed-data.ts';

test('Suppliers Page Integration Invariants Suite', async (t) => {
  await t.test('calculates correct metrics with 0-delivery suppliers included', () => {
    const suppliers = calculateSupplierSummaries(SEED_WOOD_RECORDS);
    assert.ok(suppliers.length >= 4);
    assert.ok(suppliers.every((s) => s.supplierName.length > 0));
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `node --test test/supplier-page-crud.test.ts`
Expected: PASS.

- [ ] **Step 3: Update `app/suppliers/page.tsx`**

In [app/suppliers/page.tsx](file:///Users/mac/Web%20Development/wood-inventory-management/app/suppliers/page.tsx):
- Mount `SupplierModal` controlled by `modalState: { isOpen: boolean; supplier: SupplierWithMetrics | null }`.
- Add **"Tambah Pemasok (新增供应商)"** CTA button in the header (gated by `canWrite` from `useAuth()`).
- Add status filter toggle (Semua / Aktif / Non-Aktif).
- Implement `handleSaveSupplier(data)`:
  - Calls `addSupplier` or `updateSupplier`.
  - Dispatches `toast.success` with supplier name and code.
  - Logs `SUPPLIER_CREATED` or `SUPPLIER_UPDATED` in `useActivityLog()`.
- Implement `handleDeleteSupplier(id, name)`:
  - Uses non-blocking 5-second undo toast (`toast.warning(..., { action: { label: 'Urungkan', onClick } })`) or confirmation dialog.
  - Calls `deleteSupplier(id)`.
  - Logs `SUPPLIER_DELETED` in `useActivityLog()`.

- [ ] **Step 4: Run full test suite to verify everything passes**

Run: `npm test`
Expected: PASS (all 154+ tests pass).

- [ ] **Step 5: Commit**

```bash
git add app/suppliers/page.tsx test/supplier-page-crud.test.ts
git commit -m "feat(suppliers): wire full CRUD modal triggers, activity logging, and toast feedback in suppliers route"
```

---

### Task 7: Ledger Autocomplete Integration (`SupplierCombobox.tsx`)

**Files:**
- Create: `src/components/ledger/SupplierCombobox.tsx`
- Modify: `src/components/ledger/RecordModal.tsx:220-230`
- Test: `test/supplier-combobox.test.ts`

**Interfaces:**
- Consumes: `useSuppliers()`, `value: string`, `onChange(name: string)`.
- Produces: `SupplierCombobox` component with fuzzy filtering and custom vendor entry fallback.

- [ ] **Step 1: Write test for SupplierCombobox filtering logic**

Create `test/supplier-combobox.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('SupplierCombobox Fuzzy Match Suite', async (t) => {
  const options = ['PT Wana Lestari Abadi', 'CV Papua Rimba Sejahtera', 'PT Kayu Makmur Nusantara'];

  const filter = (query: string) => {
    if (!query.trim()) return options;
    const q = query.toLowerCase().trim();
    return options.filter((o) => o.toLowerCase().includes(q));
  };

  assert.equal(filter('wana').length, 1);
  assert.equal(filter('wana')[0], 'PT Wana Lestari Abadi');
  assert.equal(filter('xyz').length, 0);
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `node --test test/supplier-combobox.test.ts`
Expected: PASS.

- [ ] **Step 3: Implement `src/components/ledger/SupplierCombobox.tsx` and wire into `RecordModal.tsx`**

Create `src/components/ledger/SupplierCombobox.tsx`:
- Render searchable input matching `SpeciesCombobox` styling.
- Suggest registered suppliers with code badges (`SPL-001`, etc.).
- Allow free-text custom entry when entering a supplier not yet in master directory.

In [src/components/ledger/RecordModal.tsx](file:///Users/mac/Web%20Development/wood-inventory-management/src/components/ledger/RecordModal.tsx#L221-L228):
Replace the raw `<input placeholder="PT Sumber Kayu Indah" ... />` with `<SupplierCombobox value={form.supplierName} onChange={(val) => setForm({ ...form, supplierName: val })} />`.

- [ ] **Step 4: Run tests to verify no regressions**

Run: `node --test test/record-modal.test.ts test/supplier-combobox.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ledger/SupplierCombobox.tsx src/components/ledger/RecordModal.tsx test/supplier-combobox.test.ts
git commit -m "feat(ledger): integrate SupplierCombobox with autocomplete and master data lookup"
```

---

### Task 8: End-to-End Verification & Build Validation

**Files:**
- Test: All test suites (`test/*.test.ts`)

- [ ] **Step 1: Run complete test suite**

Run:
```bash
npm test
```
Expected: PASS with 0 failures across all unit and integration suites.

- [ ] **Step 2: Run Next.js production build check**

Run:
```bash
npm run build
```
Expected: PASS with zero TypeScript or compilation errors.

- [ ] **Step 3: Commit final plan verification checkpoint**

```bash
git commit --allow-empty -m "chore(suppliers): verify all supplier CRUD unit tests and production build"
```
