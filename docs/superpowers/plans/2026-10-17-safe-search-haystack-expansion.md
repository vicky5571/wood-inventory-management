# Safe Search Haystack Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Safely expand the Buku Besar ledger global search to support Accounts Payable invoice numbers (`invoiceNumber`) while eliminating date collision false positives, client GC memory churn, and UI ghost matches.

**Architecture:**
- Pure domain matcher module in `src/utils/record-search.ts` utilizing lazy short-circuit boolean evaluation (`||`) without temporary array allocations or string joins.
- Unified search integration across `useWoodRecords.ts` (client memory cache) and `WoodRecordRepository` (offline storage layer).
- Search transparency feedback in `RecordTableCompactView.tsx`: renders an inline highlight badge (`Faktur: INV-...`) when a record matches primarily via its invoice number, eliminating user confusion over invisible column matches.
- Clear query intention in `Toolbar.tsx`: updates input placeholder to explicitly surface invoice searchability (`Cari Plat / Dok / Faktur / Supplier / Kav...`).

**Tech Stack:** Node.js 26.8.1 (Native ESM & TypeScript), React 19, Tailwind CSS 3.4, Lucide React, `node:test` + `node:assert`.

**Spec:** Context and technical trade-offs established in user evaluation dialogue (2026-10-17).

## Global Constraints
- Maximum file size: keep all modules strictly under ~250 LOC (Strangler pattern on God files).
- Single Source of Truth (SSOT): all domain interfaces and entities must be imported from `src/types/index.ts`.
- Zero external dependencies: rely strictly on native Node.js and existing project primitives.
- Zero string array allocations in search loop: use short-circuit field comparison to eliminate GC pressure.
- Automated test coverage: every task must provide automated tests executed via `node --test` with 0 failures.
- Language standard: source code, types, and git commits in English; user-facing labels bilingual Indonesian-Chinese.

---

### Task 1: Pure Domain Search Matcher (`src/utils/record-search.ts`)

**Files:**
- Create: `src/utils/record-search.ts`
- Test: `test/record-search.test.ts`

**Interfaces:**
- Consumes: `WoodReceivingRecord` from `src/types/index.ts`
- Produces: `recordMatchesSearchQuery(record: WoodReceivingRecord, query: string): boolean`
- Produces: `isInvoiceSearchMatch(record: WoodReceivingRecord, query: string): boolean`

- [ ] **Step 1: Write the failing test**

