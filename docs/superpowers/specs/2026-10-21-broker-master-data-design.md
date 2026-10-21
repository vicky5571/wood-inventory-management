# Design Spec: Broker Master Data & Record Linkage Migration

**Document:** `docs/superpowers/specs/2026-10-21-broker-master-data-design.md`
**Date:** 2026-10-21
**Status:** Draft — Pending Approval
**Related Plan:** `docs/superpowers/plans/2026-10-21-broker-master-data.md`
**Architecture:** New `Broker` master entity (tenant-scoped) mirroring `Supplier` structure. Optional FK `brokerId` on `WoodReceivingRecord` with loose coupling (soft delete, nullify on broker removal). Dedicated `/brokers` directory with scorecard metrics. `BrokerCombobox` in receiving form with "no broker" option + default commission prefill.

---

## 1. Executive Summary & Problem Statement

### 1.1 Context
`WoodReceivingRecord.brokerFee: number` captures commission paid to third-party intermediaries, but there is no broker entity to answer "how much did we pay to Broker X across all deals this quarter?" or "which broker brings in the highest-value suppliers?"

### 1.2 Client Specification (Finalized from Q6=A)
- **Broker** = perantara pihak ketiga (third-party intermediary) connecting buyer with supplier/landowner.
- Broker does NOT own wood (unlike supplier).
- Broker receives commission per transaction (flat fee or per m³).
- No formal contract tie (unlike supplier agreements).

### 1.3 Business Problem
- No commission reporting per broker.
- No broker directory for tracking contacts.
- `brokerFee` orphaned without attribution — accounting black hole.
- Cannot evaluate broker performance / value contribution.

### 1.4 Core Objectives
1. **New `Broker` entity** as tenant-scoped master data.
2. **Optional FK linkage** `brokerId` on `WoodReceivingRecord` (soft coupling, nullable).
3. **Broker directory UI** at `/brokers` with scorecard metrics (total commission, deals, volume facilitated, primary suppliers).
4. **Receiving form integration** via `BrokerCombobox` with "no broker" option + default commission prefill.
5. **Zero migration disruption** — existing records with `brokerFee > 0` and no `brokerId` display with "Komisi tidak terkait broker" advisory.

---

## 2. User Experience & Navigation Flow

```
[ Sidebar Nav ]
  ├── ...
  ├── Pemasok (/suppliers)
  ├── Broker (/brokers)  <── NEW
  └── ...

[ /brokers Directory Page ]
  ├── <BrokerStatsGrid>
  │     ├── Total Broker
  │     ├── Broker Aktif
  │     ├── Total Komisi YTD (Rp)
  │     └── Total Volume Difasilitasi YTD (m³)
  │
  ├── Toolbar: Search, Status filter, + Tambah Broker
  │
  └── <BrokerTable> (or card grid)
        ├── Columns: Kode | Nama | Kontak | Total Deals | Total Komisi | Volume | Primary Suppliers | Status | Aksi
        └── Row Actions: [ Edit ] [ Hapus ]

[ BrokerModal (Create/Edit) ]
  ├── Section 1: Identitas
  │     ├── Kode Broker (e.g. BRK-001)
  │     ├── Nama *
  │     ├── Contact Person
  │     ├── Phone / WhatsApp
  │     └── Alamat
  │
  ├── Section 2: Komersial
  │     ├── NPWP
  │     ├── Default Komisi per m³ (Rp) — opsional, hanya untuk prefill
  │     └── Status: Aktif / Non-Aktif
  │
  └── Footer: [ Batal ] [ Simpan ]

[ Receiving Form (Modified) ]
  ├── ...existing fields...
  ├── <BrokerCombobox>
  │     ├── Options: ACTIVE brokers + "Tidak ada broker"
  │     └── On select: prefill brokerFee from defaultCommissionPerM3 * tallyVolumeM3
  └── Komisi Broker (Rp) — editable, warning if > 0 without broker selected
```

---

## 3. Data Architecture & SSOT Schema

### 3.1 Domain Interfaces (`src/types/index.ts`)

```ts
export interface Broker {
  id: string;
  tenantId: string;
  code: string;                       // e.g. "BRK-001"
  name: string;
  contactPerson?: string;
  phone?: string;
  address?: string;
  taxId?: string;                     // NPWP
  defaultCommissionPerM3?: number;    // Hint for form prefill
  notes?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export interface BrokerFilterCriteria {
  searchQuery?: string;
  status?: 'ALL' | 'ACTIVE' | 'INACTIVE';
}

export interface BrokerWithMetrics extends Broker {
  totalDeals: number;
  totalCommissionIDR: number;
  totalVolumeM3Facilitated: number;
  averageCommissionPerM3: number;
  primarySuppliers: string[];         // Top 3 by deal count
  lastDealDate: string;
}

export interface BrokerStats {
  totalBrokers: number;
  activeCount: number;
  totalCommissionYtdIDR: number;
  totalVolumeFacilitatedYtdM3: number;
}

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

### 3.2 Modified Interface

```ts
export interface WoodReceivingRecord {
  // ...existing fields
  brokerId?: string;                  // NEW: optional FK to Broker.id
  brokerFee: number;                  // UNCHANGED: actual commission for this record
}
```

**Rationale for keeping `brokerFee` as number** (not relational line item):
- Preserves existing `receiving_items_calc_view` prorating logic.
- Allows per-record override of broker's default commission.
- Zero migration disruption.
- `brokerId` is informational linkage only.

### 3.3 Relational Schema (SQLite)

```sql
CREATE TABLE IF NOT EXISTS brokers (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  address TEXT,
  tax_id TEXT,
  default_commission_per_m3 REAL CHECK (default_commission_per_m3 IS NULL OR default_commission_per_m3 >= 0),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id, code)
);

