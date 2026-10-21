# Plan: Perhutani Contract Tracking & Followup Dashboard

**Date:** 2026-10-21
**Priority:** P0 (Client urgency — "paling mendesak justru yang paling simple, data inventaris, followup kontrak")
**Status:** COMPLETED
**Related Client Feedback:** Items #5, #8

---

## 1. Context & Problem Statement

### 1.1 Current State
- `WoodReceivingRecord.contractNumber` is a flat string field (`src/types/index.ts:L148`).
- `receiptNumber` (kwitansi) is also flat string, with no linkage to a parent contract.
- No `PerhutaniContract` entity, no API routes, no UI.
- Procurement flow Kontrak → Kwitansi → SKSHHK is tracked only implicitly via text matching.

### 1.2 Why This Is P0
Client explicitly ranked contract followup as one of two most urgent items. Without a contract tracker:
- "Stok kontrak" (purchased but not yet delivered via SKSHHK) is invisible.
- No way to detect contracts near expiry with unfulfilled remaining stock.
- Manual Excel tracking is error-prone and non-shared.

### 1.3 Scope Decisions (From Client Q&A)
- **Q1=A:** Entity is Perhutani-specific. Non-Perhutani records continue using flat `contractNumber`.
- **Q2=A:** `ContractReceipt` (kwitansi) is a standalone entity; 1 contract → N receipts.
- **Q3:** Stock tracked in BOTH volume (m³) AND pieces (batang).
- **Q4:** Manual form input with multi-item sortimen (mirrors `ManifestFormInput` pattern).
- **Q5=C:** Hybrid linkage — dropdown for Perhutani contracts, free-text fallback for non-Perhutani.
- **Q6:** All 5 dashboard metrics confirmed.
- **Q7:** Field list confirmed sufficient.

### 1.4 Non-Goals (YAGNI)
- No PDF contract upload/parsing (defer indefinitely until proven need).
- No automatic SKSHHK document generation (out of scope — forestry system).
- No contract amendment history/versioning (v1 = simple edit-in-place).
- No electronic signature / approval workflow.
- No integration with Perhutani external API (none available).

---

## 2. Domain Model (SSOT Additions to `src/types/index.ts`)

### 2.1 Core Entities

```ts
export type ContractStatus = 'DRAFT' | 'ACTIVE' | 'FULFILLED' | 'EXPIRED' | 'CANCELLED';

/**
 * Perhutani Procurement Contract Header (tenant-scoped).
 * Flow: Contract -> Receipt (Kwitansi) -> SKSHHK (recorded as WoodReceivingRecord).
 */
export interface PerhutaniContract {
  id: string;
  tenantId: string;

  // Identification
  contractNumber: string;           // No Kontrak (unique per tenant)
  contractDate: string;             // Tanggal Kontrak (YYYY-MM-DD)
  effectiveStartDate: string;       // Mulai Berlaku
  effectiveEndDate: string;         // Berakhir
  kphOrigin: string;                // e.g. "KPH Randublatung"
  poNumber?: string;                // No PO / SPK

  // Totals (derived from items[] at calc time; cached for query perf)
  totalContractValueIDR: number;    // Sum of items (volume * price)
  totalPurchasedVolumeM3: number;   // Sum of items.volumeM3
  totalPurchasedPieces: number;     // Sum of items.pieces (if specified)

  status: ContractStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Contract Sortimen Line Item (1 contract -> N sortimen).
 * Example: "Jati A1 panjang 4m -> 100 m³ @ Rp 5,000,000/m³"
 */
export interface ContractSortimentItem {
  id: string;
  contractId: string;
  tenantId: string;
  itemSequence: number;
  woodSpecies: string;              // e.g. "Jati"
  grade: string;                    // e.g. "A1", "A2", "AII"
  woodLengthM?: number;             // Panjang kayu (optional)
  volumeM3: number;                 // Volume kontrak sortimen ini
  pieces?: number;                  // Jumlah batang (optional per Q3)
  pricePerM3: number;
  subtotalIDR: number;              // volumeM3 * pricePerM3
  notes?: string;
}

/**
 * Contract Receipt / Kwitansi Pembayaran (1 contract -> N receipts).
 * Represents payment installments (DP, pelunasan, bertahap) against a contract.
 */
export interface ContractReceipt {
  id: string;
  contractId: string;
  tenantId: string;
  receiptNumber: string;            // No Kwitansi
  receiptDate: string;              // Tanggal Kwitansi
  amountIDR: number;                // Nominal pembayaran
  coveredVolumeM3: number;          // Volume kayu yang dicakup kwitansi ini
  coveredPieces?: number;           // Jumlah batang yang dicakup (optional)
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
```

