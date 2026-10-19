# Domain & Operational Workflow Fixes Implementation Plan (P1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Block negative stock outflow in client UI and `POST /api/sales`, connect `useSettings()` defaults and discrepancy tolerances across forms and calculators, make `/tally` discoverable and feature-complete, and add the missing `'PARTIAL'` payment filter pill to the Ledger Toolbar.

**Architecture:** Enforce stock balance invariants at both the React form boundary (`SalesModal.tsx`) and REST API boundary (`app/api/sales/route.ts`) using the pure calculators in `src/utils/stock-balance.ts`; propagate `useSettings()` into `RecordModal`, `MobileTallyPage`, and `TallyDiscrepancyCard`; register `/tally` in `nav-config.ts` and `Sidebar.tsx`; and extend `Toolbar.tsx` with the `'PARTIAL'` status filter pill.

**Tech Stack:** Node.js 26.8.1 (Native ESM), Next.js 15.1.0, React 19, TypeScript 5.7, Node.js Native Test Runner (`node:test` + `node:assert/strict`).

**Spec:** [docs/superpowers/specs/2026-10-20-domain-and-operational-workflow-fixes-design.md](file:///Users/mac/Web%20Development/wood-inventory-management/docs/superpowers/specs/2026-10-20-domain-and-operational-workflow-fixes-design.md)

## Global Constraints
- Single Source of Truth (SSOT): All shared domain types must be imported from `src/types/index.ts`.
- Strict File Size Limits:
  - `src/components/sales/SalesModal.tsx` MUST be `<= 220` lines (`test/sales-components.test.ts`).
  - `app/tally/page.tsx` MUST be `<= 200` lines (`test/tally-page.test.ts`).
  - `src/components/ledger/Toolbar.tsx` MUST be `<= 250` lines (`test/toolbar-filters.test.ts`).
- Test-First Discipline: Write the failing test first, implement minimal passing code, and verify `0 failures`.
- Language Standard: Code, comments, tests, and commit messages strictly in English.

---

### Task 1: Block Negative Stock Outflow in `SalesModal.tsx` and `POST /api/sales`

**Files:**
- Modify: `src/components/sales/SalesModal.tsx`
- Modify: `app/api/sales/route.ts`
- Modify: `test/sales-components.test.ts`
- Modify: `test/api-sales.test.ts`

**Behavior:**
- In `src/components/sales/SalesModal.tsx`:
  - Guard `handleSubmit`: `if (isSubmitting || !stockCheck.isAllowed) return;`
  - Update submit `<button type="submit">` to `disabled={isSubmitting || !stockCheck.isAllowed}` with disabled visual styling (`disabled:opacity-50 disabled:cursor-not-allowed`).
  - Keep total lines `<= 220`.
- In `app/api/sales/route.ts`:
  - Import `serverRecordStore` from `../../../src/persistence/server-record-store.ts` and `calculateLotStockBalance`, `validateSalesStockAllowance` from `../../../src/utils/stock-balance.ts`.
  - In `POST(request)`, after basic field validation, fetch `inboundRecords = await serverRecordStore.getAll()` and `existingSales = await salesStore.getAll()`.
  - Filter out `payload.id` from `existingSales` when editing an existing sale.
  - Compute `balance = calculateLotStockBalance(inboundRecords, netSales, payload.storageYard, payload.kavlingNumber)` and `allowance = validateSalesStockAllowance(balance, Number(payload.volumeM3), Number(payload.pieces))`.
  - If `!allowance.isAllowed`, return `NextResponse.json({ success: false, error: allowance.warning || 'Stok kavling tidak mencukupi' }, { status: 400 })`.

- [x] **Step 1: Add failing assertions to `test/sales-components.test.ts` and `test/api-sales.test.ts`**
- [x] **Step 2: Run targeted tests to confirm failure**
- [x] **Step 3: Implement stock balance guard in `SalesModal.tsx` and `app/api/sales/route.ts`**
- [x] **Step 4: Run targeted tests and verify 0 failures**

---

### Task 2: Connect `useSettings()` to `RecordModal`, `MobileTallyPage`, and `TallyDiscrepancyCard`

**Files:**
- Modify: `src/components/tally/TallyDiscrepancyCard.tsx`
- Modify: `src/components/ledger/RecordModal.tsx`
- Modify: `app/ledger/page.tsx`
- Modify: `test/tally-components.test.ts`
- Modify: `test/settings.test.ts`

**Behavior:**
- In `src/components/tally/TallyDiscrepancyCard.tsx`:
  - Add optional `acceptableThresholdPct?: number` to `TallyDiscrepancyCardProps` (defaults to `2.0`).
  - Compute discrepancy percentage when `deliveredVolumeM3 > 0`: `const diffPct = (Math.abs(vDiff) / deliveredVolumeM3) * 100`.
  - Set `stat = 'surplus'` if `deliveredVolumeM3 > 0 ? (vDiff > 0 && diffPct > acceptableThresholdPct) : vDiff > 0.05`, and `stat = 'shortage'` if `deliveredVolumeM3 > 0 ? (vDiff < 0 && diffPct > acceptableThresholdPct) : vDiff < -0.05`.
- In `src/components/ledger/RecordModal.tsx`:
  - Import `useSettings` from `@/src/hooks/useSettings`.
  - Read `const { settings } = useSettings();` and pass `settings.defaultBrokerFee` into `defaultRecord(settings.defaultBrokerFee)` and `settings.defaultTimberPphRate` into `createItem(r, settings.defaultTimberPphRate)` when creating new records/items.

- [ ] **Step 1: Add failing tests in `test/tally-components.test.ts` and `test/settings.test.ts`**

```typescript
// In test/tally-components.test.ts:
await t.test('TallyDiscrepancyCard supports acceptableThresholdPct prop from settings', () => {
  const cardPath = path.resolve(process.cwd(), 'src/components/tally/TallyDiscrepancyCard.tsx');
  const content = fs.readFileSync(cardPath, 'utf-8');
  assert.match(content, /acceptableThresholdPct\?:\s*number/, 'Must accept optional acceptableThresholdPct prop');
});

// In test/settings.test.ts:
await t.test('RecordModal wires useSettings for defaultBrokerFee and defaultTimberPphRate', () => {
  const modalPath = path.resolve(process.cwd(), 'src/components/ledger/RecordModal.tsx');
  const content = fs.readFileSync(modalPath, 'utf-8');
  assert.match(content, /useSettings/, 'RecordModal must import and invoke useSettings');
  assert.match(content, /defaultBrokerFee/, 'RecordModal must apply defaultBrokerFee from settings');
  assert.match(content, /defaultTimberPphRate/, 'RecordModal must apply defaultTimberPphRate from settings');
});
```

- [x] **Step 2: Run targeted tests to confirm failure**
  - Run: `node --test test/tally-components.test.ts test/settings.test.ts`

- [x] **Step 3: Implement settings wiring in `TallyDiscrepancyCard.tsx` and `RecordModal.tsx`**

- [x] **Step 4: Run targeted tests and verify 0 failures**
  - Run: `node --test test/tally-components.test.ts test/settings.test.ts`

---

### Task 3: Register `/tally` in Navigation & Upgrade `app/tally/page.tsx` with Comboboxes, Draft Persistence, Settings, and Audit Logging

**Files:**
- Modify: `src/components/layout/nav-config.ts`
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `app/tally/page.tsx`
- Modify: `test/nav-routing.test.ts`
- Modify: `test/tally-page.test.ts`

**Behavior:**
- In `src/components/layout/nav-config.ts`:
  - Add `{ id: 'tally', labelId: 'Tally Lapangan', labelZh: '现场检尺', href: '/tally' }` to `NAV_ITEMS` right after `ledger`.
- In `src/components/layout/Sidebar.tsx`:
  - Import `ClipboardCheck` from `lucide-react` and add `tally: ClipboardCheck` to `ICON_MAP`.
- In `app/tally/page.tsx` (strictly keeping total lines `<= 200`):
  - Import and wire `SupplierCombobox`, `SpeciesCombobox`, `useSettings`, `useActivityLog`, and `loadManifestDraft` / `saveManifestDraft` / `clearManifestDraft`.
  - Use `settings.defaultTimberPphRate`, `settings.defaultBrokerFee`, and `settings.acceptableDiscrepancyThresholdPct` (passed to `<TallyDiscrepancyCard acceptableThresholdPct={settings.acceptableDiscrepancyThresholdPct} ... />`).
  - Record `addLog({ action: 'RECORD_CREATED', ... })` upon saving a manifest.

- [x] **Step 1: Update `test/nav-routing.test.ts` and `test/tally-page.test.ts` with failing assertions**

```typescript
// In test/nav-routing.test.ts:
// Expect '/tally' in routePaths and 'tally' in ids:
assert.deepEqual(routePaths, ['/', '/ledger', '/tally', '/sales', '/suppliers', '/activity', '/settings']);
assert.deepEqual(ids, ['analytics', 'ledger', 'tally', 'sales', 'suppliers', 'activity', 'settings']);
assert.equal(isNavItemActive('/tally', '/tally'), true);

// In test/tally-page.test.ts:
await t.test('app/tally/page.tsx integrates SupplierCombobox, SpeciesCombobox, useSettings, and useActivityLog', () => {
  const content = fs.readFileSync(pagePath, 'utf-8');
  assert.match(content, /SupplierCombobox/, 'Must use SupplierCombobox');
  assert.match(content, /SpeciesCombobox/, 'Must use SpeciesCombobox');
  assert.match(content, /useSettings/, 'Must use useSettings for PPh rate and discrepancy threshold');
  assert.match(content, /useActivityLog/, 'Must log RECORD_CREATED via useActivityLog');
});
```

- [x] **Step 2: Run targeted tests to confirm failure**
  - Run: `node --test test/nav-routing.test.ts test/tally-page.test.ts`

- [x] **Step 3: Implement navigation registration and upgrade `app/tally/page.tsx` (< 200 LOC)**

- [x] **Step 4: Run targeted tests and verify 0 failures**
  - Run: `node --test test/nav-routing.test.ts test/tally-page.test.ts`

---

### Task 4: Add `'PARTIAL'` Payment Filter Pill to Ledger `Toolbar.tsx`

**Files:**
- Modify: `src/components/ledger/Toolbar.tsx`
- Modify: `test/toolbar-filters.test.ts`

**Behavior:**
- In `src/components/ledger/Toolbar.tsx` (keeping total lines `<= 250`):
  - Add the `'PARTIAL'` payment status pill between `'UNPAID'` and `'PAID'`:
    ```tsx
    <button
      type="button"
      onClick={() => onFilterChange({ ...filters, paymentStatus: filters.paymentStatus === 'PARTIAL' ? undefined : 'PARTIAL' })}
      className={`px-2.5 py-1 text-xs rounded-lg border transition-all cursor-pointer font-medium ${
        filters.paymentStatus === 'PARTIAL'
          ? 'bg-amber-500 text-white border-amber-500 font-bold shadow-2xs'
          : 'bg-gray-50 text-gray-600 border-gray-200/80 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      Sebagian / DP (部分付款)
    </button>
    ```

- [x] **Step 1: Add failing test to `test/toolbar-filters.test.ts`**

```typescript
await t.test('Toolbar renders PARTIAL payment status quick-filter pill', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const toolbarPath = path.resolve(process.cwd(), 'src/components/ledger/Toolbar.tsx');
  const content = fs.readFileSync(toolbarPath, 'utf-8');

  assert.match(content, /filters\.paymentStatus\s*===\s*'PARTIAL'/, 'Toolbar must support PARTIAL paymentStatus toggle');
  assert.match(content, /Sebagian\s*\/\s*DP\s*\(部分付款\)/, 'Toolbar must render bilingual PARTIAL payment status label');
});
```

- [x] **Step 2: Run targeted test to confirm failure**
  - Run: `node --test test/toolbar-filters.test.ts`

- [x] **Step 3: Add `'PARTIAL'` filter pill to `src/components/ledger/Toolbar.tsx`**

- [x] **Step 4: Run targeted test and full test suite**
  - Run: `node --test test/toolbar-filters.test.ts`
  - Run: `node --test`
