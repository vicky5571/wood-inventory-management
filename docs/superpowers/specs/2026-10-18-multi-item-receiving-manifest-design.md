# Multi-Item Truck Receiving Manifest — System Design Spec

**Date:** 2026-10-18  
**Status:** Ready for Review  
**Classification:** Core Functional & UI Enhancement (Phase 1)  
**Target:** Modular Modern Web Architecture (Next.js 15.5, React 19, TypeScript, Native SQLite `node:sqlite`)  

---

## 1. Problem Statement & Operational Context

In timber milling and sawmill receiving logistics, flatbed logging trucks rarely deliver a single homogeneous timber batch. A single truck delivery typically carries:
- Different log lengths (e.g. 50 stems of 4.0m Teak + 30 stems of 3.0m Teak).
- Multiple wood species (e.g. Teak logs mixed with Mahoni or Merbau from the same concession).
- Logs allocated to different yard stacks or drying kilns (*Kavling / TPK*).

While our database layer was normalized into 3NF (`receiving_manifests` $\to$ `receiving_items`), the frontend modal ([RecordModal.tsx](file:///Users/mac/Web%20Development/wood-inventory-management/src/components/ledger/RecordModal.tsx)) is still constrained to a single flat item per truck. As a result, operators must repeatedly duplicate truck numbers, legal forestry permits (`SKSHHK`), and delivery dates across multiple manual submissions.

### Core Objectives
1. **Header-Detail Entry UX**: Support recording 1 physical truck delivery (Header) with $1 \dots N$ timber line items (Details) in a single modal transaction.
2. **Aggregated Freight & Taxes**: Freight charges (`freightRatePerM3`) automatically calculate against the **aggregate tally volume** across all line items in the truck.
3. **100% Backward Compatibility**: Flattens cleanly into the existing 26-column Buku Besar table and Excel exporter via `v_buku_besar_flat` while surfacing a visual "Truck Batch" group badge for related items.
4. **Resilient Multi-Row Auto-Draft**: Debounced `localStorage` draft saving supporting multi-line manifests, preventing data loss during yard interruptions.

---

## 2. Domain Data Architecture & SSOT

All types remain strictly consolidated in [src/types/index.ts](file:///Users/mac/Web%20Development/wood-inventory-management/src/types/index.ts).

### 2.1 Form Domain Model (`ManifestFormInput`)

```typescript
export interface ManifestItemInput {
  id: string; // Temporary or persisted item ID
  woodSpecies: string;
  woodLengthM: number;
  kavlingNumber: string;
  storageYard: string;
  deliveredPieces: number;
  deliveredVolumeM3: number;
  tallyPieces: number;
  tallyVolumeM3: number;
  timberPricePerM3: number;
  timberPphRate: number;
}

export interface ManifestFormInput {
  id: string; // Manifest ID
  receiptDate: string;
  docDate?: string;
  truckPlateNumber: string;
  forestryDocNumber: string;
  receiptNumber: string;
  contractNumber: string;
  supplierName: string;
  freightRatePerM3: number;
  freightPphAmount?: number;
  brokerFee: number;
  paymentStatus?: PaymentStatus;
  invoiceNumber?: string;
  paymentDate?: string;
  paymentNotes?: string;
  items: ManifestItemInput[];
}
```

### 2.2 Mathematical Calculation Rules

Multi-item calculations are encapsulated in pure functions in [src/utils/timber-calc.ts](file:///Users/mac/Web%20Development/wood-inventory-management/src/utils/timber-calc.ts):

1. **Per-Item Calculations**:
   - $\text{Gross Timber}_i = V_{\text{tally}, i} \times P_{\text{timber}, i}$
   - $\text{PPh Timber}_i = \text{Gross Timber}_i \times \left(\frac{r_{\text{pph}, i}}{100}\right)$
   - $\text{Net Timber}_i = \text{Gross Timber}_i - \text{PPh Timber}_i$
   - $\Delta V_i = V_{\text{tally}, i} - V_{\text{delivered}, i}$
   - $\Delta B_i = B_{\text{tally}, i} - B_{\text{delivered}, i}$

2. **Truck Manifest Aggregates**:
   - $V_{\text{total, tally}} = \sum_{i=1}^N V_{\text{tally}, i}$
   - $V_{\text{total, delivered}} = \sum_{i=1}^N V_{\text{delivered}, i}$
   - $\text{Gross Freight} = V_{\text{total, tally}} \times \text{Rate}_{\text{freight/m3}}$
   - $\text{PPh Freight} = \text{Gross Freight} \times 0.02 \quad (\text{PPh 23})$
   - $\text{Net Freight} = \text{Gross Freight} - \text{PPh Freight}$
   - $\text{Grand Net Payable} = \sum_{i=1}^N \text{Net Timber}_i + \text{Net Freight} + \text{Broker Fee}$

---

## 3. Component Decomposition (<250 LOC Strangler Pattern)

To avoid God-file anti-patterns, the modal is decomposed into focused subcomponents:

```text
src/components/ledger/
├── RecordModal.tsx                (Coordinator: state, draft sync, validation, <200 LOC)
├── ManifestHeaderSection.tsx      (Truck plate, supplier, SKSHHK, dates, <150 LOC)
├── ManifestItemsTable.tsx         (Dynamic multi-row timber items table, <200 LOC)
├── ManifestItemRow.tsx            (Individual editable row with SpeciesCombobox & inputs, <180 LOC)
├── ManifestFreightSection.tsx     (Freight rate/m³, broker fee, AP payment status, <140 LOC)
└── ManifestReconciliationCard.tsx (Aggregate live preview, discrepancy metrics, grand total, <160 LOC)
```

---

## 4. Storage & Persistence Flow

1. **Client Submission (`RecordModal` $\to$ `useWoodRecords`)**:
   - When the user saves a `ManifestFormInput`, `saveManifest(manifest)` decomposes the input:
     - For each item $i$, a projected `WoodReceivingRecord` is synthesized.
     - For single-item manifests: `id = manifest.id`.
     - For multi-item manifests: `id = ${manifest.id}_${item.id}`, with `manifestId = manifest.id`.
   - Persisted immediately to client state & offline storage with background REST synchronization.
2. **Server-Side Relational Store (`SqliteRecordStore`)**:
   - Writes directly to `receiving_manifests` and $N$ rows in `receiving_items` within an atomic transaction (`BEGIN TRANSACTION` $\dots$ `COMMIT`).
   - `v_buku_besar_flat` dynamically recalculates taxes, freight allocation, and net payables.
3. **Ledger Table Presentation**:
   - In `RecordTable.tsx` / `RecordTableExcelView.tsx`, rows sharing the same `manifestId` display an inline badge (e.g. `Batch [2 item]`) with synchronized deletion and editing.

---

## 5. Test & Verification Plan

1. **Domain Pure Functions (`test/timber-calc.test.ts`)**:
   - `computeManifestCalculations(manifestInput)`: multi-item volume aggregation, proportional freight calculation, and grand total.
2. **Form Draft Persistence (`test/record-draft.test.ts`)**:
   - Verify serialization and restoration of multi-item draft state.
3. **SQLite Store Multi-Item Support (`test/sqlite-record-store.test.ts`)**:
   - Verify saving a multi-item manifest creates 1 `receiving_manifests` row and $N$ `receiving_items` rows, and deleting the manifest cascades to all items.
4. **UI Contracts & Zero-Regression Verification**:
   - All 288 existing tests must pass with 0 failures (`npm test`).
   - Clean production build (`npm run build`).
