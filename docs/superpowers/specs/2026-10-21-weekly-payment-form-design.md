# Design Spec: Lembar Tagihan — Weekly Payment Form (SUPERSEDED by Refactor)

**Document:** `docs/superpowers/specs/2026-10-21-weekly-payment-form-design.md`
**Date:** 2026-10-21 (revised 2026-10-22)
**Status:** Superseded by refactor plan `docs/superpowers/plans/2026-10-22-refactor-payment-form-to-lembar-tagihan.md`
**Related Plan:** `docs/superpowers/plans/2026-10-21-weekly-payment-form.md` (original) + refactor plan above
**Architecture:** `PaymentForm` entity (now "Lembar Tagihan") consolidates receiving records within a Sat-Fri weekly window, grouped per `(supplier × woodSpecies × contractNumber)` tuple. Dual purpose: AP tracker with status workflow (DRAFT → ISSUED → PAID → VOID) + printable physical document matching PT. Brilliant Jaya Wood Industry's pre-printed `LEMBAR TAGIHAN / 请款单` carbon copy book layout.

> **⚠️ Revision Notice:** This spec was originally designed with a generic AP document layout. After client provided actual physical form reference (image dated 2026-10-22), the following fields and semantics were **refactored**:
>
> - `formNumber` (auto-generated `PAY-YYYY-W##-...`) → `preprintedNumber` (user-input manual from physical carbon book, e.g. `018532`)
> - Weekly window display → `issueDate` single date on print (window remains internal grouping metadata)
> - Line item structure → 6-column table matching physical form: Kategori, Konten, Tujuan, Harga Satuan, Jumlah, Unit, Total
> - Signature blocks → 5 fixed slots (Manager Umum, Finance, Kepala Akuntan, Kepala Dep., Pembuat) as template cetak only (no approval tracking)
> - Added `AppSettings.companyName` for header
> - Added `terbilang` auto-generated amount-in-words (UPPERCASE)
>
> See refactor plan for migration path. Spec sections below marked **[REVISED]** where overridden.

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

---

## 12. Contract Verification Checklist (Grep-Able Audit)

### 12.1 SSOT Types
```bash
grep -c "export type PaymentFormStatus" src/types/index.ts
for name in PaymentForm PaymentFormLineItem PaymentFormWithLines \
            PaymentFormFilterCriteria PaymentFormGenerationResult; do
  grep -c "export interface $name" src/types/index.ts
done
# EXPECT: each 1

# FK fields on records
grep -c "paymentFormId" src/types/index.ts
# EXPECT: >= 2 (WoodReceivingRecord + ReceivingItem)
```

### 12.2 Pure Logic — Week Window
```bash
grep -c "export function getWeekWindow\|export function formatWeekLabel" src/utils/week-window.ts
# EXPECT: >= 2
```

### 12.3 Pure Logic — Grouping & Numbering
```bash
grep -c "export function groupRecordsForPayment\|export function computeFormTotals" src/utils/payment-form-grouping.ts
grep -c "export function generateFormNumber" src/utils/payment-form-number.ts
# EXPECT: >= 2 in grouping, 1 in numbering
```

### 12.4 Persistence
```bash
ls src/persistence/sqlite/payment-form-queries.ts \
   src/persistence/supabase/supabase-payment-form-store.ts \
   supabase/migrations/*payment_forms*.sql
# EXPECT: all found

grep -c "CREATE TABLE.*payment_forms" supabase/migrations/*payment_forms*.sql
grep -c "payment_form_id" supabase/migrations/*payment_forms*.sql
# EXPECT: >= 1 each (table + FK column on receiving_items/manifests)
```

### 12.5 API Routes
```bash
ls app/api/payment-forms/route.ts \
   app/api/payment-forms/\[id\]/route.ts \
   app/api/payment-forms/generate/route.ts \
   app/api/payment-forms/\[id\]/status/route.ts
# EXPECT: all 4 files found
```

### 12.6 Component Files
```bash
# Core 15 components present
ls src/components/payment-forms/PaymentFormListView.tsx \
   src/components/payment-forms/PaymentFormKpiStrip.tsx \
   src/components/payment-forms/PaymentFormToolbar.tsx \
   src/components/payment-forms/PaymentFormTable.tsx \
   src/components/payment-forms/PaymentFormEmptyState.tsx \
   src/components/payment-forms/PaymentFormDetailView.tsx \
   src/components/payment-forms/PaymentFormHeaderCard.tsx \
   src/components/payment-forms/PaymentFormLinesTable.tsx \
   src/components/payment-forms/PaymentFormTotalsFooter.tsx \
   src/components/payment-forms/GenerateFormsModal.tsx \
   src/components/payment-forms/IssueFormModal.tsx \
   src/components/payment-forms/MarkPaidModal.tsx \
   src/components/payment-forms/VoidFormModal.tsx \
   src/components/payment-forms/PrintPaymentFormModal.tsx

# Print layout uses @media print
grep -c "@media print" src/components/payment-forms/PrintPaymentFormModal.tsx
# EXPECT: >= 1
```

