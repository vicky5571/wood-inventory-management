# ADR-0006: Pre-printed Form Number — Manual User Input (Not Auto-Generated)

**Date:** 2026-10-22
**Status:** Accepted
**Deciders:** Owner + AI pair session (client Q1=A confirmed via physical form reference)

---

## Context

Original PaymentForm spec (`2026-10-21-weekly-payment-form-design.md`) specified system-generated form numbers using pattern `PAY-YYYY-W<week>-<supplier>-<species>-<seq>` (e.g. `PAY-2026-W42-PTA-JATI-01`).

After client provided physical form reference on 2026-10-22, we learned:

- Client uses pre-printed **carbon copy books** (buku kwitansi) with serial numbers printed by the print shop (e.g. `N° 018532`).
- Each physical form has a unique serial number assigned at printing time, before any content is written.
- Operators tear off the carbon copy after filling it; the serial is physical evidence of the document.
- Serial numbers are the **primary human reference** for the form in business communications ("tolong proses tagihan 018532").
- Auto-generated system numbers would create **two parallel numbering schemes**, confusing operators and finance.

---

## Decision

**Form numbers are user-input text, captured from the physical carbon book serial. No system auto-generation.**

```ts
export interface PaymentForm {
  id: string;                           // Internal UUID (hidden from users)
  preprintedNumber: string;             // User-input from physical book (e.g. "018532")
  // ...
}
```

### Behavior

- **On DRAFT creation (via `/generate` endpoint):** `preprintedNumber` is empty string.
- **On ISSUE transition:** `preprintedNumber` is **required** (reject empty); operator must have physically torn the form and knows the serial.
- **UI label:** `"No. Kwitansi Buku"` (not `"Form ID"` or `"Nomor Form"`).
- **No validation of format or uniqueness enforcement:**
  - Format: whatever the print shop uses (digits, prefixes, length varies).
  - Uniqueness: **soft warning only** if duplicate detected within tenant (operator decides — maybe the form was voided and reissued with same number).

### What Is Deleted

- `src/utils/payment-form-number.ts` — the auto-numbering helper
- `test/payment-form-numbering.test.ts` — associated tests
- Form number collision/sequence logic — no longer applicable

---

## Rejected Alternatives

### Alternative A: Keep auto-generation + add optional preprintedNumber field
**Rejected because:**
- Two numbering schemes creates ambiguity: "which number do I quote in a payment reminder?"
- Finance workflows reference the physical serial exclusively.
- Doubles the data model for zero gain — auto-generated numbers would be write-only garbage.
- Operators would ignore auto-generated numbers, making them meaningless.

### Alternative B: User selects from pre-populated range of serial numbers
**Rejected because:**
- Requires operators to pre-register entire buku kwitansi into system before use (friction).
- Doesn't match reality: operators tear forms as needed; registration overhead rejected.
- Serial books come from print shop sporadically; no stable range to pre-register.

### Alternative C: Scan barcode/QR from physical form
**Rejected because:**
- Physical forms have no barcodes (just printed serial text).
- Would require redesigning the carbon books (upstream dependency on print shop).
- Over-engineered for a manual data entry task.

---

## Consequences

### Positive
- **System matches physical reality.** Operators enter the number they see on the paper.
- **Zero ambiguity in business communications** — "018532" is unambiguous.
- **Simpler codebase** — deleted ~180 LOC of numbering logic + tests.
- **Flexible format** — handles whatever the print shop prints (new serial format = no code change).
- **Reduced sync risk** — no concern about auto-generated numbers drifting from physical book sequence.

### Negative / Trade-offs
- **Data entry burden on operator** — must type the serial accurately. Typos break traceability.
  - Mitigation: UI shows large, clear input field. On ISSUE, operator reviews before committing.
- **No duplicate prevention at DB level** — operator could accidentally use the same serial twice.
  - Mitigation: soft warning in UI when duplicate detected within tenant. Hard enforcement rejected because voided+reissued forms legitimately reuse serials.
- **Cannot pre-generate forms before physical book is available** — operator must have the physical book in hand to issue.
  - Mitigation: DRAFT state allows all preparation except ISSUE; ISSUE only requires serial entry at the moment of tearing the form.
- **No validation of serial format** — garbage input accepted.
  - Mitigation: UI placeholder shows example format ("018532"). Trust operator judgment; this matches paper form behavior.

### Follow-up Obligations
- If client eventually migrates away from carbon books (e.g. digital-only forms), revisit this ADR and consider auto-generation.
- If duplicate serial errors become operationally common, consider adding tenant-level unique constraint with explicit "void previous" workflow.
- Activity log must capture `preprintedNumber` in `PAYMENT_FORM_ISSUED` entries for audit trail (plan Phase 10).

---

## References

- Spec: `docs/superpowers/specs/2026-10-21-weekly-payment-form-design.md` Section 13 (revision log)
- Plan: `docs/superpowers/plans/2026-10-22-refactor-payment-form-to-lembar-tagihan.md`
- Related: ADR-0003 (loose string linkage for contract numbers — similar philosophy of trusting operator data entry over strict system enforcement)
- Physical form reference: PT. Brilliant Jaya Wood Industry `LEMBAR TAGIHAN / 请款单` serial `N° 018532`