```ts
// test/record-search.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { recordMatchesSearchQuery, isInvoiceSearchMatch } from '../src/utils/record-search.ts';
import type { WoodReceivingRecord } from '../src/types/index.ts';

test('recordMatchesSearchQuery Suite', async (t) => {
  const sample: WoodReceivingRecord = {
    id: 'rec-test-1',
    receiptDate: '2026-10-01',
    docDate: '2026-09-29',
    truckPlateNumber: 'B 9283 TDA',
    forestryDocNumber: 'SKSHHK-2026-001',
    receiptNumber: 'KW-2026-101',
    contractNumber: 'CTR-JATI-01',
    supplierName: 'PT Wana Lestari',
    woodSpecies: 'Teak / Jati (柚木)',
    woodLengthM: 4.2,
    kavlingNumber: 'KAV-01',
    storageYard: 'TPK-Timur',
    deliveredPieces: 85,
    deliveredVolumeM3: 14.5,
    tallyPieces: 85,
    tallyVolumeM3: 14.65,
    timberPricePerM3: 4200000,
    timberGrossTotal: 61530000,
    timberPphRate: 0.5,
    timberPphAmount: 307650,
    timberNetPayable: 61222350,
    freightRatePerM3: 250000,
    freightGrossTotal: 3662500,
    freightPphAmount: 73250,
    freightNetPayable: 3589250,
    brokerFee: 500000,
    grandNetPayable: 65311600,
    invoiceNumber: 'INV-2026-889',
    createdAt: '2026-10-01T08:30:00.000Z',
    updatedAt: '2026-10-01T08:30:00.000Z',
  };

  await t.test('matches across invoiceNumber cleanly', () => {
    assert.strictEqual(recordMatchesSearchQuery(sample, 'INV-2026-889'), true);
    assert.strictEqual(recordMatchesSearchQuery(sample, '889'), true);
    assert.strictEqual(isInvoiceSearchMatch(sample, 'INV-2026-889'), true);
  });

  await t.test('does NOT match on date substrings to prevent false positive collisions', () => {
    assert.strictEqual(recordMatchesSearchQuery(sample, '2026-10-01'), false);
    assert.strictEqual(recordMatchesSearchQuery(sample, '09-29'), false);
  });

  await t.test('matches standard operational attributes', () => {
    assert.strictEqual(recordMatchesSearchQuery(sample, '9283'), true);
    assert.strictEqual(recordMatchesSearchQuery(sample, 'wana'), true);
    assert.strictEqual(recordMatchesSearchQuery(sample, 'KAV-01'), true);
    assert.strictEqual(recordMatchesSearchQuery(sample, '柚木'), true);
  });

  await t.test('handles whitespace and empty search queries', () => {
    assert.strictEqual(recordMatchesSearchQuery(sample, ''), true);
    assert.strictEqual(recordMatchesSearchQuery(sample, '   '), true);
    assert.strictEqual(isInvoiceSearchMatch(sample, ''), false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
node --test test/record-search.test.ts
```

- [ ] **Step 3: Implement minimal code in `src/utils/record-search.ts`**

```ts
/**
 * src/utils/record-search.ts
 *
 * High-performance pure search matcher for timber receiving records.
 * Uses lazy short-circuit evaluation to eliminate GC memory churn and excludes
 * calendar date strings to prevent false positive substring collisions.
 */

import type { WoodReceivingRecord } from '../types/index.ts';

function fieldContains(field: string | undefined | null, needle: string): boolean {
  return typeof field === 'string' && field.toLowerCase().includes(needle);
}

/**
 * Checks whether an invoiceNumber explicitly matches a non-empty search query.
 */
export function isInvoiceSearchMatch(record: WoodReceivingRecord, rawQuery: string): boolean {
  const q = (rawQuery || '').trim().toLowerCase();
  if (!q) return false;
  return fieldContains(record.invoiceNumber, q);
}

/**
 * Checks if a record matches the user-provided search term.
 * Evaluates fields lazily with zero temporary array allocations.
 */
export function recordMatchesSearchQuery(record: WoodReceivingRecord, rawQuery: string): boolean {
  const q = (rawQuery || '').trim().toLowerCase();
  if (!q) return true;

  return (
    fieldContains(record.truckPlateNumber, q) ||
    fieldContains(record.forestryDocNumber, q) ||
    fieldContains(record.receiptNumber, q) ||
    fieldContains(record.contractNumber, q) ||
    fieldContains(record.supplierName, q) ||
    fieldContains(record.woodSpecies, q) ||
    fieldContains(record.kavlingNumber, q) ||
    fieldContains(record.storageYard, q) ||
    fieldContains(record.invoiceNumber, q)
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
node --test test/record-search.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/utils/record-search.ts test/record-search.test.ts
git commit -m "feat(search): implement pure short-circuit search matcher with invoice support"
```

---

### Task 2: Integrate Matcher into Hook and Repository Layers

**Files:**
- Modify: `src/hooks/useWoodRecords.ts:208-218`
- Modify: `src/persistence/record-repository.ts:50-71`
- Test: `test/toolbar-filters.test.ts`
- Test: `test/storage-crud.test.ts`

**Interfaces:**
- Consumes: `recordMatchesSearchQuery` from `src/utils/record-search.ts`
- Produces: Updated filtering logic in `useWoodRecords` and `WoodRecordRepository` with zero string-array allocations.

