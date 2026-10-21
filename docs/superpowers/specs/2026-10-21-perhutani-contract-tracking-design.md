# Design Spec: Perhutani Contract Tracking & Followup Dashboard

**Document:** `docs/superpowers/specs/2026-10-21-perhutani-contract-tracking-design.md`
**Date:** 2026-10-21
**Status:** Draft — Pending Approval
**Related Plan:** `docs/superpowers/plans/2026-10-21-perhutani-contract-tracking.md`
**Architecture:** New `PerhutaniContract` + `ContractSortimentItem` + `ContractReceipt` entities with loose linkage (string-match) to existing `WoodReceivingRecord.contractNumber`. Dedicated `/contracts` list + `/contracts/[id]` detail routes. Hybrid combobox for receiving form integration (dropdown for Perhutani, free-text for others).

---

## 1. Executive Summary & Problem Statement

### 1.1 Context
Perhutani is a BUMN forestry entity with a specific procurement workflow:
```
Kontrak → Kwitansi (Payment) → SKSHHK (Shipping Permit / Nota Kirim)
```

Timber purchased under contract may remain undelivered for weeks or months. The portion already paid-for but not yet physically received represents **"stok kontrak"** — an off-books asset invisible to the current inventory system.

### 1.2 Business Problem
- Operators cannot answer: "Berapa sisa kayu yang sudah dibayar tapi belum dikirim dari Kontrak CTR-2026-01?"
- Contracts nearing expiry with unfulfilled stock risk forfeiture.
- No consolidated view of contract portfolio, outstanding payments, or shipping realization vs plan.
- Current `WoodReceivingRecord.contractNumber` is a flat string with no relational anchor.

### 1.3 Core Objectives
1. **Dedicated contract entity** scoped to Perhutani procurement with multi-sortimen support.
2. **Standalone kwitansi tracking** — 1 contract supports N payment installments.
3. **Live fulfillment summary** — purchased vs received (from matched receiving records) vs paid.
4. **Followup dashboard** — near-expiry alerts, overdue flagging, outstanding payable rollup.
5. **Hybrid receiving form integration** — Perhutani contracts from dropdown; non-Perhutani records retain free-text (zero disruption).
6. **No destructive migration** — existing records' `contractNumber` string unchanged; linkage emerges when matching contract is created.

---

## 2. User Experience & Navigation Flow

```
[ Sidebar Nav ]
  ├── ...
  ├── Inventaris (/inventory)
  ├── Kontrak (/contracts)  <── NEW
  └── ...

[ /contracts List Page ]
  ├── <ContractKpiStrip>
  │     ├── Total Kontrak Aktif
  │     ├── Total Sisa Stok Kontrak (m³)
  │     ├── Kontrak Mendekati Expiry (<30 hari)
  │     ├── Kontrak Overdue (lewat tanggal, sisa stok > 0)
  │     └── Total Nilai Kontrak Aktif (Rp)
  │
  ├── <ContractToolbar>
  │     ├── Search (contractNumber, poNumber, kphOrigin)
  │     ├── Status filter (ALL | DRAFT | ACTIVE | FULFILLED | EXPIRED | CANCELLED)
  │     ├── ☐ Hanya tampilkan mendekati expiry
  │     └── + Buat Kontrak Baru
  │
  └── <ContractTable>
        ├── Columns: No Kontrak | KPH | Tanggal | Berakhir | Nilai | Sisa Stok | Status | Aksi
        └── Click row → /contracts/[id]

[ /contracts/[id] Detail Page ]
  ├── <ContractHeaderCard>
  │     ├── Metadata (contractNumber, kphOrigin, dates, status badge)
  │     └── Actions: [ Edit ] [ Hapus ]
  │
  ├── <ContractFulfillmentCard>
  │     ├── Progress bar: Received / Purchased
  │     ├── Remaining Volume & Pieces
  │     ├── Total Paid / Contract Value
  │     └── Days Until Expiry (color-coded)
  │
  ├── <ContractSortimentTable>
  │     └── Items: Species | Grade | Length | Volume | Pieces | Price/m³ | Subtotal
  │
  ├── <ContractReceiptsPanel>
  │     ├── Table: No Kwitansi | Tanggal | Nominal | Volume Dicakup
  │     └── + Tambah Kwitansi
  │
  └── <LinkedReceivingList>
        └── Receiving records where contractNumber matches
```

