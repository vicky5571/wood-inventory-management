# Plan: Broker Master Data & Record Linkage Migration

**Date:** 2026-10-21
**Priority:** P1
**Status:** DRAFT
**Related Client Feedback:** Item #6

---

## 1. Context & Problem Statement

### 1.1 Current State
- `WoodReceivingRecord` has a flat `brokerFee: number` field (`src/types/index.ts:L177`).
- `AppSettings.defaultBrokerFee: 250000` (default) persisted in SQLite + Supabase.
- SQLite schema: `broker_fee REAL NOT NULL DEFAULT 0.0` in `migrations.ts:L83`.
- `receiving_items_calc_view` prorates broker fee across multi-item manifests by volume share (`views-ddl.ts:L110-117`).
- No `Broker` entity, no broker master CRUD, no broker directory.
- Impossible to answer: "berapa total komisi yang dibayarkan ke broker X bulan ini?"

### 1.2 Client Spec (Finalized from Q6=A)
- **Broker** = perantara pihak ketiga yang menghubungkan pembeli dengan supplier/pemilik lahan.
- Broker **tidak memiliki kayu** (tidak seperti supplier).
- Broker mendapat **komisi** per transaksi (bisa flat fee atau per m³).
- Tidak terikat kontrak formal (unlike supplier).

### 1.3 Scope of This Plan
- Add `Broker` entity as tenant-scoped master data (mirrors `Supplier` structure).
- Add optional FK `brokerId` on `WoodReceivingRecord` (keep `brokerFee` number for actual amount).
- Build broker directory UI (`/brokers`) with scorecard metrics (total commission paid, deal count, primary suppliers).
- Enhance receiving form with broker selection combobox (hybrid dropdown + "no broker" option).
- Migration: existing records with `brokerFee > 0` and no `brokerId` get flagged "unassigned broker" (not blocked).

### 1.4 Non-Goals (YAGNI)
- No commission rate automation (user still enters actual `brokerFee` per record; `defaultCommissionPerM3` is just a hint).
- No broker payment tracking (commissions assumed paid at same time as supplier payment).
- No broker contract/agreement entity.
- No `LandOwner` entity (deferred until Point 7 clarified).

---

## 2. Domain Model (SSOT Additions)

### 2.1 Core Entity

```ts
/**
 * Global Master Data: Broker / Perantara Profile.
 * Third-party commission-based intermediary (no wood ownership).
 */
export interface Broker {
  id: string;
  tenantId: string;
  code: string;                       // e.g. "BRK-001"
  name: string;                       // Nama broker (person or entity)
  contactPerson?: string;
  phone?: string;                     // WhatsApp / Phone
  address?: string;
  taxId?: string;                     // NPWP (optional)
  defaultCommissionPerM3?: number;    // Hint for form prefill; actual stored per-record
  notes?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}
```

### 2.2 Derived / Metrics

```ts
export interface BrokerFilterCriteria {
  searchQuery?: string;               // matches name, code, phone
  status?: 'ALL' | 'ACTIVE' | 'INACTIVE';
}

export interface BrokerWithMetrics extends Broker {
  totalDeals: number;                 // Count of WoodReceivingRecords with this brokerId
  totalCommissionIDR: number;         // Sum brokerFee
  totalVolumeM3Facilitated: number;   // Sum tallyVolumeM3 of linked records
  averageCommissionPerM3: number;     // totalCommission / totalVolume
  primarySuppliers: string[];         // Top 3 supplier names by deal count
  lastDealDate: string;               // Most recent receiptDate linked
}

export interface BrokerStats {
  totalBrokers: number;
  activeCount: number;
  totalCommissionYtdIDR: number;
  totalVolumeFacilitatedYtdM3: number;
}
```

### 2.3 Receiving Record Change

```ts
export interface WoodReceivingRecord {
  // ...existing fields
  brokerId?: string;                  // NEW: optional FK to Broker.id
  brokerFee: number;                  // UNCHANGED: actual commission amount for this record
}
```

Rationale for keeping `brokerFee` as number:
- Preserves calculated columns in `receiving_items_calc_view`.
- Allows per-record override of broker's default commission.
- Zero migration disruption to existing data.
- `brokerId` is purely informational linkage.

### 2.4 Form Input

```ts
export interface BrokerFormInput {
  id?: string;
  code: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  defaultCommissionPerM3?: number;
  status: 'ACTIVE' | 'INACTIVE';
  notes?: string;
}
```

---

## 3. Architectural Approach

### 3.1 Reuse-First
`Broker` is structurally near-identical to `Supplier`. Pattern template:
- Entity shape → copy from `Supplier` interface
- CRUD routes → mirror `app/api/suppliers/*`
- Directory UI → mirror `src/components/suppliers/*`
- Hook → mirror `src/hooks/useSuppliers.ts`
- Metrics calculator → mirror `src/utils/supplier-metrics.ts`

**Do not abstract prematurely.** Supplier and Broker have different semantics (ownership vs. intermediation) and separate domain evolution paths. Shared "Entity<T>" abstraction would violate YAGNI.