ALTER TABLE receiving_manifests ADD COLUMN broker_id TEXT REFERENCES brokers(id) ON DELETE SET NULL;

CREATE INDEX idx_brokers_tenant_status ON brokers(tenant_id, status);
CREATE INDEX idx_manifests_broker ON receiving_manifests(tenant_id, broker_id);
```

---

## 4. Pure Business Logic (`src/utils/broker-metrics.ts`)

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

**Algorithm (`aggregateBrokerMetrics`):**
1. For each broker, filter records where `brokerId === broker.id`.
2. Sum `brokerFee` → `totalCommissionIDR`.
3. Sum `tallyVolumeM3` → `totalVolumeM3Facilitated`.
4. `averageCommissionPerM3 = totalVolume > 0 ? totalCommission / totalVolume : 0`.
5. Group linked records by `supplierName`, rank by count DESC, take top 3 → `primarySuppliers`.
6. `lastDealDate` = max `receiptDate` of linked records.
7. `totalDeals` = count of linked records.

**Complexity:** O(n × m) where n=brokers, m=records. Acceptable at expected scale (<100 brokers × <10k records).

**YTD stats (`computeBrokerStats`):**
- Filter records with `receiptDate` in current calendar year.
- Sum commission, sum volume, count brokers/active brokers.

---

## 5. API Contracts

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/brokers` | List with `BrokerFilterCriteria` query params |
| POST | `/api/brokers` | Create |
| GET | `/api/brokers/[id]` | Return single broker |
| PUT | `/api/brokers/[id]` | Update |
| DELETE | `/api/brokers/[id]` | Soft-delete (status → INACTIVE) |

**Validation:**
- `code` unique per tenant.
- `name` non-empty.
- `defaultCommissionPerM3` ≥ 0 if provided.

---

## 6. Component Modular Decomposition (<250 LOC)

```
src/components/brokers/
├── BrokerDirectoryView.tsx       # Coordinator
├── BrokerStatsGrid.tsx           # 4 KPIs
├── BrokerCard.tsx                # Card for mobile/grid view
├── BrokerTable.tsx               # Table for desktop
├── BrokerModal.tsx               # Create/edit form
└── BrokerCombobox.tsx            # Dropdown for receiving form (with "no broker" option)

src/utils/broker-metrics.ts       # ~140 LOC
src/hooks/useBrokers.ts           # ~200 LOC (optimistic local-first)

src/persistence/sqlite/broker-queries.ts
src/persistence/supabase/supabase-broker-store.ts
supabase/migrations/XXXX_brokers.sql

app/brokers/page.tsx
app/api/brokers/route.ts
app/api/brokers/[id]/route.ts

Modified:
├── src/components/ledger/RecordDocumentSection.tsx  # Wire BrokerCombobox
├── src/hooks/useWoodRecords.ts                      # brokerId serialization
├── src/utils/records-csv.ts                         # Add broker name column
├── src/components/layout/nav-config.ts              # +1 entry
└── src/persistence/sqlite/views-ddl.ts              # Pass broker_id through
```

---

## 7. Receiving Form Integration

### 7.1 BrokerCombobox Behavior
- Dropdown lists ACTIVE brokers formatted as `${name} (${code})`.
- First option: "Tidak ada broker" → sets `brokerId = undefined`, `brokerFee = 0`.
- On selecting a broker:
  - If `defaultCommissionPerM3` set and `tallyVolumeM3` present → prefill `brokerFee = default * tally`.
  - If `tallyVolumeM3` not yet entered → leave `brokerFee` empty for later prefill.
- User can always override `brokerFee` manually.

### 7.2 Advisory Warning
When `brokerFee > 0` AND `brokerId` empty:
- Inline amber warning: "Komisi diisi tanpa broker terpilih. Pilih broker atau kosongkan komisi."
- Not blocking save (consistent with "no approval" preference).

---

## 8. Business Rules & Edge Cases

### 8.1 Delete Behavior
- Soft-delete only (`status → INACTIVE`).
- Linked records retain `brokerFee` number; `brokerId` nullified via `ON DELETE SET NULL`.
- INACTIVE brokers still appear in `aggregateBrokerMetrics` if they have historical records (preserves reporting continuity).