---

## 3. Data Architecture & SSOT Schema

### 3.1 Domain Interfaces (`src/types/index.ts`)

```ts
export type ContractStatus = 'DRAFT' | 'ACTIVE' | 'FULFILLED' | 'EXPIRED' | 'CANCELLED';

export interface PerhutaniContract {
  id: string;
  tenantId: string;
  contractNumber: string;            // Unique per tenant
  contractDate: string;              // YYYY-MM-DD
  effectiveStartDate: string;
  effectiveEndDate: string;
  kphOrigin: string;                 // e.g. "KPH Randublatung"
  poNumber?: string;
  totalContractValueIDR: number;     // Cached: sum of items
  totalPurchasedVolumeM3: number;    // Cached: sum of items
  totalPurchasedPieces: number;      // Cached: sum of items (if specified)
  status: ContractStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContractSortimentItem {
  id: string;
  contractId: string;
  tenantId: string;
  itemSequence: number;
  woodSpecies: string;               // e.g. "Jati"
  grade: string;                     // e.g. "A1", "A2"
  woodLengthM?: number;
  volumeM3: number;
  pieces?: number;                   // Optional per Q3 decision
  pricePerM3: number;
  subtotalIDR: number;               // volumeM3 * pricePerM3
  notes?: string;
}

export interface ContractReceipt {
  id: string;
  contractId: string;
  tenantId: string;
  receiptNumber: string;             // No Kwitansi
  receiptDate: string;
  amountIDR: number;
  coveredVolumeM3: number;           // Volume covered by this payment
  coveredPieces?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContractFulfillmentSummary {
  contractId: string;
  contractNumber: string;
  purchasedVolumeM3: number;
  purchasedPieces: number;
  receivedVolumeM3: number;          // Sum WoodReceivingRecord.tallyVolumeM3 where contractNumber matches
  receivedPieces: number;
  remainingVolumeM3: number;         // max(0, purchased - received)
  remainingPieces: number;
  totalPaidIDR: number;              // Sum ContractReceipt.amountIDR
  totalContractValueIDR: number;
  outstandingIDR: number;            // max(0, contractValue - totalPaid)
  fulfillmentPercent: number;        // received / purchased * 100
  daysUntilExpiry: number;           // negative if overdue
  isNearExpiry: boolean;             // daysUntilExpiry ≤ 30 && remaining > 0
  isOverdue: boolean;                // daysUntilExpiry < 0 && remaining > 0
  status: ContractStatus;
}
```

### 3.2 Relational Schema (SQLite)

