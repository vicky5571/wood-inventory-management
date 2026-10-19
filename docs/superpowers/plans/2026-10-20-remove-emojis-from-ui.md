# Remove Emojis from UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all decorative emojis from the website UI across `app/` and `src/` to eliminate AI-generated placeholder aesthetics, replacing them with clean typography or SVG icons where appropriate.

**Architecture:** Audit all UI files for unicode emoji ranges, write an automated regression test in `test/no-emojis.test.ts` to detect any emoji characters in `app/` and `src/`, and update all identified files to use standard SVG icons (from `lucide-react`) or clean bilingual typography.

**Tech Stack:** Next.js 15, React 19, Lucide React, Node.js Test Runner (`node:test`, `node:assert/strict`).

**Spec:** User instruction to delete emojis from website ("delete emoji in this website, because it is ai slop").

## Global Constraints

- No emojis (`\p{Extended_Pictographic}`, U+1F000-U+1FFFF, U+2600-U+27BF) in `app/` and `src/`.
- Preserve all existing functionality, test assertions, and bilingual text labels (Indonesian & Chinese).
- Maintain `Isi Cepat (Dev)` button text required by existing tests (`test/codebase-hygiene.test.ts`, `test/record-modal-draft.test.ts`).
- Evidence before assertions: run `node --test` after each step and verify 0 failures.

---

### Task 1: Write the Failing Test for Emoji Hygiene

**Files:**
- Create: `test/no-emojis.test.ts`

**Interfaces:**
- Consumes: `app/` and `src/` directory trees.
- Produces: Test suite validating that no TS/TSX files in `app/` or `src/` contain emoji characters.

- [ ] **Step 1: Write the failing test**
Create `test/no-emojis.test.ts` checking for emojis using `/\p{Extended_Pictographic}/u` and emoji unicode blocks across `app/` and `src/`.

- [ ] **Step 2: Run test to verify it fails**
Run `node --test test/no-emojis.test.ts`
Expected: FAIL reporting the exact files and lines with emojis (`app/login/page.tsx`, `KavlingSelect.tsx`, `RecordModal.tsx`, `RecordTable.tsx`, `record-table.ts`, `SalesModal.tsx`, `SupplierModal.tsx`).

---

### Task 2: Remove Emojis from Modal Components

**Files:**
- Modify: `src/components/ledger/RecordModal.tsx`
- Modify: `src/components/sales/SalesModal.tsx`
- Modify: `src/components/suppliers/SupplierModal.tsx`

**Interfaces:**
- Produces: Clean quick fill buttons retaining `<Zap />` SVG and `<span>Isi Cepat (Dev)</span>`.

- [ ] **Step 1: Update RecordModal.tsx**
Remove `⚡ ` from `<span>⚡ Isi Cepat (Dev)</span>` on line 204.

- [ ] **Step 2: Update SalesModal.tsx**
Remove `⚡ ` from `<span>⚡ Isi Cepat (Dev)</span>` on line 102.

- [ ] **Step 3: Update SupplierModal.tsx**
Remove `⚡ ` from `<span>⚡ Isi Cepat (Dev)</span>` on line 150.

---

### Task 3: Remove Emojis from Table & Selector Components

**Files:**
- Modify: `src/components/ledger/KavlingSelect.tsx`
- Modify: `src/components/ledger/RecordTable.tsx`
- Modify: `src/components/record-table.ts`

**Interfaces:**
- Produces: Clean status badges, clean warnings, and SVG phone icon in table quick-action banner.

- [ ] **Step 1: Update KavlingSelect.tsx**
Remove `⚠️ ` and `🛠️ ` from status pills and warning message.

- [ ] **Step 2: Update RecordTable.tsx**
Replace `📱` emoji with `<Smartphone className="w-3.5 h-3.5" />` in quick action banner.

- [ ] **Step 3: Update record-table.ts**
Remove `📥 ` and `🔄 ` from button labels.

---

### Task 4: Remove Emojis from Login Page & Scripts

**Files:**
- Modify: `app/login/page.tsx`
- Modify: `scripts/seed-db.ts`

**Interfaces:**
- Produces: Professional SVG lock in footer security notice and clean CLI logs.

- [ ] **Step 1: Update app/login/page.tsx**
Replace `🔒` with inline SVG lock icon.

- [ ] **Step 2: Update scripts/seed-db.ts**
Remove `🌲` and `✅` emoji from log messages.

---

### Task 5: Verify Entire Test Suite & Complete Test Coverage

**Files:**
- Test: `test/no-emojis.test.ts`
- Test: Full test suite (`npm test`)

- [ ] **Step 1: Run no-emojis.test.ts to verify it passes**
Run `node --test test/no-emojis.test.ts`. Expected: PASS (0 failures).

- [ ] **Step 2: Run full test suite**
Run `npm test`. Expected: all 570+ tests pass with 0 failures.
