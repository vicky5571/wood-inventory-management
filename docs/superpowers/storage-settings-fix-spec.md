# Storage Settings Fix — Feature Specification

**Feature:** Repair `/settings` → Tab "Penyimpanan" (Storage)
**Severity:** 🔴 HIGH — currently shows 100% hardcoded dummy data
**Page:** `/settings` (`app/settings/page.tsx`)
**Component:** `src/components/settings/StorageSettings.tsx`

---

## 1. Root Cause

`StorageSettings.tsx` has a hardcoded local constant:

```ts
const KAVLINGS = [
  { code: 'KAV-01', location: 'TPK-Timur', capacityM3: 50, currentM3: 14.65 },
  ...
];
```

It has **no state, no useEffect, no fetch** — completely disconnected from the real
data layer. Additionally:

- The fields `capacityM3` and `currentM3` **do not exist** on `StorageLot` in the
  type system — so the data shape is fabricated
- The API `GET /api/storage-locations` returns the real data but is never called
- The API `POST /api/storage-locations` allows adding yards/lots but no UI calls it
- No `useStorageLocations` hook exists
- `YardSelect` and `KavlingSelect` use `localStorage` via `src/utils/storage-locations.ts`,
  bypassing the API entirely — so they work but are also not server-authoritative

---

## 2. What Real Data Looks Like

`GET /api/storage-locations` returns:

```json
{
  "success": true,
  "data": {
    "yards": [
      {
        "id": "YARD-TMR",
        "tenantId": "default-tenant",
        "yardCode": "TPK-TMR",
        "name": "TPK Timur",
        "description": "Eastern timber stacking yard",
        "createdAt": "...",
        "updatedAt": "..."
      }
    ],
    "lots": [
      {
        "id": "LOT-TMR-01",
        "tenantId": "default-tenant",
        "yardId": "YARD-TMR",
        "lotCode": "KAV-01",
        "status": "ACTIVE",
        "yardCode": "TPK-TMR",
        "yardName": "TPK Timur",
        "createdAt": "...",
        "updatedAt": "..."
      }
    ]
  }
}
```

`StorageLot` does NOT have `capacityM3` or `currentM3` — these fields don't exist
in the schema. Real occupancy must be **computed** from inventory records.

---

## 3. Approach — Our Recommendation

### Option A: Simple Fix (connect to API, remove hardcoded data) — FAST
Just replace the hardcoded array with a real API fetch. Display yards + lots with
their real `status` field. Remove fake `capacityM3`/`currentM3`. Read-only display
plus a "Tambah" button for Level 1 users.

### Option B: Full Admin Panel (add/edit/delete + live occupancy) — THOROUGH
Full CRUD UI for yards and lots. Compute live occupancy from inventory records
(sum of `tallyVolumeM3` for active records per kavling). Inline status toggle.

### ✅ Recommendation: Option B

Rationale:
- The Settings page is where admins manage master data — a read-only display
  without CRUD is only half-useful
- The `POST /api/storage-locations` endpoint is already fully implemented — we
  just need to connect the UI
- Live occupancy is valuable operational info (which kavlings are filling up)
- The occupancy bar UI already exists in the current component — we just need
  to feed it real numbers
- Total extra complexity is contained to one component + one new hook

---

## 4. User Stories

| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| US-1 | Level 1 admin | see all real yards and lots from the database | I know the actual storage layout |
| US-2 | Level 1 admin | see live occupancy per kavling (from real inventory records) | I can plan incoming shipments |
| US-3 | Level 1 admin | add a new storage yard | I can expand capacity when the facility grows |
| US-4 | Level 1 admin | add a new kavling lot to a yard | I can sub-divide yard space |
| US-5 | Level 1 admin | change a lot's status (ACTIVE / FULL / MAINTENANCE) | I can block tally operators from selecting unusable lots |
| US-6 | Level 1 admin | delete an empty lot or yard | I can clean up decommissioned locations |
| US-7 | Level 2/3 user | see storage layout in read-only mode | I can understand the facility structure |

---

## 5. UI Design

### 5.1 Overall Layout

```
┌─────────────────────────────────────────────────────────┐
│  🏭 TPK-01 Utama (Central Yard)   [Zona Industri...]    │
│  ──────────────────────────── [+ Tambah Yard] (L1 only) │
│                                                         │
│  YARD: TPK Timur (TPK-TMR)          [+ Tambah Lot]     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐               │
│  │ KAV-01   │ │ KAV-02   │ │ KAV-05   │               │
│  │ ACTIVE   │ │ FULL     │ │ MAINT.   │               │
│  │ 14.2 m³  │ │ (penuh)  │ │ (off)    │  [edit status]│
│  │ ▓▓▓▓░░   │ │ ▓▓▓▓▓▓   │ │ ▒▒▒▒▒▒   │               │
│  └──────────┘ └──────────┘ └──────────┘               │
│                                                         │
│  YARD: TPK Utara (TPK-UTR)          [+ Tambah Lot]     │
│  ┌──────────┐ ┌──────────┐                             │
│  │ KAV-03   │ │ KAV-04   │                             │
│  │ ACTIVE   │ │ ACTIVE   │                             │
│  │  8.6 m³  │ │  5.1 m³  │                             │
│  └──────────┘ └──────────┘                             │
└─────────────────────────────────────────────────────────┘
```