```sql
CREATE TABLE IF NOT EXISTS perhutani_contracts (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contract_number TEXT NOT NULL,
  contract_date TEXT NOT NULL,
  effective_start_date TEXT NOT NULL,
  effective_end_date TEXT NOT NULL,
  kph_origin TEXT NOT NULL,
  po_number TEXT,
  total_contract_value_idr REAL NOT NULL DEFAULT 0.0 CHECK (total_contract_value_idr >= 0),
  total_purchased_volume_m3 REAL NOT NULL DEFAULT 0.0 CHECK (total_purchased_volume_m3 >= 0),
  total_purchased_pieces INTEGER NOT NULL DEFAULT 0 CHECK (total_purchased_pieces >= 0),
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','ACTIVE','FULFILLED','EXPIRED','CANCELLED')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id, contract_number)
);

CREATE TABLE IF NOT EXISTS contract_sortiment_items (
  id TEXT PRIMARY KEY,
  contract_id TEXT NOT NULL REFERENCES perhutani_contracts(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  item_sequence INTEGER NOT NULL,
  wood_species TEXT NOT NULL,
  grade TEXT NOT NULL,
  wood_length_m REAL,
  volume_m3 REAL NOT NULL CHECK (volume_m3 > 0),
  pieces INTEGER CHECK (pieces IS NULL OR pieces > 0),
  price_per_m3 REAL NOT NULL CHECK (price_per_m3 >= 0),
  subtotal_idr REAL NOT NULL CHECK (subtotal_idr >= 0),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS contract_receipts (
  id TEXT PRIMARY KEY,
  contract_id TEXT NOT NULL REFERENCES perhutani_contracts(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  receipt_number TEXT NOT NULL,
  receipt_date TEXT NOT NULL,
  amount_idr REAL NOT NULL CHECK (amount_idr >= 0),
  covered_volume_m3 REAL NOT NULL CHECK (covered_volume_m3 >= 0),
  covered_pieces INTEGER CHECK (covered_pieces IS NULL OR covered_pieces >= 0),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_contracts_tenant_status ON perhutani_contracts(tenant_id, status);
CREATE INDEX idx_contract_items_contract ON contract_sortiment_items(contract_id);
CREATE INDEX idx_contract_receipts_contract ON contract_receipts(contract_id);
```

**No FK added to `wood_receiving_records`.** Linkage is loose via string match on `contractNumber`. Preserves zero migration disruption.

---

## 4. Pure Business Logic (`src/utils/contract-calc.ts`)

```ts
export function computeContractTotals(items: ContractSortimentItem[]): {
  totalValueIDR: number;
  totalVolumeM3: number;
  totalPieces: number;
}

export function computeFulfillmentSummary(
  contract: PerhutaniContract,
  items: ContractSortimentItem[],
  receipts: ContractReceipt[],
  receivingRecords: WoodReceivingRecord[],  // pre-filtered by matching contractNumber
  today: Date,
): ContractFulfillmentSummary

export function deriveContractStatus(
  contract: PerhutaniContract,
  summary: Pick<ContractFulfillmentSummary, 'remainingVolumeM3' | 'daysUntilExpiry'>,
): ContractStatus
```

**Derived status transitions:**
- `ACTIVE` → `FULFILLED` when `remainingVolumeM3 === 0`
- `ACTIVE` → `EXPIRED` when `daysUntilExpiry < 0 AND remainingVolumeM3 > 0`
- Stored `status` field is a hint; display always uses derived status.

**Date arithmetic:** All contract dates are date-only (YYYY-MM-DD). `daysUntilExpiry` computed as `(endDate - today)` in days using UTC midnight to avoid DST issues.

---

## 5. API Contracts

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/contracts` | List with `ContractFilterCriteria` query params |
| POST | `/api/contracts` | Create (header + items in one payload) |
| GET | `/api/contracts/[id]` | Return `ContractWithDetails` (header + items + receipts + summary) |
| PUT | `/api/contracts/[id]` | Update header + replace items |
| DELETE | `/api/contracts/[id]` | Soft-delete (status → CANCELLED) |
| GET | `/api/contracts/[id]/receipts` | List receipts for contract |
| POST | `/api/contracts/[id]/receipts` | Add receipt |
| PUT | `/api/contracts/[id]/receipts/[receiptId]` | Update receipt |
| DELETE | `/api/contracts/[id]/receipts/[receiptId]` | Delete receipt |

**Validation:**
- `contractNumber` unique per tenant.
- `effectiveEndDate >= effectiveStartDate`.
- At least 1 sortimen item required for ACTIVE status.
- `coveredVolumeM3` of all receipts ≤ `totalPurchasedVolumeM3` (soft warning, not block).

---

## 6. Component Modular Decomposition (<250 LOC)

```
src/components/contracts/
├── ContractListView.tsx          # Coordinator for list page
├── ContractKpiStrip.tsx          # 5 KPIs
├── ContractToolbar.tsx           # Search, filter, toggles
├── ContractTable.tsx             # Sortable table
├── ContractEmptyState.tsx
├── ContractDetailView.tsx        # Coordinator for detail page
├── ContractHeaderCard.tsx
├── ContractSortimentTable.tsx
├── ContractReceiptsPanel.tsx
├── ContractFulfillmentCard.tsx   # Progress bar + remaining
├── LinkedReceivingList.tsx       # Matched WoodReceivingRecords
├── ContractFormModal.tsx         # Create/edit header + multi-sortimen
├── ContractHeaderFields.tsx
├── SortimentItemRow.tsx
├── ReceiptFormModal.tsx
└── ContractCombobox.tsx          # Hybrid dropdown for receiving form