### 2.2 Derived / Aggregate Shapes

```ts
/**
 * Live contract fulfillment metrics computed from:
 *   - PerhutaniContract (purchased totals)
 *   - WoodReceivingRecord[] filtered by contractNumber (received totals via SKSHHK)
 *   - ContractReceipt[] (paid totals)
 */
export interface ContractFulfillmentSummary {
  contractId: string;
  contractNumber: string;

  purchasedVolumeM3: number;
  purchasedPieces: number;
  receivedVolumeM3: number;         // Sum WoodReceivingRecord.tallyVolumeM3 where contractNumber matches
  receivedPieces: number;
  remainingVolumeM3: number;        // purchased - received (clamped >= 0)
  remainingPieces: number;

  totalPaidIDR: number;             // Sum ContractReceipt.amountIDR
  totalContractValueIDR: number;
  outstandingIDR: number;           // contractValue - totalPaid (clamped >= 0)

  fulfillmentPercent: number;       // received / purchased * 100
  daysUntilExpiry: number;          // negative if overdue
  isNearExpiry: boolean;            // daysUntilExpiry <= 30 && remaining > 0
  isOverdue: boolean;               // daysUntilExpiry < 0 && remaining > 0
  status: ContractStatus;
}

export interface ContractWithDetails extends PerhutaniContract {
  items: ContractSortimentItem[];
  receipts: ContractReceipt[];
  summary: ContractFulfillmentSummary;
}

export interface ContractFilterCriteria {
  searchQuery?: string;             // matches contractNumber, poNumber, kphOrigin
  status?: ContractStatus | 'ALL';
  nearExpiryOnly?: boolean;
  overdueOnly?: boolean;
}
```

### 2.3 Form Input Shapes

```ts
export interface ContractSortimentInput {
  id: string;                       // client-side temp id for list keying
  woodSpecies: string;
  grade: string;
  woodLengthM?: number;
  volumeM3: number;
  pieces?: number;
  pricePerM3: number;
  notes?: string;
}

export interface ContractFormInput {
  id?: string;                      // undefined = create, defined = edit
  contractNumber: string;
  contractDate: string;
  effectiveStartDate: string;
  effectiveEndDate: string;
  kphOrigin: string;
  poNumber?: string;
  status: ContractStatus;
  notes?: string;
  items: ContractSortimentInput[];
}

export interface ContractReceiptFormInput {
  id?: string;
  contractId: string;
  receiptNumber: string;
  receiptDate: string;
  amountIDR: number;
  coveredVolumeM3: number;
  coveredPieces?: number;
  notes?: string;
}
```

---

## 3. Architectural Approach

### 3.1 Persistence Strategy
Follow existing dual-mode pattern (`node:sqlite` local + Supabase cloud) established in `src/persistence/`.

**New tables:**
- `perhutani_contracts` (header)
- `contract_sortiment_items` (FK → contracts, ON DELETE CASCADE)
- `contract_receipts` (FK → contracts, ON DELETE CASCADE)

**No FK from `wood_receiving_records` to contracts** — linkage remains loose via `contractNumber` string match (per Q1=A, Q5=C: hybrid Perhutani/non-Perhutani). This preserves existing record integrity and avoids disruptive migration.

### 3.2 Pure Calculators (`src/utils/contract-calc.ts`)
New file, stateless:

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
  receivingRecords: WoodReceivingRecord[],   // pre-filtered by contractNumber match
  today: Date,
): ContractFulfillmentSummary