- [ ] **Step 1: Write the failing test**
Update `test/toolbar-filters.test.ts` to assert that searching by invoice number filters records accurately without matching date substrings.

- [ ] **Step 2: Run test to verify it fails**

```bash
node --test test/toolbar-filters.test.ts
```

- [ ] **Step 3: Update `src/hooks/useWoodRecords.ts` and `src/persistence/record-repository.ts`**
Replace the inline `haystack = [r.truckPlateNumber, ...].filter(Boolean).join(' ')` with `recordMatchesSearchQuery(r, filters.searchQuery)`.

- [ ] **Step 4: Run tests to verify they pass**

```bash
node --test test/toolbar-filters.test.ts test/storage-crud.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useWoodRecords.ts src/persistence/record-repository.ts test/toolbar-filters.test.ts
git commit -m "refactor(records): adopt recordMatchesSearchQuery across client and repository layers"
```

---

### Task 3: Visual Transparency & Toolbar Search UX

**Files:**
- Modify: `src/components/ledger/RecordTableCompactView.tsx`
- Modify: `src/components/ledger/RecordTable.tsx`
- Modify: `src/components/ledger/Toolbar.tsx`
- Test: `test/record-table-search-badge.test.ts`

**Interfaces:**
- Consumes: `isInvoiceSearchMatch` from `src/utils/record-search.ts`
- Produces: Visual match tag `Faktur: {invoiceNumber}` in `RecordTableCompactView.tsx` and updated search placeholder in `Toolbar.tsx`.

- [ ] **Step 1: Write the failing test**

```ts
// test/record-table-search-badge.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Search Transparency & Match Visibility Suite', async (t) => {
  const compactPath = path.resolve(process.cwd(), 'src/components/ledger/RecordTableCompactView.tsx');
  const toolbarPath = path.resolve(process.cwd(), 'src/components/ledger/Toolbar.tsx');

  await t.test('Toolbar input placeholder mentions Faktur for search clarity', () => {
    const content = fs.readFileSync(toolbarPath, 'utf-8');
    assert.match(content, /Faktur/, 'Search placeholder must indicate invoice searchability');
  });

  await t.test('RecordTableCompactView renders invoice badge when invoice query matches', () => {
    const content = fs.readFileSync(compactPath, 'utf-8');
    assert.match(content, /isInvoiceSearchMatch/, 'Must import and check isInvoiceSearchMatch');
    assert.match(content, /Faktur:/, 'Must render visible Faktur indicator on matching row');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
node --test test/record-table-search-badge.test.ts
```

- [ ] **Step 3: Implement minimal code**
1. In `Toolbar.tsx`: update placeholder to `placeholder="Cari Plat / Dok / Faktur / Supplier / Kav..."`.
2. In `RecordTable.tsx` & `RecordTableCompactView.tsx`: pass `searchQuery` prop and render an inline tag:
```tsx
{isInvoiceMatch && (
  <span className="block mt-0.5 text-[9px] font-mono font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/80">
    Faktur: {r.invoiceNumber}
  </span>
)}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
node --test test/record-table-search-badge.test.ts
```

- [ ] **Step 5: Run full test suite & production build**

```bash
npm test
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add src/components/ledger/Toolbar.tsx src/components/ledger/RecordTable.tsx src/components/ledger/RecordTableCompactView.tsx test/record-table-search-badge.test.ts
git commit -m "feat(ledger): add visible invoice match indicator in compact view and update search placeholder"
```

---

### Task 4: Final Regression & Integration Verification

- [ ] **Step 1: Run complete test suite**
Verify all 36+ test suites pass with 0 failures:
```bash
npm test
```

- [ ] **Step 2: Run Next.js production build**
Confirm zero type, bundling, or static generation errors:
```bash
npm run build
```

- [ ] **Step 3: Git Status Audit**
Ensure working directory is clean and all files obey the 250 LOC ceiling.