src/utils/contract-calc.ts        # Pure calculator (~150 LOC)
src/hooks/useContracts.ts         # Optimistic local-first hook (~220 LOC)

src/persistence/sqlite/contract-queries.ts
src/persistence/supabase/supabase-contract-store.ts
supabase/migrations/XXXX_perhutani_contracts.sql

app/contracts/page.tsx
app/contracts/[id]/page.tsx
app/api/contracts/route.ts
app/api/contracts/[id]/route.ts
app/api/contracts/[id]/receipts/route.ts
app/api/contracts/[id]/receipts/[receiptId]/route.ts
```

---

## 7. Receiving Form Integration (Hybrid Combobox)

Modify `src/components/ledger/RecordDocumentSection.tsx`:
- Replace plain text input for `contractNumber` with `<ContractCombobox>`.
- Dropdown shows active Perhutani contracts formatted as `${contractNumber} — ${kphOrigin}`.
- Free-text fallback: user can type any value not in list (non-Perhutani case preserved).
- On selecting a Perhutani contract, auto-fill `supplierName` to `Perhutani ${kphOrigin}`.
- Minimal visual change, backward compatible.

---

## 8. Business Rules & Edge Cases

### 8.1 String Match Normalization
- Comparison: `.trim()` on both sides, case-sensitive match (contract numbers are typically formal codes).
- Future: fuzzy match + warning for near-misses if typos become problematic.

### 8.2 Over-Received Edge Case
- If sum of `receivedVolumeM3` > `purchasedVolumeM3`, clamp `remainingVolumeM3` to 0.
- Surface "Over-delivered" warning badge on contract detail.
- Do not block — manual reconciliation needed.

### 8.3 Delete Cascade
- Soft-delete contract → cascade-soft-delete sortiment items + receipts.
- Receiving records untouched (loose coupling preserved).

### 8.4 Multi-Receipt Partial Payments
- 1 contract → N receipts allowed.
- No enforcement that `sum(coveredVolumeM3) == purchasedVolumeM3` (business reality: partial installments, final adjustments).

---

## 9. Acceptance Criteria

1. New nav entry "Kontrak" appears in sidebar.
2. Create contract with 3 sortimen items → totals computed correctly.
3. Add 2 receipts → total paid updates.
4. Add receiving record referencing contractNumber → remaining stock decrements in detail view.
5. Edit contract → changes persist.
6. Soft-delete contract → undo via toast works.
7. Set end date in past → status flips to EXPIRED, appears in overdue filter.
8. Non-Perhutani record uses free-text contractNumber → no error, not linked.
9. All coordinator files <250 LOC.
10. `node --test` passes with new contract-calc tests.

---

## 10. Non-Goals (YAGNI)

- No PDF contract upload/parsing.
- No automatic SKSHHK document generation.
- No contract amendment history/versioning.
- No electronic signature workflow.
- No Perhutani API integration (none available).

---

## 11. Verification & Success Criteria

1. **Pure logic tests:** `test/contract-calc.test.ts` covers totals, fulfillment, status derivation, expiry edge cases.
2. **Build gate:** `npm run build:check` → 0 errors.
3. **Smoke test:** Section 9 acceptance criteria.
4. **Zero regression:** Existing receiving flow continues; records without matching contracts display identically.

---

## 12. Contract Verification Checklist (Grep-Able Audit)

### 12.1 SSOT Types
```bash
# Use word-boundary pattern to avoid false positives (e.g. ContractReceipt vs ContractReceiptFormInput)
for name in PerhutaniContract ContractSortimentItem ContractReceipt \
            ContractFulfillmentSummary ContractWithDetails ContractFilterCriteria \
            ContractSortimentInput ContractReceiptFormInput; do
  # Match: "export interface Name {" or "export interface Name extends ..." or "export type Name ="
  count=$(grep -cE "export interface ${name}(\$|[[:space:]])|export type ${name}[[:space:]]*=" src/types/index.ts)
  echo "$name: $count"