### 8.2 Prefill Edge Cases
- Changing `tallyVolumeM3` after broker selected: does NOT auto-recompute `brokerFee` (would override user intent).
- Switching broker: prompts "Hitung ulang komisi berdasarkan broker baru?" (confirm before override).

### 8.3 Multi-Broker (Known Limitation v1)
- v1 supports exactly 0 or 1 broker per record.
- Future: `brokerIds: string[]` with per-broker commission split. Documented but out of scope.

### 8.4 Prorating in Multi-Item Manifests
- `receiving_items_calc_view` existing logic unchanged.
- `broker_id` is manifest-level (same across all items in manifest).

---

## 9. Acceptance Criteria

1. New nav entry "Broker" appears after "Pemasok".
2. Create broker "Pak Agus" with default commission Rp 50,000/m³.
3. Receiving modal shows BrokerCombobox with "Pak Agus" selectable.
4. Selecting Pak Agus → brokerFee auto-fills from default × tally.
5. Manual override → saves correctly.
6. `/brokers` shows Pak Agus with 1 deal, correct totals.
7. 2nd record for Pak Agus with different supplier → primarySuppliers list has 2 entries.
8. Soft-delete Pak Agus → undo via toast works.
9. INACTIVE broker still appears in directory with historical metrics intact.
10. Record with brokerFee=100000 but no broker → advisory warning shows, save still works.
11. All coordinator files <250 LOC.
12. `node --test` passes.

---

## 10. Non-Goals (YAGNI)

- No commission rate automation beyond prefill hint.
- No broker payment tracking (commissions assumed paid alongside supplier payment).
- No broker contract/agreement entity.
- No `LandOwner` entity (deferred until Point 7 clarification).
- No multi-broker per record (v1 limitation).

---

## 11. Verification & Success Criteria

1. **Pure logic tests:**
   - `test/broker-metrics.test.ts`: empty inputs, single/multi records, division-by-zero guard, primarySuppliers ranking, YTD filter.
2. **Build gate:** `npm run build:check` → 0 errors.
3. **Smoke test:** Section 9 acceptance criteria.
4. **Zero regression:** Supplier module untouched; existing records with `brokerFee > 0` continue to display.

---

## 12. Contract Verification Checklist (Grep-Able Audit)

### 12.1 SSOT Types
```bash
# Use word-boundary pattern (prevents Broker matching BrokerFilterCriteria etc)
for name in Broker BrokerFilterCriteria BrokerWithMetrics BrokerStats BrokerFormInput; do
  # Match: "export interface Name {" or "export interface Name extends ..."
  count=$(grep -cE "export interface ${name}(\$|[[:space:]])" src/types/index.ts)
  echo "$name: $count"
done
# EXPECT: each 1

# brokerId FK field on WoodReceivingRecord
grep -c "brokerId" src/types/index.ts
# EXPECT: >= 1
```

### 12.2 Pure Logic
```bash
grep -c "export function aggregateBrokerMetrics" src/utils/broker-metrics.ts
grep -c "export function computeBrokerStats" src/utils/broker-metrics.ts
# EXPECT: each 1
```

### 12.3 Component Files
```bash
ls src/components/brokers/BrokerDirectoryView.tsx \
   src/components/brokers/BrokerStatsGrid.tsx \
   src/components/brokers/BrokerCard.tsx \
   src/components/brokers/BrokerTable.tsx \
   src/components/brokers/BrokerModal.tsx \
   src/components/brokers/BrokerCombobox.tsx
# EXPECT: all 6 files found
```

### 12.4 Routes & API
```bash
ls app/brokers/page.tsx \
   app/api/brokers/route.ts \
   app/api/brokers/\[id\]/route.ts
# EXPECT: all 3 files found
```

### 12.5 Persistence
```bash
ls src/persistence/sqlite/broker-queries.ts \
   src/persistence/supabase/supabase-broker-store.ts \
   supabase/migrations/*brokers*.sql
# EXPECT: all found

# brokers table + broker_id FK column
grep -c "CREATE TABLE.*brokers" supabase/migrations/*brokers*.sql
grep -c "broker_id" supabase/migrations/*brokers*.sql
# EXPECT: >= 1 each
```

### 12.6 Hook & Nav & Receiving Form Integration
```bash
ls src/hooks/useBrokers.ts
grep -c "id: 'brokers'" src/components/layout/nav-config.ts
grep -c "BrokerCombobox" src/components/ledger/RecordDocumentSection.tsx
# EXPECT: file found, nav entry = 1, combobox integrated
```

### 12.7 Activity Log
```bash
grep -c "BROKER_CREATED\|BROKER_UPDATED\|BROKER_DELETED\|BROKER_RESTORED" src/types/index.ts
# EXPECT: >= 4 (all 4 action types registered)
```

### 12.8 Tests & Overall Gate
```bash
ls test/broker-metrics.test.ts
node --test test/broker-metrics.test.ts 2>&1 | grep "fail 0"
npm run drift:check && npm test
# EXPECT: all green
```
