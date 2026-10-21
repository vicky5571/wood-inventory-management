# ADR-0007: Terbilang (Amount-in-Words) — Zero-Dependency Internal Implementation

**Date:** 2026-10-22
**Status:** Accepted
**Deciders:** Owner + AI pair session

---

## Context

Indonesian financial documents (invoices, kuitansi, lembar tagihan) traditionally include an amount-in-words field called **"terbilang"** below the numeric total. This serves as:

- **Fraud prevention** — words are harder to alter than digits.
- **Legal convention** — expected on formal payment documents in Indonesia.
- **Human readability** — reduces risk of misreading digit grouping.

The physical `LEMBAR TAGIHAN` form from PT. Brilliant Jaya Wood Industry has a dedicated row: `金额大写 terbilang:` requiring this value.

Several npm packages exist for Indonesian terbilang conversion:
- `terbilang` (various forks)
- `number-to-words-id`
- `indonesia-angka-terbilang`

Project invariants (`AGENTS.md`): **"Standard library and native platform features precede new dependencies."**

---

## Decision

**Implement terbilang conversion as a zero-dependency pure function in `src/utils/terbilang.ts`.**

```ts
/**
 * Converts a numeric amount to Indonesian words (UPPERCASE + "RUPIAH" suffix).
 * @param amount - Numeric value, can have up to 2 decimal places
 * @returns UPPERCASE string with "RUPIAH" suffix, "KOMA" format for decimals
 */
export function terbilang(amount: number): string
```

### Output Format (per client Q7)

- **Capitalization:** UPPERCASE (Q7a=C)
- **Suffix:** Auto-append `" RUPIAH"` (Q7b=A)
- **Decimal format:** `"KOMA <digit words>"` (Q7c=C)
  - Example: `50_000_000.75` → `"LIMA PULUH JUTA KOMA TUJUH PULUH LIMA RUPIAH"`
- **Zero:** `"NOL RUPIAH"`
- **Negative:** `"MINUS <value>"` (clamped/thrown is implementation detail; plan specifies MINUS prefix)

### Algorithm (Outline)

1. **Separate integer and decimal parts.**
2. **Convert integer part** via recursive grouping:
   - Base words: `['', 'SATU', 'DUA', 'TIGA', 'EMPAT', 'LIMA', 'ENAM', 'TUJUH', 'DELAPAN', 'SEMBILAN']`
   - Special cases: `'SEBELAS'` (11), `'SEPULUH'` (10), `'SERATUS'` (100), `'SERIBU'` (1000)
   - Groups: ribuan (10³), jutaan (10⁶), miliar (10⁹), triliun (10¹²)
3. **Convert decimal part** by spelling each digit after `"KOMA"`.
4. **Combine** → UPPERCASE → append `" RUPIAH"`.

### Test Coverage (plan Phase 2)

14 test cases covering: zero, singles, teens (11-19), tens, hundreds, thousands, millions, billions, trillions, decimals, negatives.

---

## Rejected Alternatives

### Alternative A: Use npm package `terbilang` or similar
**Rejected because:**
- Violates project YAGNI invariant and "stdlib precedes dependency" rule in `AGENTS.md`.
- Adds a dependency for ~150 LOC of pure logic that is well-specified and testable.
- NPM supply chain risk — any dependency can be hijacked or deprecated.
- Published packages vary in quality: some don't handle decimals, some incorrectly spell numbers like 11 (`"SEPULUH SATU"` instead of `"SEBELAS"`).
- Project already enforces zero-dependency pattern (`node:sqlite`, `node:test`, zero Supabase SDK — direct fetch).

### Alternative B: Use Intl.NumberFormat with words
**Rejected because:**
- JavaScript `Intl.NumberFormat` does not support word output ("words" style in `format()` is not standardized).
- Indonesian locale support is partial and does not include terbilang-style conversion.

### Alternative C: Generate on backend via SQL / Postgres function
**Rejected because:**
- Would couple presentation logic to DB layer.
- Pure function in TypeScript is testable, portable, and runs client-side for immediate preview.
- SQLite does not have equivalent capabilities for this pattern.

### Alternative D: Leave as free-text input, user types manually
**Rejected because:**
- Error-prone (users mistype or forget to update when amount changes).
- Defeats the purpose of fraud prevention (if human types freely, mismatches with number are more likely).
- Client Q7 explicitly requested auto-generation with override capability.

---

## Consequences

### Positive
- **Zero npm dependency** — honors project invariant.
- **Comprehensive test coverage** — 14+ test cases ensure correctness.
- **Fast execution** — pure function, no I/O, no async.
- **Portable** — runs in Node.js (API, tests) and browser (print preview, live edit).
- **Full control over output format** — matches client specification exactly.
- **No supply chain risk** — code is in-repo and reviewed.
- **Reusable** — can be used in future documents (invoices, receipts, salary slips).

### Negative / Trade-offs
- **Implementation and maintenance burden** — ~150 LOC to write and maintain.
  - Mitigation: Indonesian number conventions are stable; this code should rarely change.
- **Risk of implementation bugs** — missing edge cases could produce wrong words.
  - Mitigation: comprehensive test suite in plan Phase 2 (14 cases) with explicit edge cases.
- **No native handling of extremely large numbers** (quadrillion/kuadriliun and beyond).
  - Mitigation: triliun ceiling is sufficient for all realistic business transactions (1 trillion rupiah is ~$65M USD). If needed later, trivial to extend array.
- **User override capability** must be built in UI** (per Q7 — "editable")**.
  - Mitigation: Form UI has terbilang display with "Edit" toggle; on manual edit, auto-recalculation is suppressed until user clicks "Reset to Auto".

### Follow-up Obligations
- If other forms (sales invoices, salary slips) need terbilang, reuse this function.
- If client requests different capitalization (sentence case, title case), add format option parameter without breaking existing calls.
- If translation to Chinese amount-in-words (大写金额) becomes needed, create separate module `terbilang-zh.ts` with same signature pattern.

---

## References

- Spec: `docs/superpowers/specs/2026-10-21-weekly-payment-form-design.md` Section 13.4
- Plan: `docs/superpowers/plans/2026-10-22-refactor-payment-form-to-lembar-tagihan.md` Phase 2
- Related: ADR-0001 (dual-mode persistence — same zero-dependency philosophy applied to Supabase client)
- Project invariant: `AGENTS.md` — "Standard library and native platform features precede new dependencies"
