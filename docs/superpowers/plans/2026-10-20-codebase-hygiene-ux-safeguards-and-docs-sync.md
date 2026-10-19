# Codebase Hygiene, UX Safeguards & Documentation Alignment Implementation Plan (P2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the 9 stale `.js` shadow files in `src/`, protect destructive UI actions (`Reset Demo`, `Hapus Semua Log`, `Reset Log Awal`) with `<ConfirmDialog />` while keeping `⚡ Isi Cepat (Dev)` enabled in production, and synchronize `AGENTS.md` and `docs/architecture-system-invariants.md` with the Next.js 15 + React 19 + Tailwind CSS + SQLite/Supabase stack.

**Architecture:** Enforce pure TypeScript module resolution across `src/` by deleting untracked/stale `.js` duplicates and locking the invariant with a regression test; replace unconfirmed or `window.confirm()` destructive actions with the existing `<ConfirmDialog />` component; and update core architecture documentation.

**Tech Stack:** Node.js 26.8.1 (Native ESM), Next.js 15.1.0, React 19, Tailwind CSS 3.4, TypeScript 5.7, Node.js Native Test Runner (`node:test` + `node:assert/strict`).

**Spec:** [docs/superpowers/specs/2026-10-20-codebase-hygiene-ux-safeguards-and-docs-sync-design.md](file:///Users/mac/Web%20Development/wood-inventory-management/docs/superpowers/specs/2026-10-20-codebase-hygiene-ux-safeguards-and-docs-sync-design.md)

## Global Constraints
- Single Source of Truth (SSOT): All domain types must be imported from `src/types/index.ts`.
- Preserve `⚡ Isi Cepat (Dev)` in Production: Do NOT gate or remove `handleQuickFill` / `⚡ Isi Cepat (Dev)` in `RecordModal.tsx` or `SalesModal.tsx`.
- Preserve Legacy `.ts` Modules Tested by Suite: Keep `src/app.ts`, `src/components/kpi-dashboard.ts`, `src/components/record-modal.ts`, `src/components/record-table.ts`, and `src/persistence/record-repository.ts` intact so existing unit tests pass.
- File Size Limit: Keep modified pages (`app/ledger/page.tsx`, `app/activity/page.tsx`) under 250 lines.
- Language Standard: Code, comments, tests, and commit messages strictly in English.

---

### Task 1: Remove Duplicate `.js` Shadow Files in `src/` & Lock Invariant with Test

**Files:**
- Delete: `src/app.js`
- Delete: `src/components/kpi-dashboard.js`
- Delete: `src/components/record-modal.js`
- Delete: `src/components/record-table.js`
- Delete: `src/persistence/record-repository.js`
- Delete: `src/persistence/seed-data.js`
- Delete: `src/persistence/storage.js`
- Delete: `src/utils/calculator.js`
- Delete: `src/utils/timber-calc.js`
- Create: `test/codebase-hygiene.test.ts`

- [x] **Step 1: Write the failing test (`test/codebase-hygiene.test.ts`)**

```typescript
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function collectJsFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectJsFiles(fullPath, acc);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      acc.push(path.relative(process.cwd(), fullPath));
    }
  }
  return acc;
}

test('Codebase TypeScript Hygiene & Dev Quick-Fill Availability Suite', async (t) => {
  await t.test('src/ contains zero legacy .js shadow files', () => {
    const srcDir = path.resolve(process.cwd(), 'src');
    const jsFiles = collectJsFiles(srcDir);
    assert.deepEqual(
      jsFiles,
      [],
      `Expected 0 .js shadow files in src/, found: ${jsFiles.join(', ')}`
    );
  });

  await t.test('RecordModal and SalesModal keep Isi Cepat (Dev) button unconditionally available in production', () => {
    const recordModal = fs.readFileSync(path.resolve(process.cwd(), 'src/components/ledger/RecordModal.tsx'), 'utf-8');
    const salesModal = fs.readFileSync(path.resolve(process.cwd(), 'src/components/sales/SalesModal.tsx'), 'utf-8');

    assert.match(recordModal, /Isi Cepat \(Dev\)/);
    assert.doesNotMatch(recordModal, /NODE_ENV\s*!==\s*['"]production['"]/);
    assert.match(salesModal, /Isi Cepat \(Dev\)/);
    assert.doesNotMatch(salesModal, /NODE_ENV\s*!==\s*['"]production['"]/);
  });
});
```

- [x] **Step 2: Run test to confirm it fails (lists the 9 `.js` files)**
  - Run: `node --test test/codebase-hygiene.test.ts`

- [x] **Step 3: Delete the 9 `.js` shadow files in `src/`**

- [x] **Step 4: Run targeted test and legacy coordinator tests to verify 0 regressions**
  - Run: `node --test test/codebase-hygiene.test.ts test/app-coordinator.test.ts test/record-modal.test.ts test/storage-crud.test.ts`

---

### Task 2: Safeguard Destructive Actions (`Reset Demo` & Activity Log Actions) with `<ConfirmDialog />`

**Files:**
- Modify: `app/ledger/page.tsx`
- Modify: `app/activity/page.tsx`
- Modify: `test/confirm-dialog.test.ts`
- Modify: `test/activity-view.test.ts`

**Behavior:**
- In `app/ledger/page.tsx` (keeping total LOC `< 250`):
  - Add `const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);`.
  - Pass `onResetDemo={() => setIsResetConfirmOpen(true)}` to `<Toolbar />`.
  - Render `<ConfirmDialog />` for `isResetConfirmOpen` with title `"Reset Data Demo? (确认重置演示数据)"`, destructive styling, and `onConfirm={() => { handleResetDemo(); setIsResetConfirmOpen(false); }}`.
- In `app/activity/page.tsx` (keeping total LOC `< 250`):
  - Import `ConfirmDialog` from `@/src/components/ui/ConfirmDialog`.
  - Replace `window.confirm(...)` in `handleClear` with state `const [pendingConfirmAction, setPendingConfirmAction] = useState<'CLEAR' | 'RESET' | null>(null);` and a `<ConfirmDialog />` that gates both `clearLogs()` and `resetLogs()`.

- [x] **Step 1: Add failing assertions to `test/confirm-dialog.test.ts` and `test/activity-view.test.ts`**

```typescript
// In test/confirm-dialog.test.ts:
await t.test('LedgerPage gates Reset Demo behind ConfirmDialog', () => {
  const ledgerPage = fs.readFileSync(path.resolve(process.cwd(), 'app/ledger/page.tsx'), 'utf-8');
  assert.match(ledgerPage, /isResetConfirmOpen/, 'LedgerPage must track isResetConfirmOpen state');
  assert.match(ledgerPage, /Reset Data Demo\?/, 'LedgerPage must render ConfirmDialog for Reset Demo');
});

// In test/activity-view.test.ts:
await t.test('ActivityPage uses ConfirmDialog instead of native browser confirm()', () => {
  const activityPage = fs.readFileSync(path.resolve(process.cwd(), 'app/activity/page.tsx'), 'utf-8');
  assert.doesNotMatch(activityPage, /\bconfirm\s*\(/, 'ActivityPage must not call native browser confirm()');
});
```

- [x] **Step 2: Run targeted tests to confirm failure**
  - Run: `node --test test/confirm-dialog.test.ts test/activity-view.test.ts`

- [x] **Step 3: Implement `<ConfirmDialog />` safeguards in `app/ledger/page.tsx` and `app/activity/page.tsx`**

- [x] **Step 4: Run targeted tests and verify 0 failures**
  - Run: `node --test test/confirm-dialog.test.ts test/activity-view.test.ts`

---

### Task 3: Synchronize `AGENTS.md` and `docs/architecture-system-invariants.md` with Current Architecture

**Files:**
- Modify: `AGENTS.md`
- Modify: `docs/architecture-system-invariants.md`
- Modify: `test/codebase-hygiene.test.ts`

**Behavior:**
- Update `AGENTS.md` line 12 (`Tech Stack`) to accurately reflect:
  - `Node.js 26.8.1 (Native ESM & TypeScript), Next.js 15 (App Router) & React 19, Tailwind CSS + CSS Custom Properties (Design Tokens), Optimistic LocalStorage / IndexedDB with Dual-Mode Server Persistence (Supabase PostgREST & Node.js native node:sqlite), Node.js Native Test Runner (node:test + node:assert/strict).`
- Update `docs/architecture-system-invariants.md` Sections 1.1, 2, and 3 to reflect Next.js 15 App Router, React 19, Tailwind CSS, `v_buku_besar_flat` relational projection, and the 3-tier persistence flow (`Client Hook & LocalStorage/IndexedDB Cache` → `Next.js API Route Handlers` → `Supabase PostgREST / Local SQLite`).

- [x] **Step 1: Add documentation alignment check to `test/codebase-hygiene.test.ts`**

```typescript
await t.test('AGENTS.md and architecture-system-invariants.md accurately document Next.js 15, React 19, and SQLite/Supabase stack', () => {
  const agentsMd = fs.readFileSync(path.resolve(process.cwd(), 'AGENTS.md'), 'utf-8');
  const archMd = fs.readFileSync(path.resolve(process.cwd(), 'docs/architecture-system-invariants.md'), 'utf-8');

  assert.match(agentsMd, /Next\.js 15/);
  assert.match(agentsMd, /React 19/);
  assert.match(archMd, /Next\.js/);
  assert.match(archMd, /node:sqlite/);
});
```

- [x] **Step 2: Run test to confirm failure**
  - Run: `node --test test/codebase-hygiene.test.ts`

- [x] **Step 3: Update `AGENTS.md` and `docs/architecture-system-invariants.md`**

- [x] **Step 4: Run targeted test and full test suite**
  - Run: `node --test test/codebase-hygiene.test.ts`
  - Run: `node --test`