### 12.7 Routes & Nav
```bash
ls app/payment-forms/page.tsx app/payment-forms/\[id\]/page.tsx
grep -c "id: 'payment-forms'" src/components/layout/nav-config.ts
# EXPECT: both pages found, nav entry = 1
```

### 12.8 Edit Guard Integration
```bash
# RecordModal or RecordTable must check paymentFormId for edit guard
grep -rn "paymentFormId" src/components/ledger/
# EXPECT: >= 1 (edit guard logic present)
```

### 12.9 Tests & Overall Gate
```bash
ls test/week-window.test.ts \
   test/payment-form-grouping.test.ts \
   test/payment-form-numbering.test.ts
node --test test/week-window.test.ts test/payment-form-grouping.test.ts test/payment-form-numbering.test.ts 2>&1 | grep "fail 0"
npm run drift:check && npm test
# EXPECT: all green
```

---

## 13. REVISION LOG — Lembar Tagihan Physical Form Alignment (2026-10-22)

Client provided actual physical form reference (`LEMBAR TAGIHAN / 请款单` from PT. Brilliant Jaya Wood Industry's carbon copy book). The following design changes were applied via refactor plan `docs/superpowers/plans/2026-10-22-refactor-payment-form-to-lembar-tagihan.md`.

### 13.1 Field Changes to `PaymentForm` Entity

```ts
export interface PaymentForm {
  id: string;
  tenantId: string;

  // [REVISED] Renamed + semantics changed
  // formNumber: string;                       // OLD: auto-generated PAY-YYYY-W##-...
  preprintedNumber: string;                     // NEW: user-input from physical book (e.g. "018532")

  // [REVISED] Added single-date field; week range remains for internal grouping only
  issueDate: string;                            // NEW: single date printed on form (YYYY-MM-DD)
  weekStartDate: string;                        // UNCHANGED: Saturday (grouping metadata)
  weekEndDate: string;                          // UNCHANGED: Friday (grouping metadata)

  // Grouping key fields (unchanged)
  supplierName: string;
  supplierId?: string;
  woodSpecies: string;
  contractNumber: string;

  // [REVISED] Line items now explicit entity with physical form columns
  lines: PaymentFormLineItem[];                 // Replaces recordIds[] + itemIds[] for printed representation
  recordIds: string[];                          // UNCHANGED: internal reference to source WoodReceivingRecords
  itemIds: string[];                            // UNCHANGED: internal reference to ReceivingItems

  // [NEW] Totals extended
  totalAmountIDR: number;                       // NEW: sum of line.totalIDR (replaces totalTimberNetIDR as print total)
  terbilang: string;                            // NEW: amount in words (UPPERCASE Indonesian)
  totalTallyVolumeM3: number;                   // UNCHANGED
  totalTallyPieces: number;                     // UNCHANGED
  totalTimberGrossIDR: number;                  // UNCHANGED
  totalTimberPphIDR: number;                    // UNCHANGED
  totalTimberNetIDR: number;                    // UNCHANGED

  // [NEW] Optional notes field matching "ket" (keterangan) on physical form
  notes?: string;                               // Expanded role: "ket" field on form

  // Workflow (unchanged)
  status: PaymentFormStatus;
  issuedAt?: string;
  paidAt?: string;
  invoiceNumber?: string;
  paymentDate?: string;
  paymentMethod?: string;

  createdAt: string;
  updatedAt: string;
}
```

### 13.2 Line Item Structure Refactored

```ts
// [REVISED] Line item now matches physical form 6-column table
export type LineItemUnit = 'm³' | 'batang' | 'rit' | 'lain-lain';

export interface PaymentFormLineItem {
  id: string;                           // NEW: stable client-side id for list keying
  paymentFormId: string;                // NEW: FK upward
  itemSequence: number;                 // NEW: ordering within form

  // Physical form columns (6 data columns)
  kategori: string;                     // NEW: Kategori akuntansi (e.g. "Pembelian Kayu", "Biaya Ongkir", free text with suggestions)
  konten: string;                       // NEW: Konten (SKSHHK number + wood species, free text)
  tujuan: string;                       // NEW: Tujuan — supplier name/address (free text, not FK-locked)
  hargaSatuanIDR: number;               // RENAMED from timberPricePerM3 (more generic)
  jumlah: number;                       // RENAMED from tallyVolumeM3 (unit-agnostic)
  unit: LineItemUnit;                   // NEW: unit of jumlah
  totalIDR: number;                     // COMPUTED: hargaSatuanIDR * jumlah

  // Optional reference back to source record (for traceability)
  sourceRecordId?: string;              // NEW: optional WoodReceivingRecord.id reference
  sourceItemId?: string;                // NEW: optional ReceivingItem.id reference

  notes?: string;
}
```

### 13.3 AppSettings Addition

```ts
export interface AppSettings {
  // ...existing fields
  companyName: string;                  // NEW: default "PT. BRILLIANT JAYA WOOD INDUSTRY"
}
```

### 13.4 New Pure Helper — Terbilang (`src/utils/terbilang.ts`)

```ts
/**
 * Converts a numeric amount to Indonesian words (UPPERCASE).
 * Zero-dependency implementation using standard Indonesian number conventions.
 *
 * @param amount - Numeric amount (can have decimal for sen; "koma" format used per Q7c)
 * @returns Uppercase string suffixed with "RUPIAH"
 *
 * @example
 * terbilang(50000000) → "LIMA PULUH JUTA RUPIAH"
 * terbilang(50000000.75) → "LIMA PULUH JUTA KOMA TUJUH PULUH LIMA RUPIAH"
 * terbilang(0) → "NOL RUPIAH"
 * terbilang(1234567) → "SATU JUTA DUA RATUS TIGA PULUH EMPAT RIBU LIMA RATUS ENAM PULUH TUJUH RUPIAH"
 */
export function terbilang(amount: number): string
```

**Capitalization:** UPPERCASE (per Q7a).
**Suffix:** auto-append `" RUPIAH"` (per Q7b).
**Precision:** uses `"KOMA"` format for decimals (per Q7c, e.g. `"KOMA TUJUH PULUH LIMA RUPIAH"` for `.75`).

### 13.5 Status Workflow — No Change

Status transitions DRAFT → ISSUED → PAID → VOID remain unchanged. **5 signature slots on print are template-only; no approval tracking per role per Q5=A.**

### 13.6 Print Layout — Full Rewrite

`PrintPaymentFormModal.tsx` rewritten to match physical form layout:

```
┌──────────────────────────────────────────────────────────────────┐
│                    请款单 / LEMBAR TAGIHAN                       │
│          PT. BRILLIANT JAYA WOOD INDUSTRY                        │
│                              N° [018532]                         │
│  年 [2026] Tahun  月 [10] Bulan  日 [22] Tanggal                 │
├────────────────┬──────────┬──────────┬──────────┬──────────┬────┤
│ 项目 kategori  │ 内容     │ 单价     │ 数量     │ 金额          │
│                │ konten   │ Harga sat│ jumlah   │ total         │
│                │ 劲贷理由 │ (rupiah) │          │ (rupiah)      │
│                │ Tujuan   │          │          │               │
├────────────────┼──────────┼──────────┼──────────┼──────────┼────┤
│ [kategori]     │ [konten] │ [harga]  │ [jumlah  │ [total]       │
│                │ [tujuan] │          │  unit]   │               │
│ ...            │ ...      │ ...      │ ...      │ ...           │
├────────────────┴──────────┴──────────┴──────────┴──────────┴────┤
│ 金额大写 / terbilang: [TERBILANG UPPERCASE RUPIAH]              │
│ 备注 / ket: [notes]                                              │
├────────────────┬──────────────┬──────────┬──────────┬──────────┤
│ 总经理         │ 资金         │ 财务     │ 部门     │ 经办人   │
│ manager umum   │ finance      │ kepala   │ kepala   │ pembuat  │
│                │              │ akuntan  │ dep.     │          │
│ _____________  │ ___________  │ _______  │ _______  │ _______  │
└────────────────┴──────────────┴──────────┴──────────┴──────────┘
```

**Signature slots:** underscore lines only; no name/timestamp populated by system (per Q5=A).

### 13.7 Verification Checklist Addendum (Section 12.X)

Append to Section 12:

```bash
# 12.10 Lembar Tagihan Refactor Compliance

# AppSettings has companyName
grep -c "companyName" src/types/index.ts
# EXPECT: >= 1

# PaymentForm has preprintedNumber + issueDate + terbilang + lines
grep -cE "preprintedNumber|issueDate|terbilang:" src/types/index.ts
# EXPECT: >= 3

# LineItemUnit enum defined
grep -c "export type LineItemUnit" src/types/index.ts
# EXPECT: 1

# PaymentFormLineItem has 6 physical form columns
grep -cE "kategori:|konten:|tujuan:|hargaSatuanIDR:|jumlah:|unit:" src/types/index.ts
# EXPECT: >= 6

# Terbilang helper exists
grep -c "export function terbilang" src/utils/terbilang.ts
# EXPECT: 1

ls test/terbilang.test.ts
# EXPECT: file exists

# Print modal uses company name from settings (not hardcoded)
grep -c "companyName" src/components/payment-forms/PrintPaymentFormModal.tsx
# EXPECT: >= 1

# Pre-printed number is user input, not auto-generated
grep -c "preprintedNumber" src/components/payment-forms/
# EXPECT: >= 2 (input field + display)
```