done
grep -cE "export type ContractStatus =" src/types/index.ts
# EXPECT: each type appears exactly 1 time
```

### 12.2 Pure Logic
```bash
# All 4 calculator functions present
for fn in computeContractTotals calculateDaysDifference deriveContractStatus computeFulfillmentSummary; do
  grep -c "export function $fn" src/utils/contract-calc.ts
done
# EXPECT: each returns 1
```

### 12.3 Component Files
```bash
# All 15 contract components exist
ls src/components/contracts/ContractListView.tsx \
   src/components/contracts/ContractKpiStrip.tsx \
   src/components/contracts/ContractToolbar.tsx \
   src/components/contracts/ContractTable.tsx \
   src/components/contracts/ContractEmptyState.tsx \
   src/components/contracts/ContractDetailView.tsx \
   src/components/contracts/ContractHeaderCard.tsx \
   src/components/contracts/ContractSortimentTable.tsx \
   src/components/contracts/ContractReceiptsPanel.tsx \
   src/components/contracts/ContractFulfillmentCard.tsx \
   src/components/contracts/LinkedReceivingList.tsx \
   src/components/contracts/ContractFormModal.tsx \
   src/components/contracts/ContractHeaderFields.tsx \
   src/components/contracts/SortimentItemRow.tsx \
   src/components/contracts/ReceiptFormModal.tsx \
   src/components/contracts/ContractCombobox.tsx

# All coordinator files <250 LOC
for f in src/components/contracts/ContractListView.tsx \
         src/components/contracts/ContractDetailView.tsx \
         src/components/contracts/ContractFormModal.tsx \
         src/components/contracts/ReceiptFormModal.tsx; do
  wc -l "$f" | awk -v f="$f" '{if ($1 > 250) {print f " EXCEEDS " $1 " LOC"; exit 1}}'
done
```

### 12.4 Routes & API
```bash
ls app/contracts/page.tsx \
   app/contracts/\[id\]/page.tsx \
   app/api/contracts/route.ts \
   app/api/contracts/\[id\]/route.ts \
   app/api/contracts/\[id\]/receipts/route.ts \
   app/api/contracts/\[id\]/receipts/\[receiptId\]/route.ts
# EXPECT: all 6 files found
```

### 12.5 Persistence
```bash
ls src/persistence/sqlite/contract-queries.ts \
   src/persistence/supabase/supabase-contract-store.ts \
   supabase/migrations/*perhutani_contracts*.sql
# EXPECT: all found

# SQL tables defined
grep -c "CREATE TABLE.*perhutani_contracts\|CREATE TABLE.*contract_sortiment_items\|CREATE TABLE.*contract_receipts" \
  supabase/migrations/*perhutani_contracts*.sql
# EXPECT: 3
```

### 12.6 Hook & Nav
```bash
ls src/hooks/useContracts.ts
grep -c "id: 'contracts'" src/components/layout/nav-config.ts
# EXPECT: file found, nav entry = 1
```

### 12.7 Receiving Form Integration
```bash
grep -c "ContractCombobox" src/components/ledger/RecordDocumentSection.tsx
# EXPECT: >= 1 (import + usage)

grep -c "onSelectContract" src/components/ledger/RecordDocumentSection.tsx
# EXPECT: >= 1 (auto-fill supplierName logic present)
```

### 12.8 Tests & Overall Gate
```bash
ls test/contract-calc.test.ts
node --test test/contract-calc.test.ts 2>&1 | grep "fail 0"
npm run drift:check && npm test
# EXPECT: all green
```