export function deriveContractStatus(
  contract: PerhutaniContract,
  summary: Pick<ContractFulfillmentSummary, 'remainingVolumeM3' | 'daysUntilExpiry'>,
): ContractStatus
```

### 3.3 Hook (`src/hooks/useContracts.ts`)
Mirrors `useWoodRecords.ts` pattern:
- Optimistic local-first state (LocalStorage/IndexedDB)
- API sync via `/api/contracts` and `/api/contracts/[id]/receipts`
- Methods: `createContract`, `updateContract`, `deleteContract` (soft), `restoreContract`, `addReceipt`, `removeReceipt`
- Derived selector: `getContractWithDetails(id, receivingRecords)` returns `ContractWithDetails`

### 3.4 Route & Component Layout

Routes (App Router):
- `app/contracts/page.tsx` — list view with filters
- `app/contracts/[id]/page.tsx` — detail view with receipts tab

Components under `src/components/contracts/`:
```
ContractListView.tsx           # Coordinator for list page (<250 lines)
├─ ContractKpiStrip.tsx        # 5 KPIs (per Q6)
├─ ContractToolbar.tsx         # Search, status filter, near-expiry/overdue toggles
├─ ContractTable.tsx           # Sortable table
└─ ContractEmptyState.tsx

ContractDetailView.tsx         # Coordinator for detail page (<250 lines)
├─ ContractHeaderCard.tsx      # Contract metadata + status badge
├─ ContractSortimentTable.tsx  # Items breakdown
├─ ContractReceiptsPanel.tsx   # Kwitansi list + add/remove
├─ ContractFulfillmentCard.tsx # Received vs purchased progress bar
└─ LinkedReceivingList.tsx     # Receiving records matched by contractNumber

ContractFormModal.tsx          # Create/edit header + multi-sortimen (<250 lines)
├─ ContractHeaderFields.tsx
└─ SortimentItemRow.tsx

