# Design Spec: Weekly Payment Form (Saturday-Friday, Grouped per Supplier x Species x Contract)

**Document:** `docs/superpowers/specs/2026-10-21-weekly-payment-form-design.md`
**Date:** 2026-10-21
**Status:** Draft — Pending Approval
**Related Plan:** `docs/superpowers/plans/2026-10-21-weekly-payment-form.md`
**Architecture:** New `PaymentForm` entity consolidating receiving records within a Sat-Fri weekly window, grouped per unique (supplier × woodSpecies × contractNumber) tuple. Dual purpose: AP tracker with status workflow (DRAFT → ISSUED → PAID → VOID) + printable document (`@media print` CSS). Bidirectional FK linkage with `WoodReceivingRecord.paymentFormId` for fast lookup and double-inclusion guard. Multi-item manifests split per species into separate forms. PENDING-priced records excluded from generation.

---

## 1. Executive Summary & Problem Statement

### 1.1 Context
Payment tracking currently exists only at single-record granularity (`WoodReceivingRecord.paymentStatus/invoiceNumber/paymentDate`). No batching, no weekly consolidation, no grouping. Finance staff cannot produce a single AP document covering a week of deliveries from one supplier.

### 1.2 Client Specification (Finalized from Q2)
- Weekly window: **Saturday–Friday** (operational week in WIB).
- Group records in window by `(supplierName, woodSpecies, contractNumber)` → one payment form per unique tuple.
- Multi-item manifest with 2 species → splits into 2 forms.
- Dual purpose: AP tracker (status workflow) + printable document.
- Skip PENDING-priced records (depends on Spec #5).

### 1.3 Business Problem
- No way to generate a single payment form consolidating all deliveries of "Jati from PT ABC under Contract CTR-01 for week Oct 17-23".
- Payment status transitions scattered per-record with no document anchor.
- Finance must manually rebuild forms in Excel, prone to errors and duplication.

### 1.4 Core Objectives
1. **New `PaymentForm` entity** with weekly window + grouping key fields.
2. **Deterministic generation algorithm** from receiving records.
3. **Status workflow**: DRAFT → ISSUED → PAID → VOID with record cascade.
4. **Printable document** via `@media print` CSS (reuses existing modal pattern).
5. **Edit guard**: records in ISSUED/PAID form require form voiding before edit.
6. **Explicit skip reporting** for PENDING-priced and already-linked records.

---

## 2. User Experience & Navigation Flow

```
[ Sidebar Nav ]
  ├── ...
  ├── Form Pembayaran (/payment-forms)  <── NEW, with DRAFT count badge
  └── ...

[ /payment-forms List Page ]
  ├── <PaymentFormKpiStrip>
  │     ├── Total Forms Minggu Ini
  │     ├── Draft / Issued / Paid breakdown
  │     └── Total AP Outstanding (Rp)
  │
  ├── <PaymentFormToolbar>
  │     ├── Week picker (Saturday only, defaults to current week)
  │     ├── Status filter
  │     ├── Supplier filter
  │     └── [ Generate for this week ]  → <GenerateFormsModal>
  │
  └── <PaymentFormTable>
        ├── Columns: No Form | Minggu | Supplier | Species | Contract | Volume | Nilai | Status | Aksi
        └── Click row → /payment-forms/[id]

[ <GenerateFormsModal> ]
  ├── Week picker (Saturday)
  ├── Preview section: shows grouping breakdown + records to be included
  ├── Preview: records skipped with reasons (PENDING price, already in locked form)
  └── [ Generate ] → API call → redirect to list

[ /payment-forms/[id] Detail Page ]
  ├── <PaymentFormHeaderCard>
  │     ├── Form number, status badge, week range
  │     ├── Supplier, species, contract reference
  │     └── Actions: [ Edit ] [ Issue ] [ Mark Paid ] [ Void ] [ Print ]
  │
  ├── <PaymentFormLinesTable>
  │     ├── Lines: Date | SKSHHK | Kwitansi | Kavling | Volume | Pieces | Price | Gross | PPh | Net
  │     └── Click line → navigate to source /ledger record
  │
  └── <PaymentFormTotalsFooter>
        ├── Total Volume, Pieces
        └── Grand totals (gross, PPh, net)

[ Status Transition Modals ]
  ├── <IssueFormModal>: DRAFT → ISSUED, form number assigned
  ├── <MarkPaidModal>: ISSUED → PAID, prompts invoiceNumber, paymentDate, paymentMethod
  └── <VoidFormModal>: any → VOID, destructive confirm, reason required

[ <PrintPaymentFormModal> ]
  ├── A4 portrait @media print layout
  ├── Header: company, "FORM PEMBAYARAN KAYU", form number
  ├── Supplier block, period
  ├── Lines table
  ├── Totals footer
  └── Signature blocks: Penerima, Bendahara, Mengetahui
```

---

## 3. Data Architecture & SSOT Schema

### 3.1 Domain Interfaces (`src/types/index.ts`)

```ts
export type PaymentFormStatus = 'DRAFT' | 'ISSUED' | 'PAID' | 'VOID';

export interface PaymentForm {
  id: string;
  tenantId: string;
  formNumber: string;                 // e.g. "PAY-2026-W42-PTA-JATI-01"
  weekStartDate: string;              // Saturday (YYYY-MM-DD)
  weekEndDate: string;                // Friday (YYYY-MM-DD)

  // Grouping key fields
  supplierName: string;
  supplierId?: string;
  woodSpecies: string;
  contractNumber: string;             // Empty string for non-contract

  // Content references
  recordIds: string[];
  itemIds: string[];                  // For multi-item manifest items

  // Snapshot totals (cached; recomputed until ISSUED)
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
  paymentMethod?: string;
  notes?: string;

  createdAt: string;
  updatedAt: string;
}

// Derived at display/print time, not stored
export interface PaymentFormLineItem {
  recordId: string;
  itemId?: string;
  receiptDate: string;
  truckPlateNumber: string;
  forestryDocNumber: string;          // SKSHHK
  receiptNumber: string;              // Kwitansi
  kavlingNumber: string;
  tallyVolumeM3: number;
  tallyPieces: number;
  timberPricePerM3: number;           // Non-null (PENDING excluded)
  timberGrossIDR: number;
  timberPphIDR: number;
  timberNetIDR: number;
}

export interface PaymentFormWithLines extends PaymentForm {
  lines: PaymentFormLineItem[];
}

export interface PaymentFormFilterCriteria {
  weekStartDate?: string;
  status?: PaymentFormStatus | 'ALL';
  supplierName?: string;
  searchQuery?: string;
}

export interface PaymentFormGenerationResult {
  createdCount: number;
  updatedCount: number;               // Existing DRAFT forms merged into
  skippedCount: number;
  skippedReasons: Array<{
    recordId: string;
    itemId?: string;
    reason: 'PENDING_PRICE' | 'ALREADY_IN_LOCKED_FORM' | 'OUT_OF_WINDOW';
    lockedFormNumber?: string;
  }>;
  formIds: string[];                  // IDs of created/updated forms
}
```

### 3.2 Modified Interfaces

```ts
export interface WoodReceivingRecord {
  // ...existing fields
  paymentFormId?: string;             // NEW: FK to PaymentForm.id
}

export interface ReceivingItem {
  // ...existing fields
  paymentFormId?: string;             // NEW: for multi-item manifests
}
```

### 3.3 Relational Schema (SQLite)

```sql
CREATE TABLE IF NOT EXISTS payment_forms (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  form_number TEXT NOT NULL,
  week_start_date TEXT NOT NULL,
  week_end_date TEXT NOT NULL,
  supplier_name TEXT NOT NULL,
  supplier_id TEXT,
  wood_species TEXT NOT NULL,
  contract_number TEXT NOT NULL DEFAULT '',
  record_ids TEXT NOT NULL,            -- JSON array
  item_ids TEXT NOT NULL DEFAULT '[]', -- JSON array
  total_tally_volume_m3 REAL NOT NULL DEFAULT 0.0,
  total_tally_pieces INTEGER NOT NULL DEFAULT 0,
  total_timber_gross_idr REAL NOT NULL DEFAULT 0.0,
  total_timber_pph_idr REAL NOT NULL DEFAULT 0.0,
  total_timber_net_idr REAL NOT NULL DEFAULT 0.0,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','ISSUED','PAID','VOID')),
  issued_at TEXT,
  paid_at TEXT,
  invoice_number TEXT,
  payment_date TEXT,
  payment_method TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id, form_number)
);

ALTER TABLE receiving_items ADD COLUMN payment_form_id TEXT REFERENCES payment_forms(id) ON DELETE SET NULL;
ALTER TABLE receiving_manifests ADD COLUMN payment_form_id TEXT REFERENCES payment_forms(id) ON DELETE SET NULL;

CREATE INDEX idx_payment_forms_week ON payment_forms(tenant_id, week_start_date);
CREATE INDEX idx_payment_forms_status ON payment_forms(tenant_id, status);
CREATE INDEX idx_items_payment_form ON receiving_items(payment_form_id);
```

---

## 4. Pure Business Logic

### 4.1 Week Window (`src/utils/week-window.ts`)

```ts
export function getWeekWindow(anyDate: Date): { startDate: string; endDate: string }
export function formatWeekLabel(startDate: string): string  // "17 Oct - 23 Oct 2026 (W42)"
```

**Semantics:**
- Timezone: WIB (UTC+7) fixed, no DST.
- Saturday 00:00 WIB → Friday 23:59:59 WIB.
- Week addressed by `startDate` (Saturday ISO date).
- Returned dates are date-only strings (YYYY-MM-DD).

**Algorithm:**
```ts
function getWeekWindow(d: Date): { startDate: string; endDate: string } {
  const dayOfWeek = d.getUTCDay();                 // 0=Sun, 6=Sat
  const daysSinceSaturday = (dayOfWeek + 1) % 7;   // Sat=0, Sun=1, ... Fri=6
  const saturday = new Date(d);
  saturday.setUTCDate(d.getUTCDate() - daysSinceSaturday);
  const friday = new Date(saturday);
  friday.setUTCDate(saturday.getUTCDate() + 6);
  return {
    startDate: saturday.toISOString().slice(0, 10),
    endDate: friday.toISOString().slice(0, 10),
  };
}
```

### 4.2 Grouping (`src/utils/payment-form-grouping.ts`)

```ts
export function groupRecordsForPayment(
  records: WoodReceivingRecord[],
  items: ReceivingItem[],              // From multi-item manifests
  weekStartDate: string,
  weekEndDate: string,
  existingForms: PaymentForm[],
): {
  groups: Map<string, PaymentFormLineItem[]>;    // Key: supplier||species||contract
  skipped: PaymentFormGenerationResult['skippedReasons'];
}

export function computeFormTotals(lines: PaymentFormLineItem[]): {
  totalTallyVolumeM3: number;
  totalTallyPieces: number;
  totalTimberGrossIDR: number;
  totalTimberPphIDR: number;
  totalTimberNetIDR: number;
}
```

**Grouping key:** `${supplierNameNormalized}||${speciesNormalized}||${contractNumber || '_'}`

Normalization: `.trim().toLowerCase()` on supplier and species. Contract preserved as-is (empty string → `_`).

**Multi-item handling:** Iterate items; each item evaluated independently against its parent manifest's supplier.

**Skip rules:**
- `timberPricePerM3 == null` → `PENDING_PRICE`
- `paymentFormId` points to ISSUED/PAID/VOID form → `ALREADY_IN_LOCKED_FORM`
- `receiptDate` outside `[weekStartDate, weekEndDate]` → `OUT_OF_WINDOW` (should not happen if caller pre-filters)

### 4.3 Form Numbering (`src/utils/payment-form-number.ts`)

```ts
export function generateFormNumber(input: {
  weekStartDate: string;
  supplierName: string;
  supplierCode?: string;
  woodSpecies: string;
  sequence: number;                    // Within same (week, supplier, species)
}): string
```

**Format:** `PAY-YYYY-W<week>-<supplier>-<species>-<seq>`
- `YYYY`: year of week start
- `W<week>`: Saturday-based week number (01-53)
- `<supplier>`: `supplierCode` if present, else first 3 chars of name uppercased
- `<species>`: first 4 chars uppercased
- `<seq>`: 2-digit sequence

Example: `PAY-2026-W42-PTA-JATI-01`

**Collision handling:** Caller passes incrementing `sequence`; numbering helper is pure.

---

## 5. API Contracts

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/payment-forms` | List with `PaymentFormFilterCriteria` |
| POST | `/api/payment-forms` | Manual create (blank form) |
| GET | `/api/payment-forms/[id]` | Return `PaymentFormWithLines` |
| PUT | `/api/payment-forms/[id]` | Update DRAFT (add/remove records, change notes) |
| DELETE | `/api/payment-forms/[id]` | Soft-delete → VOID |
| POST | `/api/payment-forms/generate` | `{ weekStartDate }` → `PaymentFormGenerationResult` |
| PATCH | `/api/payment-forms/[id]/status` | `{ status, invoiceNumber?, paymentDate?, paymentMethod? }` |

**Status transition rules (server-enforced):**
- DRAFT → ISSUED (assigns form number if not set)
- DRAFT → VOID
- ISSUED → PAID (requires invoiceNumber, paymentDate, paymentMethod)
- ISSUED → VOID
- PAID → VOID (reverts linked records' paymentStatus to UNPAID)
- Any other transition → HTTP 400

**Cascade on status change:**
- ISSUED: linked records' `paymentStatus` unchanged (still UNPAID).
- PAID: linked records' `paymentStatus` → PAID.
- VOID from PAID: linked records' `paymentStatus` → UNPAID.
- VOID clears `recordIds` link-back? NO — preserve for audit; records can be re-included in new DRAFT if `paymentFormId` nullified via API.

---

## 6. Component Modular Decomposition (<250 LOC)

```
src/components/payment-forms/
├── PaymentFormListView.tsx           # Coordinator
├── PaymentFormKpiStrip.tsx
├── PaymentFormToolbar.tsx            # Week picker, filters, generate button
├── PaymentFormTable.tsx
├── PaymentFormEmptyState.tsx
├── PaymentFormDetailView.tsx         # Coordinator for detail page
├── PaymentFormHeaderCard.tsx
├── PaymentFormLinesTable.tsx
├── PaymentFormTotalsFooter.tsx
├── GenerateFormsModal.tsx            # Preview + commit
├── IssueFormModal.tsx                # DRAFT → ISSUED
├── MarkPaidModal.tsx                 # ISSUED → PAID
├── VoidFormModal.tsx                 # any → VOID
└── PrintPaymentFormModal.tsx         # @media print

src/utils/
├── week-window.ts
├── payment-form-grouping.ts
└── payment-form-number.ts

src/hooks/usePaymentForms.ts

src/persistence/sqlite/payment-form-queries.ts
src/persistence/supabase/supabase-payment-form-store.ts
supabase/migrations/XXXX_payment_forms.sql

app/payment-forms/page.tsx
app/payment-forms/[id]/page.tsx
app/api/payment-forms/route.ts
app/api/payment-forms/[id]/route.ts
app/api/payment-forms/generate/route.ts
app/api/payment-forms/[id]/status/route.ts

Modified:
├── src/components/ledger/RecordTable.tsx     # +Form Pembayaran column + edit guard
├── src/components/ledger/RecordModal.tsx     # Edit guard when linked to ISSUED/PAID
└── src/components/layout/nav-config.ts
```

---

## 7. Business Rules & Edge Cases

### 7.1 Week Boundary
- Record with `receiptDate = 2026-10-23` (Fri): in week W42 (Oct 17-23).
- Record with `receiptDate = 2026-10-24` (Sat): in week W43 (Oct 24-30).
- Date-only comparison; no time-of-day ambiguity.

### 7.2 Supplier Identity Drift
- Free-text `supplierName` normalized via `.trim().toLowerCase()`.
- "PT ABC" vs "pt abc" vs "PT ABC " → same group.
- Future (post-Spec #4 Broker + Supplier master integration): warn on near-match duplicates.

### 7.3 Multi-Item Double-Counting Guard
- Each `ReceivingItem` evaluated once.
- Grouping key uses item's species (not manifest-level).
- `paymentFormId` set per item; manifest-level flag only for backward compat on legacy records.

### 7.4 Edit Guard
- Record with `paymentFormId` pointing to ISSUED/PAID form:
  - `tallyVolumeM3`, `tallyPieces`, `timberPricePerM3`, `timberPphRate` → locked.
  - Non-financial fields (notes, truck plate) → editable.
- User sees warning: "Record ini sudah masuk Form Pembayaran [#]. Void form terlebih dahulu untuk mengedit nilai."

### 7.5 Status Cascade on Record Deletion
- Soft-delete record linked to DRAFT form: form totals recompute, continues.
- Soft-delete record linked to ISSUED/PAID form: blocked. User must void form first.

### 7.6 Partial Payment (v1 Limitation)
- Status is form-level only. No per-record partial allocation.
- Documented as known limitation; v2 enhancement: `partialPaymentIDR` field.

### 7.7 Form Number Collision
- Within (week, supplier, species): sequence auto-increments.
- Across tenants: implicit scoping via `tenantId` in composite unique key.

### 7.8 Print Layout
- Reuses `PrintReceivingSlipModal.tsx` CSS pattern.
- A4 portrait, `page-break-inside: avoid` on each line row.
- `<thead>` tag ensures header repeats on multi-page prints.
- Browser compatibility: tested matrix Chrome, Edge, Safari.
- Fallback: HTML view saveable as PDF via browser print dialog.

---

## 8. Acceptance Criteria

1. Nav entry "Form Pembayaran" with DRAFT count badge.
2. 3 records same supplier/species/contract in one week → generate → 1 form with 3 lines.
3. 2 records different species → generate → 2 forms.
4. Record with PENDING price → generate → record skipped with reason "PENDING_PRICE".
5. Issue form → form number assigned, lines locked.
6. Mark PAID → linked records' paymentStatus = PAID.
7. Void PAID form → records revert to UNPAID.
8. Print form → A4 layout correct, no app chrome visible.
9. Edit `tallyVolumeM3` of record in ISSUED form → blocked with explanation.
10. Week picker constrained to Saturdays.
11. Multi-item manifest with 2 species → 2 separate forms generated.
12. Delete record linked to DRAFT form → form totals recompute.
13. Delete record linked to ISSUED form → blocked.
14. All coordinator files <250 LOC.
15. `node --test` passes week-window, grouping, numbering tests.

---

## 9. Non-Goals (YAGNI)

- No electronic payment integration (bank transfer, QRIS).
- No multi-currency (IDR only).
- No partial payment allocation.
- No automatic recurring generation (user triggers).
- No approval workflow.
- No server-side PDF file persistence.

---

## 10. Verification & Success Criteria

1. **Pure logic tests:**
   - `test/week-window.test.ts`: Saturday/Friday/mid-week dates, year boundary, timezone edges.
   - `test/payment-form-grouping.test.ts`: single/multi-record grouping, multi-item split, PENDING exclusion, locked-form exclusion, normalization.
   - `test/payment-form-numbering.test.ts`: sequential numbering, collision via sequence, supplier code truncation.
2. **Build gate:** `npm run build:check` → 0 errors.
3. **Smoke test:** Section 8 acceptance criteria.
4. **Zero regression:** Receiving flow continues; records without `paymentFormId` unchanged.

---

## 11. Dependencies

- **Blocked by:** Spec #5 (Pending Pricing) — PENDING records must be identifiable and excluded.
- **Benefits from:**
  - Spec #2 (Perhutani Contract) — contract linkage enriches grouping context.
  - Spec #4 (Broker) — commission tracking per form (future enhancement).
- **Related:** Settings — reuses `AppSettings.yardName/yardCode` for print header.
