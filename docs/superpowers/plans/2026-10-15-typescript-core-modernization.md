# Implementation Plan: Full TypeScript Core Modernization

**Initiative:** Modernize Remaining JavaScript Modules to Strict TypeScript  
**Goal:** Transition domain utilities, repositories, and legacy coordinators to 100% strict TypeScript (`.ts`), eliminating redundant stubs and establishing type safety across all unit test suites.  
**Date:** 2026-10-15  
**Branch:** `vicky`  
**Status:** Ready to Execute  

---

## 1. Scope & Architectural Intent

The Next.js user interface (`app/` and `src/components/ledger/`, `src/components/dashboard/`, `src/components/layout/`) is already 100% React + TypeScript (`.tsx` and `.ts`). 

This modernization targets the underlying **pure domain layer**, **persistence engine**, and **legacy test harnesses** that currently reside in `.js`:

1. **`src/utils/calculator.js` -> `src/utils/calculator.ts`**: Pure mathematical calculations for volumetric ($m^3$), imperial Board Feet (BF), and timber weight estimations based on wood density.
2. **`src/persistence/record-repository.js` -> `src/persistence/record-repository.ts`**: Strict type safety on repository CRUD contracts (`WoodReceivingRecord`, `RecordFilterCriteria`, `StorageAdapter`).
3. **Stub Retirement (`timber-calc.js`, `storage.js`, `seed-data.js`)**: Direct imports from `.ts` source modules across tests, safely deprecating or removing unnecessary re-export wrappers.
4. **Legacy Vanilla DOM Coordinators (`src/app.js`, `src/components/*.js`)**: Add explicit TypeScript types for DOM element containers and callback handlers.

---

## 2. Global Constraints & Architectural Invariants

- **Single Source of Truth (SSOT):** All models must import from `src/types/index.ts`. No duplicate inline interfaces.
- **File Extension Contract:** 
  - Pure calculation, repository, storage, and coordinator files without JSX must strictly use `.ts`.
  - Only React components with JSX use `.tsx`.
- **Zero Regressions:** All 106 existing tests across 15 suites must continue passing (`npm test`).
- **Dev Server Safety:** Production build verification must use `npm run build:check` to prevent `.next` dev-cache collisions.

---

## 3. Phased Implementation Tasks

### Phase 1: Pure Domain Calculator Modernization

- [x] **Task 1.1: Migrate `src/utils/calculator.js` to `src/utils/calculator.ts`**
  - Created strongly typed `src/utils/calculator.ts` importing `VolumeCalculationResult` from `src/types/index.ts`.
  - Converted `src/utils/calculator.js` into backward-compatibility re-export stub.
  - Updated `test/smoke.test.ts` to import directly from `src/utils/calculator.ts`.
  - Verified with `node --test test/smoke.test.ts` (9/9 passing).

---

### Phase 2: Persistence & Repository Type Hardening

- [ ] **Task 2.1: Migrate `src/persistence/record-repository.js` to `src/persistence/record-repository.ts`**
  - Type repository constructor with `StorageAdapter`.
  - Type `getAll()`, `getById(id: string)`, `save(record: WoodReceivingRecord)`, `delete(id: string)`, and `filter(criteria: RecordFilterCriteria)`.
  - Verify with `test/storage-crud.test.ts` and `test/wood-record-repository.test.ts`.
- [ ] **Task 2.2: Clean Up Legacy Persistence Re-Export Stubs**
  - Update `test/storage-crud.test.ts`, `test/smoke.test.ts`, and `test/app-coordinator.test.ts` to import directly from `.ts` files.

---

### Phase 3: Legacy DOM Modules & App Coordinator Typing

- [ ] **Task 3.1: Migrate `src/components/record-modal.js` -> `.ts`**
  - Type `openRecordModal(container: HTMLElement, initialRecord: WoodReceivingRecord | null, onSave: (rec: WoodReceivingRecord) => void): void`.
- [ ] **Task 3.2: Migrate `src/components/record-table.js` & `kpi-dashboard.js` -> `.ts`**
  - Type container parameters and event listener signatures.
- [ ] **Task 3.3: Migrate `src/app.js` -> `src/app.ts`**
  - Type `AppCoordinator` class and element references (`HTMLInputElement`, `HTMLSelectElement`, etc.).
  - Verify with `test/app-coordinator.test.ts`.

---

### Phase 4: Full System Verification & Clean Build

- [ ] **Task 4.1: Run Full Node Test Suite**
  - Command: `npm test`
  - Target: 106 tests passing, 0 failures.
- [ ] **Task 4.2: Run Strict TypeScript Typecheck**
  - Command: `npx tsc --noEmit`
  - Target: 0 type errors.
- [ ] **Task 4.3: Verify Next.js Isolated Production Build**
  - Command: `npm run build:check`
  - Target: Clean build without interfering with active development server.