### 3.2 Persistence
- SQLite: new table `brokers` + migration adds `broker_id TEXT` column to `receiving_manifests` (nullable FK, no cascade — soft reference).
- Supabase: parallel migration + RLS policy mirroring `suppliers`.
- Loose coupling: deleting a broker does NOT delete linked records; records retain `brokerFee` + nullified `brokerId`.

### 3.3 Linkage Behavior in Receiving Form
Modify `src/components/ledger/RecordDocumentSection.tsx` (or dedicated section):
- New `BrokerCombobox` field below supplier:
  - Options: list of ACTIVE brokers from `useBrokers`
  - "Tidak ada broker" option (sets `brokerId = undefined`, `brokerFee = 0`)
  - On select: prefill `brokerFee` from `defaultCommissionPerM3 * tallyVolumeM3` if default set; user can override
- If `brokerFee > 0` and `brokerId` empty → show inline warning "Komisi diisi tanpa broker terpilih. Pilih broker atau kosongkan komisi."

Not blocking save — advisory only (matches client's "no approval" preference for similar flows).

### 3.4 Metrics Calculator
Create `src/utils/broker-metrics.ts`:
```ts
export function aggregateBrokerMetrics(
  brokers: Broker[],
  records: WoodReceivingRecord[],
): BrokerWithMetrics[]

export function computeBrokerStats(
  brokers: Broker[],
  records: WoodReceivingRecord[],
): BrokerStats
```

Pure, deterministic, O(n*m) where n=brokers, m=records. Acceptable at expected scale.

### 3.5 Nav Integration
Add nav entry after `suppliers` in `src/components/layout/nav-config.ts`:
```ts
{ id: 'brokers', labelId: 'Broker', labelZh: '中间人', href: '/brokers' }
```

---

## 4. Implementation Checklist

### Phase 1: SSOT Types
- [ ] Add `Broker`, `BrokerFilterCriteria`, `BrokerWithMetrics`, `BrokerStats`, `BrokerFormInput` to `src/types/index.ts`
- [ ] Add optional `brokerId?: string` to `WoodReceivingRecord`
- [ ] Add `BROKER_CREATED`, `BROKER_UPDATED`, `BROKER_DELETED`, `BROKER_RESTORED` to `ActivityActionType`

### Phase 2: Metrics Calculator (Test-First)
- [ ] Create `test/broker-metrics.test.ts`:
  - [ ] Empty brokers + records → empty metrics array, zero stats
  - [ ] Broker with no linked records → all zeros, status unchanged
  - [ ] Broker with multiple records → correct totals (commission, volume, deal count)
  - [ ] `averageCommissionPerM3` guards against division by zero
  - [ ] `primarySuppliers` ranks top 3 by deal count, breaks ties alphabetically
  - [ ] `lastDealDate` returns max receiptDate
  - [ ] YTD stats filter correctly on current calendar year
- [ ] Implement `src/utils/broker-metrics.ts`
- [ ] Run `node --test test/broker-metrics.test.ts` → 0 failures

### Phase 3: Persistence Layer
- [ ] SQLite migration: create `brokers` table + add `broker_id` column to `receiving_manifests`
- [ ] Supabase migration SQL in `supabase/migrations/XXXX_brokers.sql`
- [ ] Implement `src/persistence/sqlite/broker-queries.ts`
- [ ] Implement `src/persistence/supabase/supabase-broker-store.ts`
- [ ] Update `receiving_items_calc_view` to include `broker_id` passthrough (no logic change)
- [ ] Add broker adapter to persistence facade

### Phase 4: API Routes
- [ ] `app/api/brokers/route.ts` — GET (list with filter), POST (create)
- [ ] `app/api/brokers/[id]/route.ts` — GET, PUT, DELETE (soft)
- [ ] Input validation: unique code per tenant, non-empty name
- [ ] Tenant scoping enforcement

### Phase 5: Hook & State
- [ ] Create `src/hooks/useBrokers.ts` (mirror `useSuppliers.ts`)
  - Optimistic local-first
  - Soft-delete with undo toast
  - Activity log wiring
- [ ] Add LocalStorage cache keys

### Phase 6: Directory UI
- [ ] Create `src/components/brokers/BrokerCard.tsx` (mirror `SupplierCard.tsx`)
- [ ] Create `src/components/brokers/BrokerTable.tsx` (mirror `SupplierTable.tsx`)
- [ ] Create `src/components/brokers/BrokerStatsGrid.tsx` (4 KPIs: total brokers, active count, YTD commission, YTD volume facilitated)
- [ ] Create `src/components/brokers/BrokerModal.tsx` (create/edit form)
- [ ] Create `src/components/brokers/BrokerDirectoryView.tsx` — coordinator (<250 lines)
- [ ] Create `app/brokers/page.tsx` — route shell

### Phase 7: Receiving Form Integration
- [ ] Create `src/components/brokers/BrokerCombobox.tsx` (dropdown with "no broker" option + prefill commission)
- [ ] Wire into existing receiving form (likely `RecordDocumentSection.tsx` or new `RecordBrokerSection.tsx`)
- [ ] Add advisory warning when `brokerFee > 0` and no `brokerId` selected
- [ ] Update `useWoodRecords.ts` to serialize/deserialize `brokerId`
- [ ] Update CSV export to include broker name column

### Phase 8: Nav & Verification
- [ ] Add `brokers` entry to `src/components/layout/nav-config.ts`
- [ ] Run `npm run test` → 0 failures
- [ ] Run `npm run build:check` → 0 TS/build errors
- [ ] Confirm all coordinator files <250 lines
- [ ] Manual smoke test:
  - [ ] Create broker "Pak Agus" with default commission Rp 50,000/m³
  - [ ] Create receiving record, select broker from dropdown → commission auto-fills
  - [ ] Override commission manually → saves correctly
  - [ ] Visit `/brokers` → "Pak Agus" shows 1 deal, correct totals
  - [ ] Create 2nd record for Pak Agus with different supplier → primarySuppliers list has 2 entries
  - [ ] Soft-delete Pak Agus → undo via toast works
  - [ ] Hard-delete after undo window → existing records retain `brokerFee` but `brokerId` nullified; "unassigned" warning shown in receiving modal
  - [ ] Create record with brokerFee=100000 but no broker selected → advisory warning shows, save still works

---

## 5. File Change Manifest

| File | Action | Lines (est.) |
|---|---|---|
| `src/types/index.ts` | Modify (add types + `brokerId` field + activity actions) | +80 |
| `src/utils/broker-metrics.ts` | Create | ~140 |
| `test/broker-metrics.test.ts` | Create | ~160 |
| `src/persistence/sqlite/broker-queries.ts` | Create | ~170 |
| `src/persistence/sqlite/migrations.ts` | Modify (new table + alter column) | +40 |
| `src/persistence/supabase/supabase-broker-store.ts` | Create | ~180 |
| `supabase/migrations/XXXX_brokers.sql` | Create | ~60 |
| `src/persistence/sqlite/views-ddl.ts` | Modify (pass broker_id through views) | ~10 changed |
| `app/api/brokers/route.ts` | Create | ~90 |
| `app/api/brokers/[id]/route.ts` | Create | ~110 |
| `src/hooks/useBrokers.ts` | Create | ~200 |
| `src/components/brokers/BrokerCard.tsx` | Create | ~110 |
| `src/components/brokers/BrokerTable.tsx` | Create | ~170 |
| `src/components/brokers/BrokerStatsGrid.tsx` | Create | ~90 |
| `src/components/brokers/BrokerModal.tsx` | Create | ~200 |
| `src/components/brokers/BrokerDirectoryView.tsx` | Create | ~180 |
| `src/components/brokers/BrokerCombobox.tsx` | Create | ~140 |
| `src/components/ledger/RecordDocumentSection.tsx` | Modify (wire combobox + warning) | ~30 changed |
| `src/hooks/useWoodRecords.ts` | Modify (brokerId serialization) | ~15 changed |
| `src/utils/records-csv.ts` | Modify (new column) | ~10 changed |
| `app/brokers/page.tsx` | Create | ~15 |
| `src/components/layout/nav-config.ts` | Modify (1 entry) | +6 |

**Total:** ~2,100 new LOC + ~110 touched LOC across ~15 new files + ~5 touched files. No file exceeds 250-line limit.

---

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Existing records have `brokerFee > 0` without `brokerId` — orphaned commissions | Non-blocking migration. Show "Komisi tidak terkait broker" badge on affected records in ledger. Provide batch assignment tool in `/brokers` detail view (optional Phase 9, defer). |
| Deleting broker breaks historical reporting | Soft-delete only. Metrics calculator includes INACTIVE brokers if they have historical records. Full hard-delete reserved for role level 3 + explicit cascade confirmation (not in v1). |
| `defaultCommissionPerM3` confuses users ("why is my commission wrong?") | Make it a hint only — field tooltip "Nilai default ini hanya untuk mempercepat input. Komisi aktual tetap dapat diubah per penerimaan." |
| Prorating broker fee in `receiving_items_calc_view` relies on 1 brokerFee per manifest | Unchanged behavior. Document that broker is manifest-level, not item-level (consistent with current data model). |
| Scope creep into LandOwner territory | Explicitly rejected in Non-Goals. Point 7 still pending client clarification. |
| Multiple brokers per deal (rare but possible in Perhutani) | Out of scope v1. Document as known limitation. Future: `brokerId` → `brokerIds[]` migration path reserved. |

---

## 7. Done Criteria

- All checkboxes in Section 4 ticked.
- `npm run test` + `npm run build:check` both green.
- Manual smoke test passes.
- No regression in ledger, sales, suppliers (Supplier module untouched).
- Broker directory functional with scorecards.
- Receiving form shows broker combobox + default commission prefill.
- Activity log captures broker CRUD actions.

---

## 8. Dependencies on Other Plans

- **Independent.** Can execute in parallel with Plan #1, #3, #5.
- Settings schema untouched (Plan #3 handles threshold migration separately).
- May inform Plan #7 (Production) if sortir-stok workflow needs broker attribution (unlikely).