ReceiptFormModal.tsx           # Add/edit kwitansi (<250 lines)
```

### 3.5 Integration with Existing Receiving Form (Q5=C Hybrid)
Modify `src/components/ledger/RecordDocumentSection.tsx`:
- Replace plain text input for `contractNumber` with a `ContractCombobox` component:
  - Dropdown shows active Perhutani contracts (contractNumber + kphOrigin label)
  - Free-text fallback: user can type any value not in list (non-Perhutani case)
  - On selecting a Perhutani contract, auto-fill `supplierName` to "Perhutani KPH ..."
- Minimal visual change, backward compatible with existing records.

### 3.6 Nav Integration
Add nav entry after `inventory` (Plan #1) in `src/components/layout/nav-config.ts`:
```ts
{ id: 'contracts', labelId: 'Kontrak', labelZh: '合同', href: '/contracts' }
```

---

## 4. Implementation Checklist

### Phase 1: SSOT Type Definitions
- [x] Add `ContractStatus`, `PerhutaniContract`, `ContractSortimentItem`, `ContractReceipt` to `src/types/index.ts`
- [x] Add derived types: `ContractFulfillmentSummary`, `ContractWithDetails`, `ContractFilterCriteria`
- [x] Add form input types: `ContractSortimentInput`, `ContractFormInput`, `ContractReceiptFormInput`

### Phase 2: Pure Calculators (Test-First)
- [x] Create `test/contract-calc.test.ts` covering:
  - [x] `computeContractTotals` with empty items -> all zeros
  - [x] `computeContractTotals` with multi-item -> correct sums
  - [x] `computeFulfillmentSummary` with no receiving records -> fully remaining
  - [x] `computeFulfillmentSummary` with partial delivery -> correct remaining
  - [x] `computeFulfillmentSummary` where received > purchased -> remaining clamped to 0
  - [x] `daysUntilExpiry` correct for past/future dates
  - [x] `isNearExpiry` true when <=30 days AND remaining > 0
  - [x] `isOverdue` true when past end date AND remaining > 0
  - [x] `deriveContractStatus` transitions: ACTIVE -> FULFILLED when remaining == 0
  - [x] `deriveContractStatus` transitions: ACTIVE -> EXPIRED when past end date
- [x] Implement `src/utils/contract-calc.ts`
- [x] Run `node --test test/contract-calc.test.ts` -> 0 failures

### Phase 3: Persistence Layer
- [x] Add SQLite DDL for 3 new tables in `src/persistence/sqlite/` (follow existing migration pattern)
- [x] Add Supabase migration SQL in `supabase/migrations/`
- [x] Implement `src/persistence/sqlite/contract-queries.ts`
- [x] Implement `src/persistence/supabase/supabase-contract-store.ts`
- [x] Add contract adapter to persistence facade

### Phase 4: API Routes
- [x] `app/api/contracts/route.ts` — GET (list with filters), POST (create)
- [x] `app/api/contracts/[id]/route.ts` — GET (detail with items+receipts), PUT (update), DELETE (soft)
- [x] `app/api/contracts/[id]/receipts/route.ts` — GET, POST
- [x] `app/api/contracts/[id]/receipts/[receiptId]/route.ts` — PUT, DELETE
- [x] Each route: input validation, tenant scoping, error envelope consistency

### Phase 5: Hook & State
- [x] Create `src/hooks/useContracts.ts` with optimistic local-first pattern
- [x] Add LocalStorage cache keys to persistence layer
- [x] Add activity log actions: `CONTRACT_CREATED`, `CONTRACT_UPDATED`, `CONTRACT_DELETED`, `CONTRACT_RESTORED`, `RECEIPT_CREATED`, `RECEIPT_DELETED` to `ActivityActionType` enum

### Phase 6: List View UI
- [x] `src/components/contracts/ContractKpiStrip.tsx` — 5 KPIs
- [x] `src/components/contracts/ContractToolbar.tsx` — search, filter dropdown, toggles
- [x] `src/components/contracts/ContractTable.tsx` — sortable, status badges, click-through to detail
- [x] `src/components/contracts/ContractEmptyState.tsx`
- [x] `src/components/contracts/ContractListView.tsx` — coordinator
- [x] `app/contracts/page.tsx` — route shell

### Phase 7: Detail View UI
- [x] `src/components/contracts/ContractHeaderCard.tsx`
- [x] `src/components/contracts/ContractSortimentTable.tsx`
- [x] `src/components/contracts/ContractReceiptsPanel.tsx`
- [x] `src/components/contracts/ContractFulfillmentCard.tsx` — progress bar + remaining
- [x] `src/components/contracts/LinkedReceivingList.tsx` — list of matched WoodReceivingRecords
- [x] `src/components/contracts/ContractDetailView.tsx` — coordinator
- [x] `app/contracts/[id]/page.tsx` — route shell

### Phase 8: Forms
- [x] `src/components/contracts/SortimentItemRow.tsx` — single row editor
- [x] `src/components/contracts/ContractHeaderFields.tsx`
- [x] `src/components/contracts/ContractFormModal.tsx` — create/edit with multi-sortimen
- [x] `src/components/contracts/ReceiptFormModal.tsx`
- [x] Draft persistence for contract form (localStorage key `wood_contract_draft`) — mirrors receiving draft

### Phase 9: Receiving Form Integration
- [x] Create `src/components/contracts/ContractCombobox.tsx` (hybrid dropdown + free-text)
- [x] Replace `contractNumber` plain input in `src/components/ledger/RecordDocumentSection.tsx`
- [x] Verify backward compatibility: existing records with non-matching `contractNumber` still display correctly

### Phase 10: Nav & Verification
- [x] Add `contracts` entry to `src/components/layout/nav-config.ts`
- [x] Run `npm run test` -> 0 failures
- [x] Run `npm run build:check` -> 0 TS/build errors
- [x] Confirm all coordinator files <250 lines
- [x] Manual smoke test:
  - [x] Create contract with 3 sortimen items -> totals computed correctly
  - [x] Add 2 receipts -> paid total updates
  - [x] Add receiving record referencing contractNumber -> remaining stock decrements in detail view
  - [x] Edit contract -> changes persist
  - [x] Soft-delete contract -> undo via toast works
  - [x] Set end date in past -> status flips to EXPIRED, appears in overdue filter
  - [x] Non-Perhutani record uses free-text contractNumber -> no error, not linked

---

## 5. File Change Manifest

| File | Action | Lines (est.) |
|---|---|---|
| `src/types/index.ts` | Modify (add ~10 interfaces) | +180 |
| `src/utils/contract-calc.ts` | Create | ~150 |
| `test/contract-calc.test.ts` | Create | ~200 |
| `src/persistence/sqlite/contract-queries.ts` | Create | ~200 |
| `src/persistence/sqlite/migrate-contracts.ts` | Create | ~80 |
| `src/persistence/supabase/supabase-contract-store.ts` | Create | ~220 |
| `supabase/migrations/XXXX_perhutani_contracts.sql` | Create | ~90 |
| `app/api/contracts/route.ts` | Create | ~100 |
| `app/api/contracts/[id]/route.ts` | Create | ~120 |
| `app/api/contracts/[id]/receipts/route.ts` | Create | ~80 |
| `app/api/contracts/[id]/receipts/[receiptId]/route.ts` | Create | ~70 |
| `src/hooks/useContracts.ts` | Create | ~220 |
| `src/components/contracts/ContractListView.tsx` | Create | ~180 |
| `src/components/contracts/ContractKpiStrip.tsx` | Create | ~90 |
| `src/components/contracts/ContractToolbar.tsx` | Create | ~110 |
| `src/components/contracts/ContractTable.tsx` | Create | ~180 |
| `src/components/contracts/ContractEmptyState.tsx` | Create | ~35 |
| `src/components/contracts/ContractDetailView.tsx` | Create | ~200 |
| `src/components/contracts/ContractHeaderCard.tsx` | Create | ~90 |
| `src/components/contracts/ContractSortimentTable.tsx` | Create | ~120 |
| `src/components/contracts/ContractReceiptsPanel.tsx` | Create | ~140 |
| `src/components/contracts/ContractFulfillmentCard.tsx` | Create | ~100 |
| `src/components/contracts/LinkedReceivingList.tsx` | Create | ~110 |
| `src/components/contracts/ContractFormModal.tsx` | Create | ~230 |
| `src/components/contracts/ContractHeaderFields.tsx` | Create | ~130 |
| `src/components/contracts/SortimentItemRow.tsx` | Create | ~110 |
| `src/components/contracts/ReceiptFormModal.tsx` | Create | ~170 |
| `src/components/contracts/ContractCombobox.tsx` | Create | ~140 |
| `src/components/ledger/RecordDocumentSection.tsx` | Modify (swap input) | ~10 changed |
| `app/contracts/page.tsx` | Create | ~15 |
| `app/contracts/[id]/page.tsx` | Create | ~20 |
| `src/components/layout/nav-config.ts` | Modify (1 entry) | +6 |

**Total new code:** ~3,900 lines across ~30 new files + 3 touched files. No single file exceeds 250-line God File limit.

**Note on size:** This is a large plan (M-L complexity per earlier estimate). If execution reveals excessive scope, split into sub-plans along phase boundaries: Phase 1-5 (data + API) can ship first; Phase 6-10 (UI) ships second.

---

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| String-match linkage `contractNumber` is brittle (typos, trailing spaces) | Normalize on both sides via `.trim()`. Use case-insensitive comparison in `computeFulfillmentSummary`. Future: add server-side validation on receiving form to warn if entered contractNumber doesn't match any ACTIVE contract. |
| Status derivation ambiguity (manual vs auto) | Store `status` as raw field, but override to EXPIRED/FULFILLED in `deriveContractStatus` when applicable. UI displays derived; writes only touch raw field. |
| Over-received edge case (SKSHHK volume > purchased) | Clamp `remainingVolumeM3` to 0 but surface warning badge "Over-delivered" on contract detail. Do not block, since manual reconciliation needed. |
| Deleting contract with linked receipts | Soft-delete only. Receipts cascade-soft-delete. Receiving records untouched (loose coupling). |
| Date timezone issues (daysUntilExpiry off by 1) | All contract dates are date-only (YYYY-MM-DD), compared via UTC midnight. Document in calculator header. |
| Multi-item contract form complexity | Reuse proven pattern from `ManifestFormInput` + `ManifestItemInput` (same ergonomics users already know). |
| Migration from existing contractNumber strings | No migration needed. Existing records continue to work; they just won't appear "linked" until a matching `PerhutaniContract` is created. Zero disruption. |

---

## 7. Done Criteria

- All checkboxes in Section 4 ticked.
- `npm run test` and `npm run build:check` both green with zero failures.
- Manual smoke test passes end-to-end.
- No regression in: ledger (existing contractNumber field still works), sales, inventory (Plan #1), suppliers.
- All coordinator files remain under 250 lines.
- Client walkthrough confirms: can create a Perhutani contract, record receipts (kwitansi), input SKSHHK via existing receiving flow, and see remaining stock decrement live on the contract detail page.

---

## 8. Dependencies on Other Plans

- **Blocks:** Plan #5 (Pending Pricing) — benefits from contract-linked default prices but not required.
- **Blocked by:** None. Can execute independently after Plan #1 (Inventory View) ships.
- **Related:** Plan #6 (Weekly Payment Form) will group by `contractNumber`; this plan makes that grouping meaningful by exposing contract metadata.

