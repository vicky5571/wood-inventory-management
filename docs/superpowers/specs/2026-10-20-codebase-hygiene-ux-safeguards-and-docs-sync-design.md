# Codebase Hygiene, UX Safeguards & Documentation Alignment Specification (P2)

- **Date:** 2026-10-20
- **Status:** Approved
- **Subsystem:** TypeScript Source Hygiene, Destructive Action Safeguards & Architectural Documentation Sync
- **Authors:** Senior Software Engineer (Pair Programmer)

---

## 1. Problem Statement & Root Cause Analysis

### 1.1 Stale Duplicate `.js` Shadow Files in `src/`
Following the TypeScript Core Modernization (`2026-10-15-typescript-core-modernization.md`), 9 legacy `.js` files were left alongside their canonical `.ts` counterparts:
- `src/app.js` (shadows `src/app.ts`)
- `src/components/kpi-dashboard.js` (shadows `src/components/kpi-dashboard.ts`)
- `src/components/record-modal.js` (shadows `src/components/record-modal.ts`)
- `src/components/record-table.js` (shadows `src/components/record-table.ts`)
- `src/persistence/record-repository.js` (shadows `src/persistence/record-repository.ts`)
- `src/persistence/seed-data.js` (shadows `src/persistence/seed-data.ts`)
- `src/persistence/storage.js` (shadows `src/persistence/storage.ts`)
- `src/utils/calculator.js` (shadows `src/utils/calculator.ts`)
- `src/utils/timber-calc.js` (shadows `src/utils/timber-calc.ts`)

**Impact**: Under Node.js ESM and bundler resolution rules, extensionless or relative imports in Next.js/Webpack can accidentally resolve stale `.js` files instead of updated `.ts` modules, causing silent runtime divergence. Note that the `.ts` counterparts (`src/app.ts`, `src/components/record-modal.ts`, `src/persistence/record-repository.ts`, etc.) are still actively tested by `test/app-coordinator.test.ts`, `test/record-modal.test.ts`, and `test/storage-crud.test.ts` and must be retained.

### 1.2 Unconfirmed Destructive Actions in Operational Views
- **Unguarded `Reset Demo` on Ledger (`app/ledger/page.tsx:L85-L94`, `src/components/ledger/Toolbar.tsx:L115-L125`)**:
  The `Reset Demo` button sits immediately adjacent to the primary `Input Penerimaan (新增入库)` CTA in `Toolbar.tsx`. Clicking it immediately wipes all custom receiving records in state and `localStorage` without a confirmation dialog.
- **Native Browser `confirm()` in Activity Log (`app/activity/page.tsx:L35-L39`)**:
  Clicking `Hapus Semua Log` triggers a blocking native `window.confirm(...)` dialog instead of the application's accessible bilingual `<ConfirmDialog />` component (`src/components/ui/ConfirmDialog.tsx`), and `Reset Log Awal` executes without confirmation.
- **Explicit Product Decision — Retain `⚡ Isi Cepat (Dev)` in Production**:
  Per product owner directive, the `⚡ Isi Cepat (Dev)` quick-fill buttons in `RecordModal.tsx` and `SalesModal.tsx` MUST remain available across all environments (including production builds) for rapid operator testing and demonstration workflows.

### 1.3 Architectural Documentation Drift (`AGENTS.md`, `docs/architecture-system-invariants.md`)
- Both `AGENTS.md` and `docs/architecture-system-invariants.md` still state that the application uses *"Vanilla Modern Web architecture (Native Web Components / Custom Elements) and Vanilla CSS with no utility framework dependencies"*.
- In reality, the codebase has migrated to **Next.js 15.1 (App Router), React 19, Tailwind CSS 3.4, Chart.js 4.5, SQLite (`node:sqlite`), and Supabase PostgREST**. Outdated architectural docs mislead engineers and automated coding agents.

---

## 2. Architectural Objectives & Design Decisions

1. **Eliminate All 9 Duplicate `.js` Shadow Modules**:
   - Remove the 9 `.js` files in `src/` while preserving all `.ts` and `.tsx` modules so TypeScript is the sole executable source of truth.
   - Add a codebase hygiene test (`test/codebase-hygiene.test.ts`) asserting zero `.js` files exist inside `src/`.
2. **Enforce `<ConfirmDialog />` Safeguards on Destructive Actions**:
   - **`app/ledger/page.tsx`**: Introduce `isResetConfirmOpen` state. Clicking `Reset Demo` in `<Toolbar />` opens `<ConfirmDialog isDestructive={true} ... />` explaining that current receiving records will be replaced with the 4 default demonstration records before invoking `handleResetDemo()`.
   - **`app/activity/page.tsx`**: Replace native `window.confirm()` on `Hapus Semua Log` (and guard `Reset Log Awal` if present) with `<ConfirmDialog isDestructive={true} ... />`.
   - **Preserve `⚡ Isi Cepat (Dev)`**: Keep `getQuickReceivingDraft` and `getQuickSalesDraft` triggers unconditionally rendered in `RecordModal.tsx` and `SalesModal.tsx`.
3. **Align `AGENTS.md` & `docs/architecture-system-invariants.md` with Actual Stack**:
   - Update Tech Stack and Runtime Profile sections in both files to accurately document Next.js 15 App Router, React 19, Tailwind CSS + CSS Custom Properties (`app/globals.css`), and the 3-tier persistence architecture (Optimistic `localStorage` / `IndexedDB` → Next.js API Route Handlers → Supabase PostgREST / `node:sqlite`), while keeping all engineering directives (SSOT in `src/types/index.ts`, `<250 LOC` limit, TDD with `node --test`).

---

## 3. Verification & Non-Regression Invariants

1. **Zero `.js` Shadow Files in `src/`**: Verified via automated filesystem scan in `test/codebase-hygiene.test.ts`.
2. **Line Count Invariants**: `app/ledger/page.tsx`, `app/activity/page.tsx`, `RecordModal.tsx`, and `SalesModal.tsx` must remain under their respective line limits (`< 250 LOC`).
3. **Quick-Fill Preservation**: Existing tests in `test/dev-quick-fill.test.ts` and `test/sales-components.test.ts` verifying `Isi Cepat` in `RecordModal` and `SalesModal` must continue to pass without modification.
