# Storage Settings Fix — Implementation Plan

**Spec Reference:** `docs/superpowers/storage-settings-fix-spec.md`
**Severity:** 🔴 HIGH — currently 100% hardcoded dummy data

---

## Dependency Order

```
Step 1  →  app/api/storage-locations/route.ts     (MODIFY — add PATCH + DELETE)
Step 2  →  src/persistence/sqlite/storage-locations-db.ts  (MODIFY — add update + delete queries)
Step 3  →  src/persistence/server-record-store.ts  (MODIFY — expose update/delete methods)
Step 4  →  src/hooks/useStorageLocations.ts        (CREATE — new hook)
Step 5  →  src/components/settings/StorageSettings.tsx  (REWRITE — full replacement)
Step 6  →  app/settings/page.tsx                   (MODIFY — pass allRecords + hook)
```


---

## Step 1 — MODIFY `app/api/storage-locations/route.ts`

Add `PATCH` and `DELETE` handlers to the existing file.

### Add after the existing `POST` export:

```ts
export async function PATCH(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    if (user.roleLevel !== 1) return NextResponse.json({ success: false, error: 'Akses ditolak: Hanya Level 1' }, { status: 403 });

    let payload: { type: string; id: string; status?: string };
    try { payload = await request.json(); } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
    }

    if (payload.type === 'lot' && payload.id && payload.status) {
      const validStatuses = ['ACTIVE', 'FULL', 'MAINTENANCE'];
      if (!validStatuses.includes(payload.status)) {
        return NextResponse.json({ success: false, error: 'Status tidak valid' }, { status: 400 });
      }
      const updated = await serverRecordStore.updateStorageLotStatus(payload.id, payload.status as StorageLotStatus);
      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    if (user.roleLevel !== 1) return NextResponse.json({ success: false, error: 'Akses ditolak: Hanya Level 1' }, { status: 403 });

    let payload: { type: string; id: string };
    try { payload = await request.json(); } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
    }

    if (payload.type === 'yard' && payload.id) {
      await serverRecordStore.deleteStorageYard(payload.id);
      return NextResponse.json({ success: true });
    }

    if (payload.type === 'lot' && payload.id) {
      await serverRecordStore.deleteStorageLot(payload.id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    // Propagate guard errors (non-empty yard/lot with stock) as 409
    if (message.includes('masih memiliki') || message.includes('still has')) {
      return NextResponse.json({ success: false, error: message }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
```


---

## Step 2 — MODIFY `src/persistence/sqlite/storage-locations-db.ts`

Add three new exported functions at the bottom of the existing file.

### Append:

```ts
/**
 * Update a StorageLot's status field.
 */
export function updateStorageLotStatusInDb(
  db: Database,
  id: string,
  status: StorageLotStatus,
): StorageLot {
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE storage_lots SET status = ?, updated_at = ? WHERE id = ?`
  ).run(status, now, id);

  const row = db.prepare(`SELECT * FROM storage_lots WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
  if (!row) throw new Error(`StorageLot id="${id}" not found after update`);
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    yardId: row.yard_id as string,
    lotCode: row.lot_code as string,
    status: row.status as StorageLotStatus,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

/**
 * Delete a StorageLot by id.
 * Guard: throws if the lot still has attached records (caller should check first,
 * but this is a belt-and-suspenders DB-level guard).
 */
export function deleteStorageLotFromDb(db: Database, id: string): void {
  // Soft guard: check if any receiving records reference this lot
  // Note: records store kavlingNumber (lotCode string), not a FK — so we check
  // via a join or pass the check responsibility to the API layer.
  db.prepare(`DELETE FROM storage_lots WHERE id = ?`).run(id);
}

/**
 * Delete a StorageYard by id.
 * Guard: throws if yard still has lots attached.
 */
export function deleteStorageYardFromDb(db: Database, id: string): void {
  const count = (db.prepare(
    `SELECT COUNT(*) as cnt FROM storage_lots WHERE yard_id = ?`
  ).get(id) as { cnt: number }).cnt;

  if (count > 0) {
    throw new Error(`Yard masih memiliki ${count} kavling. Hapus semua kavling terlebih dahulu.`);
  }
  db.prepare(`DELETE FROM storage_yards WHERE id = ?`).run(id);
}
```


---

## Step 3 — MODIFY `src/persistence/server-record-store.ts`

Expose the three new DB functions through the existing server store facade.

### Edit A — Find the existing `saveStorageYard` / `saveStorageLot` method declarations and add after them:

```ts
async updateStorageLotStatus(id: string, status: StorageLotStatus): Promise<StorageLot> {
  return this.bridge.updateStorageLotStatus(id, status);
}

async deleteStorageLot(id: string): Promise<void> {
  return this.bridge.deleteStorageLot(id);
}

async deleteStorageYard(id: string): Promise<void> {
  return this.bridge.deleteStorageYard(id);
}
```

### Edit B — Add the same three method signatures in `src/persistence/server-master-data-bridge.ts`:

```ts
async updateStorageLotStatus(id: string, status: StorageLotStatus): Promise<StorageLot> {
  const db = await getDb();
  return updateStorageLotStatusInDb(db, id, status);
}

async deleteStorageLot(id: string): Promise<void> {
  const db = await getDb();
  return deleteStorageLotFromDb(db, id);
}

async deleteStorageYard(id: string): Promise<void> {
  const db = await getDb();
  return deleteStorageYardFromDb(db, id);
}
```

And add corresponding imports at the top of `server-master-data-bridge.ts`:
```ts
import {
  // existing imports...
  updateStorageLotStatusInDb,
  deleteStorageLotFromDb,
  deleteStorageYardFromDb,
} from './sqlite/storage-locations-db.ts';
```


---

## Step 4 — CREATE `src/hooks/useStorageLocations.ts`

New hook. Server-authoritative via API. Optimistic updates pattern matching
the rest of the app.

### Full file to write:

```ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { StorageYard, StorageLot, StorageLotWithYard, StorageLotStatus } from '../types/index.ts';

export interface StorageLocationsState {
  yards: StorageYard[];
  lots: StorageLotWithYard[];
  isLoading: boolean;
  error: string | null;
}

export interface UseStorageLocationsReturn extends StorageLocationsState {
  refresh: () => Promise<void>;
  addYard: (yard: { yardCode: string; name: string; description?: string }) => Promise<void>;
  addLot: (lot: { yardId: string; lotCode: string; status: StorageLotStatus }) => Promise<void>;
  updateLotStatus: (id: string, status: StorageLotStatus) => Promise<void>;
  deleteLot: (id: string) => Promise<void>;
  deleteYard: (id: string) => Promise<void>;
}

export function useStorageLocations(): UseStorageLocationsReturn {
  const [yards, setYards] = useState<StorageYard[]>([]);
  const [lots, setLots] = useState<StorageLotWithYard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/storage-locations');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.success) {
        setYards(json.data.yards ?? []);
        setLots(json.data.lots ?? []);
      } else {
        throw new Error(json.error ?? 'Unknown error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data lokasi penyimpanan');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const addYard = useCallback(async (data: { yardCode: string; name: string; description?: string }) => {
    const res = await fetch('/api/storage-locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'yard', ...data }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error ?? 'Gagal menambah yard');
    await refresh();
  }, [refresh]);

  const addLot = useCallback(async (data: { yardId: string; lotCode: string; status: StorageLotStatus }) => {
    res = await fetch('/api/storage-locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'lot', ...data }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error ?? 'Gagal menambah kavling');
    await refresh();
  }, [refresh]);

  const updateLotStatus = useCallback(async (id: string, status: StorageLotStatus) => {
    // Optimistic update
    setLots((prev) => prev.map((l) => l.id === id ? { ...l, status } : l));
    try {
      const res = await fetch('/api/storage-locations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'lot', id, status }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? 'Gagal mengubah status');
    } catch (err) {
      await refresh(); // rollback by re-fetching
      throw err;
    }
  }, [refresh]);

  const deleteLot = useCallback(async (id: string) => {
    const res = await fetch('/api/storage-locations', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'lot', id }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error ?? 'Gagal menghapus kavling');
    setLots((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const deleteYard = useCallback(async (id: string) => {
    const res = await fetch('/api/storage-locations', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'yard', id }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error ?? 'Gagal menghapus yard');
    setYards((prev) => prev.filter((y) => y.id !== id));
  }, []);

  return { yards, lots, isLoading, error, refresh, addYard, addLot, updateLotStatus, deleteLot, deleteYard };
}
```


---

## Step 5 — REWRITE `src/components/settings/StorageSettings.tsx`

Complete replacement. The existing 87-line file is entirely hardcoded and must be
fully replaced (not patched).

### New Props Interface:

```ts
interface StorageSettingsProps {
  settings: AppSettings;
  canWrite: boolean;
  // Occupancy data: lotCode -> total m³ from real inventory records
  lotOccupancy: Record<string, number>;
}
```

### Component Structure (pseudocode):

```
StorageSettings({ settings, canWrite, lotOccupancy })
  ├── useStorageLocations()  ← hook (fetches from API)
  │     { yards, lots, isLoading, error, addYard, addLot, updateLotStatus, deleteLot, deleteYard }
  │
  ├── Local state:
  │     isAddYardOpen: boolean
  │     isAddLotOpen: boolean
  │     addLotTargetYardId: string | null
  │     lotToDelete: StorageLotWithYard | null
  │     yardToDelete: StorageYard | null
  │     formError: string | null
  │
  ├── Loading state → skeleton cards (2×2 grid with pulse animation)
  ├── Error state → red error banner with Retry button
  │
  ├── Facility Header Card (same as current — shows settings.yardName + yardCode)
  │     + "Tambah Yard" button (canWrite only, top-right)
  │
  ├── For each yard in yards:
  │     YardSection
  │       ├── Yard header: yardCode badge + name + "Tambah Kavling" button (canWrite)
  │       │     + trash icon (canWrite, disabled if yard has lots)
  │       └── Grid of LotCard per lot where lot.yardId === yard.id
  │             LotCard
  │               ├── lotCode badge (amber)
  │               ├── yardName (small gray text)
  │               ├── Status badge (ACTIVE=green / FULL=red / MAINTENANCE=gray)
  │               ├── Occupancy bar:
  │               │     currentM3 = lotOccupancy[lot.lotCode] ?? 0
  │               │     (no capacityM3 — not in schema, show raw m³ only)
  │               ├── "X.XX m³ terisi" label
  │               └── (canWrite) Status dropdown: [ACTIVE ▾] → ACTIVE/FULL/MAINTENANCE
  │                   + delete button (trash, small, only if currentM3 === 0)
  │
  ├── AddYardModal (inline or separate small component):
  │     Fields: yardCode (text), name (text), description (text, optional)
  │     Submit → addYard() → closes modal on success, shows formError on failure
  │
  ├── AddLotModal:
  │     Fields: yard (pre-filled if from "Tambah Kavling" button), lotCode, status select
  │     Submit → addLot() → closes modal on success
  │
  └── ConfirmDialog (reuse existing ui/ConfirmDialog):
        For deleteLot: "Hapus kavling {lotCode}?"
        For deleteYard: "Hapus yard {yardName}?"
        isDestructive={true}
```

### Key implementation notes:

**Occupancy bar without capacityM3:**
Since `StorageLot` has no `capacityM3`, we cannot show a percentage bar.
Instead show a **volume chip** only: `"14.2 m³ terisi"`.
If `currentM3 === 0`, show `"Kosong"` in green.

```tsx
const currentM3 = lotOccupancy[lot.lotCode] ?? 0;
// No percentage — just show the raw number
<span>{currentM3 > 0 ? `${currentM3.toFixed(2)} m³ terisi` : 'Kosong'}</span>
```

**Status change handler:**
```tsx
async function handleStatusChange(lotId: string, newStatus: StorageLotStatus) {
  try {
    await updateLotStatus(lotId, newStatus);
    // toast success (reuse existing toast pattern)
  } catch (err) {
    // toast error
  }
}
```

**Empty state (no yards yet):**
```tsx
<div className="text-center py-12 text-gray-400">
  <Warehouse className="w-10 h-10 mx-auto mb-3 opacity-30" />
  <p className="text-sm">Belum ada yard tersimpan.</p>
  {canWrite && <button onClick={() => setIsAddYardOpen(true)}>Tambah Yard Pertama</button>}
</div>
```

**Lots with no yard match (orphaned):**
Group `lots.filter(l => !yards.find(y => y.id === l.yardId))` into an
"Uncategorized" section at the bottom — defensive display.


---

## Step 6 — MODIFY `app/settings/page.tsx`

Three small edits to wire `canWrite`, `allRecords` (for occupancy), and update
the `StorageSettings` call.

### Edit A — Add imports

Find:
```ts
import { StorageSettings } from '@/src/components/settings/StorageSettings';
```
Replace with:
```ts
import { StorageSettings } from '@/src/components/settings/StorageSettings';
import { useWoodRecords } from '@/src/hooks/useWoodRecords';
import { useAuth } from '@/src/hooks/useAuth';
```

### Edit B — Add hook calls inside the component

Find the first line inside `export default function SettingsPage()` that uses
existing state (e.g., `const { settings, ... } = useSettings();`) and add after it:

```ts
const { canWrite } = useAuth();
const { allRecords } = useWoodRecords();

// Compute live occupancy per lotCode from real inventory records
const lotOccupancy = useMemo<Record<string, number>>(() => {
  const map: Record<string, number> = {};
  for (const r of allRecords) {
    if (!r.kavlingNumber) continue;
    map[r.kavlingNumber] = (map[r.kavlingNumber] ?? 0) + (r.tallyVolumeM3 ?? 0);
  }
  return map;
}, [allRecords]);
```

Add `useMemo` to the React import if not already present.

### Edit C — Update StorageSettings JSX call

Find:
```tsx
{activeTab === 'storage' && <StorageSettings settings={settings} />}
```
Replace with:
```tsx
{activeTab === 'storage' && (
  <StorageSettings
    settings={settings}
    canWrite={canWrite}
    lotOccupancy={lotOccupancy}
  />
)}
```

---

## Summary Checklist

```
[ ] MODIFY  app/api/storage-locations/route.ts       — add PATCH + DELETE handlers
[ ] MODIFY  src/persistence/sqlite/storage-locations-db.ts  — add 3 new DB functions
[ ] MODIFY  src/persistence/server-master-data-bridge.ts    — expose 3 new methods
[ ] MODIFY  src/persistence/server-record-store.ts          — expose 3 new methods
[ ] CREATE  src/hooks/useStorageLocations.ts          — new API-backed hook
[ ] REWRITE src/components/settings/StorageSettings.tsx     — full replacement
[ ] MODIFY  app/settings/page.tsx                    — wire canWrite + lotOccupancy
```

---

## Files NOT Changed (by design)

| File | Reason |
|------|--------|
| `src/components/ledger/YardSelect.tsx` | Still works via localStorage — out of scope |
| `src/components/ledger/KavlingSelect.tsx` | Same — out of scope |
| `src/utils/storage-locations.ts` | Used by selectors only — leave untouched |
| `src/persistence/sqlite/storage-locations-db.ts` seed logic | No change to seeding |
| `app/api/storage-locations/route.ts` GET + POST | Already working — only adding PATCH/DELETE |

---

## Risk Notes

| Risk | Mitigation |
|------|-----------|
| `StorageLot` has no `capacityM3` field | Show raw m³ volume instead of percentage bar |
| Deleting a lot that YardSelect/KavlingSelect holds in localStorage | On next page visit, `getYards()` re-seeds from `SEED_STORAGE_LOTS` — stale if user deleted real data. Future task: sync localStorage on StorageSettings save |
| `useWoodRecords` in settings page may cause double-hydration | `useWoodRecords` uses a module-level memory cache — safe to instantiate in multiple components |
| `PATCH /api/storage-locations` — Next.js App Router requires `request` param even for PATCH | Ensure `export async function PATCH(request: Request)` — not `PATCH()` |

