# ADR-0017: Payment Form Totals — Source of Truth per Status

**Date:** 2026-10-28
**Status:** Accepted
**Deciders:** Owner + AI pair session

---

## Context

`PaymentFormTotalsFooter` membaca 5 angka agregat dari `form` prop:
`totalTallyPieces`, `totalTallyVolumeM3`, `totalTimberGrossIDR`,
`totalTimberPphIDR`, `totalTimberNetIDR`.

Saat ini semua nilai ini berasal dari DB snapshot (`activeForm`), terlepas dari
apakah form sedang diedit atau tidak. Ini menyebabkan footer menampilkan angka
stale saat operator mengedit baris tagihan di `LineItemEditor` tapi belum klik
"Simpan Perubahan".

Ada juga inconsistency partial fix di `PaymentFormDetailView` line 156 yang hanya
override `totalAmountIDR` dari `computeFormTotals(lines)` tapi membiarkan 4 field
lain tetap dari DB snapshot.

---

## Decision

**Source of truth untuk totals footer dibedakan berdasarkan status form:**

### Form DRAFT (dapat diedit)
- Source of truth: **`computeFormTotals(lines)`** — dihitung real-time dari
  `lines` React state setiap render
- Rationale: `lines` adalah state yang selalu up-to-date dengan apa yang dilihat
  operator di `LineItemEditor`. Footer harus selalu sinkron dengan editor.
- `isDirty` flag ditambahkan untuk membedakan "preview belum disimpan" vs
  "sudah tersimpan di DB"

### Form ISSUED / PAID / VOID (read-only)
- Source of truth: **DB snapshot** (`activeForm`) — tidak berubah
- Rationale: Form terkunci tidak bisa diedit. DB snapshot adalah truth final
  yang harus ditampilkan untuk konsistensi historis dan audit trail.

---

## Consequences

### Positive
- Footer DRAFT selalu sinkron dengan editor — tidak ada stale display
- Operator mendapat feedback real-time tentang dampak finansial setiap perubahan baris
- Badge "Belum Disimpan" memberikan transparansi status data
- Tidak ada perubahan API, DB, atau type SSOT — murni UI layer

### Negative / Trade-offs
- `computeFormTotals(lines)` dipanggil setiap render `PaymentFormDetailView`
  — overhead minimal (pure function, O(n) baris, biasanya < 20 baris)
- Footer DRAFT dan footer ISSUED/PAID dibaca dari sumber berbeda — developer
  harus aware tentang split ini saat debugging

---

## Rejected Alternatives

### A: Selalu baca dari DB (behavior saat ini)
**Rejected:** Menyebabkan stale display saat DRAFT, membingungkan operator.

### B: Selalu hitung real-time dari lines (termasuk untuk ISSUED/PAID)
**Rejected:** Form ISSUED/PAID tidak punya `lines` state yang diedit.
`activeForm.lines` dari DB sudah benar — tidak perlu re-compute.

### C: Auto-save setiap perubahan baris
**Rejected:** Over-engineered untuk kebutuhan ini. Menambah network calls dan
kompleksitas state management. Operator sudah punya tombol "Simpan Perubahan"
yang eksplisit.

---

## References

- Spec: `docs/superpowers/specs/2026-10-28-payment-form-realtime-totals-design.md`
- Plan: `docs/superpowers/plans/2026-10-28-fix-payment-form-realtime-totals.md`
