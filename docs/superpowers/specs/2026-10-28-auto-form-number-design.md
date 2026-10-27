# Design Spec: Auto-Generated Form Number (KWT-YYYYMM-NNNN)

**Document:** `docs/superpowers/specs/2026-10-28-auto-form-number-design.md`  
**Date:** 2026-10-28  
**Status:** Accepted — In Progress  
**Related Plan:** `docs/superpowers/plans/2026-10-28-auto-form-number.md`  
**Related ADR:** ADR-0016 (Auto-Generated Form Number, supersedes ADR-0006)  
**Architecture:** Replace manual physical carbon-book serial input with system auto-generation formatted as `KWT-YYYYMM-NNNN` upon transition to `ISSUED`. Zero schema change; UI converts to read-only badge.

---

## 1. Executive Summary & Problem Statement

### 1.1 Context

In ADR-0006, form numbers (`preprintedNumber`) were captured via manual user input matching serial numbers printed on physical carbon-copy kwitansi books (e.g. `018532`).
The business has now migrated completely away from pre-printed physical books to make the system the single source of truth for payment forms and receipts.

### 1.2 Problem

Manual number input introduces data entry burden, potential typos, duplicate serial entries, and unnecessary UI friction during the issuance flow (`IssueFormModal`).

### 1.3 Business Requirements

1. **Auto-Generation:** When transitioning a `PaymentForm` from `DRAFT` to `ISSUED`, the system must automatically generate a sequential identifier formatted as `KWT-YYYYMM-NNNN`.
2. **Monthly Scope:** Sequence (`NNNN`) starts at `0001` per tenant and per issuance month (`YYYYMM` derived from `issueDate`).
3. **Audit Trail Persistence:** `VOID` forms do not release or recycle their assigned sequence number.
4. **Idempotency & Backward Compatibility:** Existing historical forms with manual numbers (e.g., `'018532'`) or forms that have already been issued retain their existing number without overwrite.
5. **UI Ergonomics:** Remove manual text input from `IssueFormModal`. Display a clear, read-only preview indicating automatic generation.

### 1.4 Non-Goals

- No database schema migration (column `preprinted_number TEXT NOT NULL DEFAULT ''` is preserved).
- No global cross-tenant sequence generator (scoping is per tenant, per month).
- No back-fill or rewriting of historical legacy forms.

---

## 2. Technical Design & Data Contracts

### 2.1 SSOT Types (`src/types/index.ts`)

Field `preprintedNumber` on `PaymentForm` is retained as a string:
- `''` while status is `DRAFT`.
- `KWT-YYYYMM-NNNN` once status transitions to `ISSUED`.

```ts
export interface PaymentForm {
  id: string;
  preprintedNumber: string; // Auto-generated at ISSUED: "KWT-YYYYMM-NNNN" (ADR-0016). Empty string while DRAFT.
  // ...
}
```

### 2.2 Sequence Generation Algorithm (`src/persistence/sqlite/payment-form-queries.ts`)

```sql
SELECT COALESCE(MAX(CAST(SUBSTR(preprinted_number, ?) AS INTEGER)), 0) + 1 AS next_seq
FROM payment_forms
WHERE tenant_id = ?
  AND preprinted_number LIKE ?
  AND status != 'VOID'
```

- Prefix: `KWT-{YYYYMM}-` where `YYYYMM` is parsed from `issueDate.slice(0, 7).replace('-', '')`.
- SUBSTR offset: `prefix.length + 1` (SQLite 1-indexed, e.g. 12 for length 11).
- Padded with 4 digits (`padStart(4, '0')`).

### 2.3 Status Transition Logic

In `updatePaymentFormStatus`:
1. Validate `issueDate` is provided and non-empty.
2. If `targetStatus === 'ISSUED'` and `!existing.preprintedNumber.trim()`, execute `generateFormNumber(db, tenantId, issDate)`.
3. If already populated, preserve `existing.preprintedNumber`.

### 2.4 API Route Contract (`app/api/payment-forms/[id]/status/route.ts`)

- Stop reading `body.preprintedNumber`.
- Only `issueDate`, `invoiceNumber`, `paymentDate`, `paymentMethod`, and `notes` are processed from payload.

### 2.5 UI Modal Contract (`src/components/payment-forms/IssueFormModal.tsx`)

- Remove `useState` for `preprintedNumber`.
- Remove manual text input and client-side validation for `preprintedNumber`.
- Display informative read-only badge indicating "Akan di-generate otomatis" (or existing number if re-opened).
- `onConfirm` payload only submits `{ issueDate: string }`.

---

## 3. Acceptance Criteria & Verification

1. **Drift Check:** `npm run drift:check` passes with 0 violations.
2. **Unit & Integration Tests:** `npm test` passes with 0 failures.
3. **Format Assertion:** ISSUED forms have `preprintedNumber` matching regex `/^KWT-\d{6}-\d{4}$/`.
4. **Sequence Increment:** Sequential issuance within the same month increments `NNNN` monotonically (`0001`, `0002`, ...).
5. **Build:** `npm run build:check` compiles with 0 errors.