### 5.2 Lot Card States

| Status | Color | Occupancy bar color |
|--------|-------|-------------------|
| ACTIVE | Green badge | Amber `#FFC908` |
| FULL | Red badge | Red `#ef4444` (full bar) |
| MAINTENANCE | Gray badge | Gray (striped) |

### 5.3 Occupancy Calculation

Real occupancy per lot = sum of `tallyVolumeM3` of all `WoodReceivingRecord`
where `kavlingNumber === lot.lotCode` AND `paymentStatus !== 'VOID'`.

This is passed down from the settings page via the existing `allRecords` from
`useWoodRecords`, or fetched independently in `useStorageLocations`.

### 5.4 Add Yard Modal

```
┌─────────────────────────────┐
│  Tambah Yard Baru      [×]  │
│                             │
│  Kode Yard   [TPK-    ]     │
│  Nama Yard   [          ]   │
│  Deskripsi   [          ]   │
│                             │
│  [Batal]  [Simpan Yard]     │
└─────────────────────────────┘
```

### 5.5 Add Lot Modal

```
┌─────────────────────────────┐
│  Tambah Kavling Baru   [×]  │
│                             │
│  Yard       [TPK Timur ▾]   │
│  Kode Lot   [KAV-      ]    │
│  Status     [ACTIVE    ▾]   │
│                             │
│  [Batal]  [Simpan Kavling]  │
└─────────────────────────────┘
```

### 5.6 Inline Status Toggle (per Lot Card)

Each card (Level 1 only) shows a small dropdown or three-state button:
`[ACTIVE ▾]` → choose ACTIVE / FULL / MAINTENANCE

---

## 6. Data Flow

```
GET /api/storage-locations
        ↓
useStorageLocations hook
  - state: yards[], lots[], isLoading, error
  - actions: addYard(), addLot(), updateLotStatus(), deleteLot(), deleteYard()
        ↓
StorageSettings component
  - receives: { yards, lots, lotOccupancy, isLoading, canWrite, actions }
  - renders: YardSection per yard → LotCard per lot
```

### Occupancy source:
`lotOccupancy: Record<lotCode, number>` — computed from `allRecords` passed
from the settings page (already available via `useWoodRecords`).

---

## 7. API — Existing vs Needed

| Method | Endpoint | Status | Notes |
|--------|----------|--------|-------|
| GET | `/api/storage-locations` | ✅ EXISTS | Returns `{ yards[], lots[] }` |
| POST | `/api/storage-locations` | ✅ EXISTS | Accepts `{ type: 'yard', ... }` or `{ type: 'lot', ... }` |
| PATCH | `/api/storage-locations` | ❌ MISSING | Need to add — for status update |
| DELETE | `/api/storage-locations` | ❌ MISSING | Need to add — for deleting a yard or lot |

### PATCH payload (add to route):
```json
{ "type": "lot", "id": "LOT-TMR-01", "status": "MAINTENANCE" }
```

### DELETE payload (add to route):
```json
{ "type": "lot", "id": "LOT-TMR-01" }
{ "type": "yard", "id": "YARD-TMR" }
```

**Guard rule for DELETE yard:** Reject if yard has any lots attached.
**Guard rule for DELETE lot:** Reject if lot has any active/unpaid records
(i.e., `tallyVolumeM3 > 0` from unreleased inventory). Only allow if the
server-side stock balance for that lotCode is zero — or expose a `force` flag
for admin override.

---

## 8. Access Control

| Action | Level 1 | Level 2 | Level 3 |
|--------|---------|---------|---------|
| View yards & lots | ✅ | ✅ | ✅ |
| View occupancy | ✅ | ✅ | ✅ |
| Add yard | ✅ | ❌ | ❌ |
| Add lot | ✅ | ❌ | ❌ |
| Change lot status | ✅ | ❌ | ❌ |
| Delete lot/yard | ✅ | ❌ | ❌ |

Enforced on both:
- API (`user.roleLevel !== 1` → 403)
- UI (`canWrite` prop hides/disables buttons)

---

## 9. Error States

| Scenario | Behavior |
|----------|---------|
| API fetch fails | Show error banner: "Gagal memuat data lokasi penyimpanan" with retry button |
| Add yard — duplicate `yardCode` | Inline validation error: "Kode yard sudah digunakan" |
| Add lot — duplicate `lotCode` in same yard | Inline: "Kode kavling sudah ada di yard ini" |
| Delete yard with lots still attached | Toast error: "Hapus semua kavling dalam yard ini terlebih dahulu" |
| Delete lot with active stock | Toast error: "Kavling masih memiliki stok aktif. Kosongkan dulu sebelum menghapus." |
| Network offline during save | Optimistic update rollback + toast error |

---

## 10. YardSelect / KavlingSelect — Side Note

The working selectors (`YardSelect`, `KavlingSelect`) currently read from
`localStorage` via `src/utils/storage-locations.ts`. After this fix:

- The Settings page CRUD will POST/PATCH/DELETE to the API (server-authoritative)
- The selectors should ideally also read from the API, but this is out of scope
  for this fix — they will continue using localStorage
- The localStorage seed data matches the DB seed data, so they stay in sync on
  first load. This known limitation is documented in the storage spec.
- A future improvement (separate task) would create a unified
  `useStorageLocations` hook consumed by both Settings and the selectors.

