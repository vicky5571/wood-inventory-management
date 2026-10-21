# Plan: Weekly Payment Form (Sabtu-Jumat, Grouped per Supplier x Species x Contract)

**Date:** 2026-10-21
**Priority:** P2
**Status:** COMPLETE
**Related Client Feedback:** Item #2

---

## 1. Context & Problem Statement

### 1.1 Current State
- Payment tracking exists only at single-record granularity: `WoodReceivingRecord.paymentStatus`, `invoiceNumber`, `paymentDate`, `paymentNotes` (`src/types/index.ts:L181-184`).
- No batching, no weekly rollup, no supplier/species/contract grouping.
- Payment status badges in `Toolbar.tsx` filter records by `UNPAID`/`PARTIAL`/`PAID` but there's no AP document to drive the status transitions.
- Print modal pattern exists (`PrintReceivingSlipModal.tsx`, `PrintDeliveryOrderModal.tsx`) using `@media print` CSS — reusable template.

### 1.2 Client Spec (Finalized from Q2 + follow-up)
- Window: **Saturday-Friday** (operational week).
- Group records in window by **(supplier, woodSpecies, contractNumber)** -> each unique tuple generates **one separate payment form**.
- A record with multiple species (multi-item manifest) splits into multiple forms, one per species per record.
- Payment form serves **dual purpose**: AP tracker (status workflow) + printable document.
- Must skip PENDING-priced records (depends on Plan #5).

### 1.3 Non-Goals (YAGNI)
- No electronic payment integration (bank transfer API, QRIS).
- No multi-currency (IDR only).
- No partial payment allocation across records in a form (status is form-level).
- No automatic recurring generation (user triggers "generate for this week" button).
- No approval workflow (direct DRAFT -> ISSUED -> PAID transitions).
- No PDF file persistence (print via browser `window.print()` with `@media print` CSS; no server-side PDF generation).

---

## 2. Design Decisions

### 2.1 Week Window Definition
- Timezone: WIB (UTC+7). All date arithmetic uses local Jakarta time.
- Week start: Saturday 00:00 WIB. Week end: Friday 23:59:59 WIB.
- Helper: `getWeekWindow(anyDate: Date): { startDate: string; endDate: string }` returns ISO date-only strings.
- Weeks are addressed by their `startDate` (Saturday). E.g. week "2026-10-17" covers Oct 17 (Sat) through Oct 23 (Fri).

### 2.2 Grouping Semantics
Group key: `${supplierId_or_name}||${woodSpecies}||${contractNumber || '_'}`
- Supplier identified by `supplierName` (free text in current model) or `supplierId` once Plan #2 contract linkage settles. v1: use `supplierName.trim().toLowerCase()`.
- Species: `woodSpecies.trim().toLowerCase()`.
- Contract: `contractNumber.trim()` or empty token `_` for non-contract deals.
- Multi-item manifests: each `ReceivingItem` evaluated independently (one item -> one group bucket).

### 2.3 Entity Model

```ts
export type PaymentFormStatus = 'DRAFT' | 'ISSUED' | 'PAID' | 'VOID';

/**
 * Weekly consolidated payment form for a (supplier x species x contract) grouping.
 * Groups receiving records within one Sat-Fri window into a single AP document.
 */
export interface PaymentForm {
  id: string;
  tenantId: string;
  formNumber: string;              // e.g. "PAY-2026-W42-SPL001-JATI-01"
  weekStartDate: string;           // Saturday (YYYY-MM-DD)
  weekEndDate: string;             // Friday (YYYY-MM-DD)

  // Grouping key fields
  supplierName: string;
  supplierId?: string;             // if resolvable
  woodSpecies: string;
  contractNumber: string;          // empty string for non-contract

  // Content
  recordIds: string[];             // WoodReceivingRecord IDs included
  itemIds: string[];               // ReceivingItem IDs for multi-item manifests (if applicable)

  // Totals (snapshot at generation; recomputed on view until ISSUED)
  totalTallyVolumeM3: number;
  totalTallyPieces: number;
  totalTimberGrossIDR: number;
  totalTimberPphIDR: number;
  totalTimberNetIDR: number;

  // Workflow
  status: PaymentFormStatus;
  issuedAt?: string;
  paidAt?: string;
  invoiceNumber?: string;
  paymentDate?: string;
  paymentMethod?: string;          // e.g. "Transfer BCA", "Tunai"
  notes?: string;

  createdAt: string;
  updatedAt: string;
}
```

### 2.4 Payment Form Line Items (Derived, Not Stored)
Line items are computed from `recordIds` + `itemIds` at display/print time:
```ts
export interface PaymentFormLineItem {
  recordId: string;
  itemId?: string;
  receiptDate: string;
  truckPlateNumber: string;
  forestryDocNumber: string;        // SKSHHK
  receiptNumber: string;            // Kwitansi
  kavlingNumber: string;
  tallyVolumeM3: number;
  tallyPieces: number;
  timberPricePerM3: number;         // non-null (PENDING excluded)
  timberGrossIDR: number;
  timberPphIDR: number;
  timberNetIDR: number;
}

export interface PaymentFormWithLines extends PaymentForm {
  lines: PaymentFormLineItem[];
}
```

### 2.5 Generation Workflow
User action on `/payment-forms` page: "Generate forms untuk minggu [Sat date picker]"
1. Collect all records with `receiptDate` in window AND `paymentForm` not yet linked AND `timberPricePerM3 != null`.
2. For multi-item manifests, iterate items.
3. Group by key.
4. For each group:
   - If PaymentForm already exists for (week, supplier, species, contract) in status DRAFT -> merge new records in.
   - If exists in ISSUED/PAID -> skip and warn ("record X falls in group with locked form Y; adjust manually").
   - Otherwise create new DRAFT form.
5. Report summary: N forms created, M forms updated, K records skipped (reasons).

### 2.6 Status Workflow
- `DRAFT` -> can edit lines, add/remove records. Totals auto-recompute.
- `ISSUED` -> locked. Form number assigned. Printable. Can still cancel to VOID.
- `PAID` -> final. Writes `paymentDate`, `paymentMethod`. Linked records' `paymentStatus` -> `PAID`.
- `VOID` -> cancelled. Linked records' `paymentStatus` -> `UNPAID`.

Transitions one-way except VOID (any status can go to VOID with reason).

### 2.7 Record <-> Form Linkage
New field on `WoodReceivingRecord` (or `ReceivingItem` for multi-item):
```ts
paymentFormId?: string;       // FK to PaymentForm; set when included in a form
```
Alternative: pure derived relationship via `PaymentForm.recordIds`. Rejected because:
- Faster O(1) lookup from record -> form (ledger view "which form is this in?").
- Guards against double-inclusion in multiple forms.
- Needed for cascade updates when form status changes.

### 2.8 Form Number Format
`PAY-YYYY-W<week>-<supplierCode>-<speciesCode>-<seq>`
- YYYY: year of week start
- W<week>: ISO-week-like number computed from Saturday-start weeks (W01 = first Saturday of year or earlier)
- supplierCode: first 3 chars of supplier name uppercased, or supplier code if available
- speciesCode: first 4 chars of species uppercased
- seq: 2-digit sequence within (week, supplier, species) grouping — handles contract variants

Example: `PAY-2026-W42-PTA-JATI-01`

### 2.9 Print Layout
Reuse `@media print` CSS pattern from existing print modals. Single-page A4 portrait with:
- Header: company name, "FORM PEMBAYARAN KAYU", form number
- Supplier block: name, address, contract ref
- Period: week start - week end
- Table: lines (date, SKSHHK, kwitansi, kavling, volume, pieces, price, gross, PPh, net)
- Footer: totals (volume, gross, PPh, net), signature blocks (penerima, bendahara, mengetahui)

---

## 3. Implementation Checklist

### Phase 1: SSOT Types
- [x] Add `PaymentFormStatus`, `PaymentForm`, `PaymentFormLineItem`, `PaymentFormWithLines`, `PaymentFormFilterCriteria`, `PaymentFormGenerationResult` to `src/types/index.ts`
- [x] Add `paymentFormId?: string` to `WoodReceivingRecord` and `ReceivingItem`
- [x] Add activity actions: `PAYMENT_FORM_CREATED`, `PAYMENT_FORM_UPDATED`, `PAYMENT_FORM_ISSUED`, `PAYMENT_FORM_PAID`, `PAYMENT_FORM_VOIDED`

### Phase 2: Pure Helpers (Test-First)
- [x] Create `test/week-window.test.ts`:
  - [x] Saturday date -> same date as start
  - [x] Friday date -> previous Saturday as start
  - [x] Wednesday date -> previous Saturday as start
  - [x] Timezone edge cases (date near midnight WIB)
  - [x] Year boundary (Dec 31 Fri -> start Dec 26 Sat)
- [x] Implement `src/utils/week-window.ts` with `getWeekWindow(date)` and `formatWeekLabel(startDate)`
- [x] Create `test/payment-form-grouping.test.ts`:
  - [x] Empty records -> empty groups
  - [x] Single record -> single group
  - [x] Multiple records same supplier/species/contract -> single group with multiple lines
  - [x] Different contracts same supplier/species -> separate groups
  - [x] Multi-item manifest -> items split into their species groups
  - [x] PENDING-priced records excluded
  - [x] Records already linked to ISSUED form -> excluded with reason
  - [x] Records already linked to DRAFT form -> merged into existing
  - [x] Case/whitespace normalization on grouping keys
- [x] Implement `src/utils/payment-form-grouping.ts` with `groupRecordsForPayment()` and `computeFormTotals()`
- [x] Create `test/payment-form-numbering.test.ts`:
  - [x] Sequential numbering per (week, supplier, species)
  - [x] Collision handling when supplierCode truncation clashes
- [x] Implement `src/utils/payment-form-number.ts`
- [x] Run `node --test` -> 0 failures

### Phase 3: Persistence Layer
- [x] SQLite migration: create `payment_forms` table + add `payment_form_id` columns to `receiving_items` (and `wood_receiving_records` for backward compat)
- [x] Supabase migration SQL in `supabase/migrations/XXXX_payment_forms.sql`
- [x] Implement `src/persistence/sqlite/payment-form-queries.ts`
- [x] Implement `src/persistence/supabase/supabase-payment-form-store.ts`
- [x] Update `receiving_items_calc_view` to passthrough `payment_form_id`
- [x] Add payment form adapter to persistence facade

### Phase 4: API Routes
- [x] `app/api/payment-forms/route.ts` — GET (list with filter), POST (manual create blank)
- [x] `app/api/payment-forms/[id]/route.ts` — GET (with lines), PUT (update DRAFT), DELETE (void)
- [x] `app/api/payment-forms/generate/route.ts` — POST `{ weekStartDate }` -> returns `PaymentFormGenerationResult`
- [x] `app/api/payment-forms/[id]/status/route.ts` — PATCH `{ status, invoiceNumber?, paymentDate?, paymentMethod? }`
- [x] Validation: status transitions enforced server-side
- [x] Linked record paymentStatus cascade on form status change

### Phase 5: Hook & State
- [x] Create `src/hooks/usePaymentForms.ts`:
  - List, get-by-id, generate, updateStatus, void
  - Optimistic updates for status transitions
  - Local cache keyed by `weekStartDate`
- [x] Activity log wiring for all state changes

### Phase 6: List & Detail UI
- [x] `src/components/payment-forms/PaymentFormKpiStrip.tsx` — total forms this week, draft/issued/paid breakdown, total AP outstanding
- [x] `src/components/payment-forms/PaymentFormToolbar.tsx` — week picker (Sat only), status filter, supplier filter, "Generate for this week" button
- [x] `src/components/payment-forms/PaymentFormTable.tsx` — sortable, status badges, click-through to detail
- [x] `src/components/payment-forms/PaymentFormEmptyState.tsx`
- [x] `src/components/payment-forms/PaymentFormListView.tsx` — coordinator (<250 lines)
- [x] `app/payment-forms/page.tsx` — route shell
- [x] `src/components/payment-forms/PaymentFormHeaderCard.tsx` — metadata, status badge, action buttons
- [x] `src/components/payment-forms/PaymentFormLinesTable.tsx` — line items with per-record drilldown
- [x] `src/components/payment-forms/PaymentFormTotalsFooter.tsx`
- [x] `src/components/payment-forms/PaymentFormDetailView.tsx` — coordinator (<250 lines)
- [x] `app/payment-forms/[id]/page.tsx` — route shell

### Phase 7: Generation Modal
- [x] `src/components/payment-forms/GenerateFormsModal.tsx`:
  - Date picker constrained to Saturdays
  - Preview section: shows grouping breakdown before commit
  - Submit -> API call -> redirect to list with filter applied to generated forms
  - Result summary: N created, M updated, K skipped (with reasons)

### Phase 8: Status Transition UI
- [x] `src/components/payment-forms/IssueFormModal.tsx` — DRAFT -> ISSUED (prompts for form number override, auto-generates by default)
- [x] `src/components/payment-forms/MarkPaidModal.tsx` — ISSUED -> PAID (prompts for invoiceNumber, paymentDate, paymentMethod)
- [x] `src/components/payment-forms/VoidFormModal.tsx` — any -> VOID (prompts for reason, destructive confirm)
- [x] Each modal: optimistic update + toast feedback

### Phase 9: Print Modal
- [x] `src/components/payment-forms/PrintPaymentFormModal.tsx`:
  - Reuse `@media print` CSS pattern from `PrintReceivingSlipModal.tsx`
  - A4 portrait layout, header + supplier block + lines table + totals + signatures
  - Browser `window.print()` on open
  - Hide app chrome in print mode

### Phase 10: Ledger Integration
- [x] Add column "Form Pembayaran" to `RecordTable.tsx` showing linked payment form number (or "—")
- [x] Click form number -> navigate to `/payment-forms/[id]`
- [x] Filter: show records with no payment form (candidates for next generation)
- [x] Prevent editing `tallyVolumeM3`, `timberPricePerM3`, etc. when record is linked to ISSUED/PAID form (edit requires voiding form first)

### Phase 11: Nav & Verification
- [x] Add `payment-forms` entry to `src/components/layout/nav-config.ts`:
  - Label: "Form Pembayaran" / "付款单"
  - Badge: show DRAFT count when > 0
- [x] Run `npm run test` -> 0 failures
- [x] Run `npm run build:check` -> 0 TS/build errors
- [x] Confirm all coordinator files <250 lines
- [x] Manual smoke test:
  - [x] Add 3 records for same supplier/species/contract in one week -> generate forms -> 1 form with 3 lines
  - [x] Add 2 records different species -> generate -> 2 forms
  - [x] Add record with PENDING price -> generate -> record skipped with reason
  - [x] Issue form -> form number assigned, lines locked
  - [x] Mark PAID -> linked records' paymentStatus = PAID
  - [x] Void PAID form -> records revert to UNPAID
  - [x] Print form -> A4 layout correct, no app chrome visible
  - [x] Try to edit record in ISSUED form -> blocked with explanation
  - [x] Week picker constrained to Saturdays
  - [x] Multi-item manifest with 2 species -> 2 separate forms generated

---

## 4. File Change Manifest

| File | Action | Lines (est.) |
|---|---|---|
| `src/types/index.ts` | Modify (add types + FK fields + actions) | +150 |
| `src/utils/week-window.ts` | Create | ~80 |
| `src/utils/payment-form-grouping.ts` | Create | ~180 |
| `src/utils/payment-form-number.ts` | Create | ~90 |
| `test/week-window.test.ts` | Create | ~120 |
| `test/payment-form-grouping.test.ts` | Create | ~220 |
| `test/payment-form-numbering.test.ts` | Create | ~90 |
| `src/persistence/sqlite/payment-form-queries.ts` | Create | ~240 |
| `src/persistence/sqlite/migrations.ts` | Modify (new table + alter columns) | +60 |
| `src/persistence/supabase/supabase-payment-form-store.ts` | Create | ~240 |
| `supabase/migrations/XXXX_payment_forms.sql` | Create | ~100 |
| `src/persistence/sqlite/views-ddl.ts` | Modify (passthrough payment_form_id) | ~10 changed |
| `app/api/payment-forms/route.ts` | Create | ~120 |
| `app/api/payment-forms/[id]/route.ts` | Create | ~140 |
| `app/api/payment-forms/generate/route.ts` | Create | ~130 |
| `app/api/payment-forms/[id]/status/route.ts` | Create | ~110 |
| `src/hooks/usePaymentForms.ts` | Create | ~240 |
| `src/components/payment-forms/PaymentFormKpiStrip.tsx` | Create | ~90 |
| `src/components/payment-forms/PaymentFormToolbar.tsx` | Create | ~140 |
| `src/components/payment-forms/PaymentFormTable.tsx` | Create | ~180 |
| `src/components/payment-forms/PaymentFormEmptyState.tsx` | Create | ~35 |
| `src/components/payment-forms/PaymentFormListView.tsx` | Create | ~200 |
| `src/components/payment-forms/PaymentFormHeaderCard.tsx` | Create | ~110 |
| `src/components/payment-forms/PaymentFormLinesTable.tsx` | Create | ~160 |
| `src/components/payment-forms/PaymentFormTotalsFooter.tsx` | Create | ~70 |
| `src/components/payment-forms/PaymentFormDetailView.tsx` | Create | ~220 |
| `src/components/payment-forms/GenerateFormsModal.tsx` | Create | ~220 |
| `src/components/payment-forms/IssueFormModal.tsx` | Create | ~110 |
| `src/components/payment-forms/MarkPaidModal.tsx` | Create | ~140 |
| `src/components/payment-forms/VoidFormModal.tsx` | Create | ~90 |
| `src/components/payment-forms/PrintPaymentFormModal.tsx` | Create | ~230 |
| `src/components/ledger/RecordTable.tsx` | Modify (new column + edit guard) | ~30 changed |
| `src/components/ledger/RecordModal.tsx` | Modify (edit guard when form issued) | ~20 changed |
| `app/payment-forms/page.tsx` | Create | ~15 |
| `app/payment-forms/[id]/page.tsx` | Create | ~20 |
| `src/components/layout/nav-config.ts` | Modify (1 entry + badge) | ~10 changed |

**Total:** ~4,400 new LOC + ~70 touched LOC across ~30 new files + ~6 touched files. No file exceeds 250-line limit.

**Note:** This is the largest plan. Phase split option for execution:
- **Sub-plan A (Data + Generation)**: Phases 1-5 + 7 (types, calculators, persistence, API, hook, generation modal). Ships minimum viable AP batching.
- **Sub-plan B (UI + Print)**: Phases 6, 8-11 (list/detail views, status transitions, print, ledger integration, nav). Ships operator-facing polish.

---

## 5. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Week boundary ambiguity (Friday midnight edge) | All date comparisons use date-only strings in WIB. Document assumption in `week-window.ts` header. |
| Supplier identity drift (free-text supplier name typos) | Normalize via `.trim().toLowerCase()` in grouping. Warn user when grouping creates duplicate-looking suppliers ("Did you mean to merge PT ABC and PT Abc?"). Encourage Supplier master usage. |
| Multi-item manifest double-counting | Items grouped individually. Test case ensures no item appears in >1 form. |
| Status cascade (form PAID -> records PAID) breaks on record deletion | Soft-delete records only when linked to form; hard-delete requires voiding form first. |
| PENDING-priced records silently dropped | Generation result explicitly reports skipped records with reason "price pending". User can click to go to `/pending-pricing`. |
| Form number collisions across tenants | Form number includes tenant implicitly via scoping. Within tenant, sequence number guards. |
| Print layout breaks on long line counts (>20 lines) | Multi-page print CSS: `page-break-inside: avoid` on each line row; header repeats via `<thead>` tag which browsers typically repeat. |
| Browser `window.print()` inconsistency across browsers | Document tested matrix (Chrome, Edge, Safari). Fallback: provide HTML view that user can save as PDF manually. |
| Partial payment reality (customer pays 70%) | v1: no partial support. Status is form-level. v2 enhancement: `partialPaymentIDR` field, auto-sets status to PARTIAL (requires new PaymentStatus value or separate field). Document limitation. |
| Edit guard too strict (user needs to fix typo in locked form's record) | Explicit "Edit requires voiding form" flow with 2-click confirmation. Void creates audit entry; re-issue preserves form number via sequence reservation. |

---

## 6. Done Criteria

- All checkboxes in Section 3 ticked.
- `npm run test` + `npm run build:check` both green.
- Manual smoke test passes end-to-end for all status transitions.
- Multi-item manifests correctly split into per-species forms.
- Print layout acceptable in Chrome at A4 portrait.
- Ledger shows linkage column and respects edit guards.
- No regression in receiving, sales, inventory, suppliers.

---

## 7. Dependencies on Other Plans

- **Blocked by:** Plan #5 (Pending Pricing) — generation must skip null-priced records.
- **Benefits from:** Plan #2 (Perhutani Contract) — contract linkage makes grouping more meaningful; Plan #4 (Broker) — if commission tracking per form becomes relevant.
- **Related:** Settings — may need `AppSettings.yardName/yardCode` for print header (already exists).

