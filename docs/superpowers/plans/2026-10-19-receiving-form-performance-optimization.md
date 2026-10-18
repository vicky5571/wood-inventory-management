# Implementation Plan: Receiving Form Performance & Input Optimization

**Date:** 2026-10-19  
**Goal:** Eliminate input lag, dropped frames, and excessive re-renders in `RecordModal` and its child manifest table/combobox components while strictly maintaining all architectural invariants (< 250 LOC, zero external dependencies).  
**Diagnostic Reference:** [`docs/audit-receiving-form-performance.md`](../audit-receiving-form-performance.md)  

---

## 1. Objectives & Constraints

- **Responsiveness**: Ensure typing in any input field (especially numeric manifest inputs) maintains 60 FPS without frame drops.
- **Render Scoping**: Typing in any manifest row must ONLY re-render that specific row. Other rows and static form sections must NOT re-render.
- **Zero External Dependencies**: Use standard React primitives (`React.memo`, `useCallback`, `useDeferredValue`).
- **Architectural Invariant**: All modified files MUST strictly comply with `< 250 LOC`.
- **Backward Compatibility**: Preserve all existing props, validation rules, draft persistence keys, and event signatures.
- **Verification**: All 488 existing tests plus new performance invariant tests must pass.

---

## 2. Work Breakdown & Task Tracking

- [x] **Phase 1: Performance Test Suite & Invariant Definitions**
  - [x] Add performance regression tests in `test/receiving-form-performance.test.ts` verifying:
    - Component memoization on `ManifestItemRow`, `RecordDocumentSection`, `RecordFinancialSection`, `RecordReconciliationCard`.
    - Stable callback delegation in `ManifestItemsTable`.
    - Lightweight supplier repository access in `SupplierCombobox` without `useSuppliers` analytics overhead.
    - `useDeferredValue` integration in `RecordModal`.
    - `< 250 LOC` compliance on all touched files.

- [x] **Phase 2: SupplierCombobox Decoupling & Optimization**
  - [x] Modify `src/components/ledger/SupplierCombobox.tsx`:
    - Replace heavy `useSuppliers()` hook with direct `SupplierRepository` query or passed props.
    - Cache/memoize supplier options.
    - Condense file from 260 lines to `< 220 lines` (fixing the lingering LOC violation).

- [x] **Phase 3: Currency Formatter Singleton Extraction**
  - [x] Create/ensure shared singleton `idrFormatter` in `ManifestItemRow.tsx` and `RecordReconciliationCard.tsx`.
  - [x] Eliminate `new Intl.NumberFormat` instantiation from component render bodies.

- [x] **Phase 4: Component Memoization & Stable Handlers**
  - [x] Wrap `ManifestItemRow` with `React.memo`.
  - [x] Update `src/components/ledger/ManifestItemsTable.tsx`:
    - Refactor `handleUpdateItem` and `handleDeleteItem` into stable memoized callbacks (`useCallback`).
    - Pass stable per-item handlers or pass index-safe callback to prevent recreating closures.
    - Wrap `ManifestItemsTable` with `React.memo`.
  - [x] Wrap `RecordDocumentSection`, `RecordFinancialSection`, and `RecordReconciliationCard` with `React.memo`.

- [x] **Phase 5: RecordModal State Optimization & useDeferredValue**
  - [x] Update `src/components/ledger/RecordModal.tsx`:
    - Remove the secondary `useEffect` that synchronizes `form` back to `items[0]`.
    - Derive primary item values at `handleSubmit` rather than continuously mutating `form` state on keystrokes in row 0.
    - Wrap `preview` calculation in `useDeferredValue` so rapid keystrokes remain instantaneous.
    - Ensure `RecordModal.tsx` remains strictly `< 250 LOC`.

- [x] **Phase 6: Verification & Build Validation**
  - [x] Run targeted tests: `node --test test/receiving-form-performance.test.ts`, `node --test test/record-modal.test.ts`, `node --test test/manifest-items-table.test.ts`.
  - [x] Run full test suite: `npm test` (all 488 tests passing).
  - [x] Run production build: `npm run build:check` (0 errors).
  - [x] Commit changes with clear atomic commit message.
