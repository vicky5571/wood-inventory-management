# Price Database & Report Period — Implementation Plan

**Spec Reference:** `docs/superpowers/price-database-spec.md`
**Total Steps:** 12
**New files:** 8 | **Modified files:** 9

---

## Dependency Order

```
Step 1  → src/types/index.ts                              MODIFY — tambah 3 type baru
Step 2  → src/persistence/sqlite/migrations.ts            MODIFY — tambah 3 tabel + 3 ALTER
Step 3  → src/persistence/sqlite/price-queries.ts         CREATE — CRUD queries TimberPriceEntry
Step 4  → src/persistence/sqlite/report-period-queries.ts CREATE — CRUD queries ReportPeriod
Step 5  → src/utils/price-lookup.ts                       CREATE — lookup harga per record
Step 6  → src/utils/report-period-close.ts                CREATE — logic penutupan laporan
Step 7  → src/persistence/server-master-data-bridge.ts    MODIFY — expose price + period methods
Step 8  → src/persistence/server-record-store.ts          MODIFY — expose ke facade
Step 9  → app/api/prices/route.ts                         CREATE — GET + POST
Step 10 → app/api/prices/[id]/route.ts                    CREATE — PATCH + DELETE
Step 11 → app/api/report-periods/route.ts                 CREATE — GET + POST
Step 12 → app/api/report-periods/[id]/route.ts            CREATE — GET detail
Step 13 → app/api/report-periods/[id]/preview/route.ts    CREATE — GET preview
Step 14 → app/api/report-periods/[id]/close/route.ts      CREATE — PATCH close
Step 15 → app/api/report-periods/[id]/reopen/route.ts     CREATE — PATCH reopen
Step 16 → src/hooks/useTimberPrices.ts                    CREATE — hook tabel harga
Step 17 → src/hooks/useReportPeriods.ts                   CREATE — hook periode laporan
Step 18 → src/components/prices/PriceTable.tsx            CREATE — tabel harga UI
Step 19 → src/components/prices/PriceFormModal.tsx        CREATE — form tambah/edit harga
Step 20 → src/components/report-periods/PeriodList.tsx    CREATE — list periode
Step 21 → src/components/report-periods/PeriodCloseModal.tsx  CREATE — preview + close modal
Step 22 → app/prices/page.tsx                             CREATE — halaman /prices
Step 23 → app/report-periods/page.tsx                     CREATE — halaman /report-periods
Step 24 → src/components/layout/nav-config.ts             MODIFY — tambah 2 nav item
Step 25 → src/components/pricing/PendingPricingTable.tsx  MODIFY — isLocked guard + sumber harga
```

---

## Step 1 — MODIFY `src/types/index.ts`

Tambahkan tiga type baru. Letakkan setelah definisi `PaymentFormStatus` (sekitar line 1183).

### Tambahkan:

```ts
// ─── Timber Price Entries ────────────────────────────────────────────────────

/**
 * A dated price entry for a wood species (optionally scoped to a supplier).
 * Used for auto-applying prices during report period close.
 */
export interface TimberPriceEntry {
  id: string;
  tenantId: string;
  woodSpecies: string;
  supplierId?: string;
  supplierName?: string;
  effectiveFrom: string;        // YYYY-MM-DD inclusive
  effectiveTo?: string;         // YYYY-MM-DD inclusive, undefined = still active
  pricePerM3: number;
  timberPphRate: number;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Report Periods ──────────────────────────────────────────────────────────

export type ReportPeriodStatus = 'OPEN' | 'CLOSED' | 'REOPENED';

/**
 * A named reporting period. Records are assigned to a period and locked
 * when the period is closed. Not bound to a fixed calendar week/month.
 */
export interface ReportPeriod {
  id: string;
  tenantId: string;
  name: string;
  status: ReportPeriodStatus;
  startDate: string;            // YYYY-MM-DD — receiptDate range start
  endDate: string;              // YYYY-MM-DD — receiptDate range end
  closedAt?: string;
  closedBy?: string;
  totalRecords?: number;
  totalVolumeM3?: number;
  totalNetPayableIDR?: number;
  priceSnapshotIds?: string[];  // TimberPriceEntry IDs used at close
  reopenedAt?: string;
  reopenedBy?: string;
  reopenReason?: string;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Result of previewing a report period close — shows which records will
 * get a price applied and which will remain PENDING.
 */
export interface ReportPeriodClosePreview {
  periodId: string;
  readyRecords: Array<{
    recordId: string;
    truckPlateNumber: string;
    woodSpecies: string;
    supplierName: string;
    tallyVolumeM3: number;
    matchedPriceEntryId: string;
    matchedPricePerM3: number;
    estimatedNetPayableIDR: number;
  }>;
  pendingRecords: Array<{
    recordId: string;
    truckPlateNumber: string;
    woodSpecies: string;
    supplierName: string;
    reason: string;             // e.g. "Tidak ada harga untuk Sonokeling"
  }>;
  totalReadyVolumeM3: number;
  totalEstimatedNetIDR: number;
}
```

### Modify `WoodReceivingRecord` — tambah 3 field opsional:

Find:
```ts
  paymentNotes?: string;         // Catatan Pembayaran / 付款备注
```
Replace with:
```ts
  paymentNotes?: string;         // Catatan Pembayaran / 付款备注

  // Report Period linkage (set during period close)
  reportPeriodId?: string;       // FK to ReportPeriod.id
  priceEntryId?: string;         // FK to TimberPriceEntry.id used at close
  isLocked?: boolean;            // true after period close — prevents manual price edit
```

---

## Step 2 — MODIFY `src/persistence/sqlite/migrations.ts`

Tambahkan tiga DDL block baru dan tiga ALTER statements di dalam fungsi `runMigrations(db)`.

### Tambahkan DDL tables (setelah block `activity_logs`):

```ts
// ── Timber Price Entries ──────────────────────────────────────────────────
db.prepare(`
  CREATE TABLE IF NOT EXISTS timber_price_entries (
    id               TEXT PRIMARY KEY,
    tenant_id        TEXT NOT NULL DEFAULT 'default-tenant',
    wood_species     TEXT NOT NULL,
    supplier_id      TEXT,
    supplier_name    TEXT,
    effective_from   TEXT NOT NULL,
    effective_to     TEXT,
    price_per_m3     REAL NOT NULL CHECK (price_per_m3 >= 0),
    timber_pph_rate  REAL NOT NULL DEFAULT 0.5,
    notes            TEXT,
    created_by       TEXT,
    created_at       TEXT NOT NULL,
    updated_at       TEXT NOT NULL
  )
`).run();

db.prepare(`
  CREATE INDEX IF NOT EXISTS idx_tpe_species_date
  ON timber_price_entries(wood_species, effective_from)
`).run();

db.prepare(`
  CREATE INDEX IF NOT EXISTS idx_tpe_supplier
  ON timber_price_entries(supplier_id)
`).run();

// ── Report Periods ────────────────────────────────────────────────────────
db.prepare(`
  CREATE TABLE IF NOT EXISTS report_periods (
    id                    TEXT PRIMARY KEY,
    tenant_id             TEXT NOT NULL DEFAULT 'default-tenant',
    name                  TEXT NOT NULL,
    status                TEXT NOT NULL DEFAULT 'OPEN'
                            CHECK (status IN ('OPEN','CLOSED','REOPENED')),
    start_date            TEXT NOT NULL,
    end_date              TEXT NOT NULL,
    closed_at             TEXT,
    closed_by             TEXT,
    total_records         INTEGER,
    total_volume_m3       REAL,
    total_net_payable_idr REAL,
    price_snapshot_ids    TEXT,
    reopened_at           TEXT,
    reopened_by           TEXT,
    reopen_reason         TEXT,
    notes                 TEXT,
    created_by            TEXT,
    created_at            TEXT NOT NULL,
    updated_at            TEXT NOT NULL
  )
`).run();
```

### Tambahkan ALTER TABLE migrations (setelah existing ALTER untuk `timber_price_per_m3`):

```ts
// ── Receiving items — report period linkage (idempotent ALTERs) ───────────
const riCols = db.prepare(`PRAGMA table_info(receiving_items)`).all() as { name: string }[];
const riColNames = riCols.map((c) => c.name);

if (!riColNames.includes('report_period_id')) {
  db.prepare(`ALTER TABLE receiving_items ADD COLUMN report_period_id TEXT`).run();
}
if (!riColNames.includes('price_entry_id')) {
  db.prepare(`ALTER TABLE receiving_items ADD COLUMN price_entry_id TEXT`).run();
}
if (!riColNames.includes('is_locked')) {
  db.prepare(`ALTER TABLE receiving_items ADD COLUMN is_locked INTEGER NOT NULL DEFAULT 0`).run();
}
```

---

## Step 3 — CREATE `src/persistence/sqlite/price-queries.ts`

```ts
/**
 * src/persistence/sqlite/price-queries.ts
 * SQLite CRUD for TimberPriceEntry
 */
import type { Database } from 'node:sqlite';
import type { TimberPriceEntry } from '../../types/index.ts';

function mapRow(row: Record<string, unknown>): TimberPriceEntry {
  return {
    id:             row.id as string,
    tenantId:       row.tenant_id as string,
    woodSpecies:    row.wood_species as string,
    supplierId:     row.supplier_id as string | undefined,
    supplierName:   row.supplier_name as string | undefined,
    effectiveFrom:  row.effective_from as string,
    effectiveTo:    row.effective_to as string | undefined,
    pricePerM3:     row.price_per_m3 as number,
    timberPphRate:  row.timber_pph_rate as number,
    notes:          row.notes as string | undefined,
    createdBy:      row.created_by as string | undefined,
    createdAt:      row.created_at as string,
    updatedAt:      row.updated_at as string,
  };
}

export function getAllPriceEntriesFromDb(db: Database): TimberPriceEntry[] {
  const rows = db.prepare(
    `SELECT * FROM timber_price_entries ORDER BY wood_species, effective_from DESC`
  ).all() as Record<string, unknown>[];
  return rows.map(mapRow);
}

export function savePriceEntryToDb(
  db: Database,
  entry: Omit<TimberPriceEntry, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): TimberPriceEntry {
  const now = new Date().toISOString();
  const id = entry.id ?? `tpe-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  db.prepare(`
    INSERT INTO timber_price_entries
      (id, tenant_id, wood_species, supplier_id, supplier_name,
       effective_from, effective_to, price_per_m3, timber_pph_rate,
       notes, created_by, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET
      wood_species   = excluded.wood_species,
      supplier_id    = excluded.supplier_id,
      supplier_name  = excluded.supplier_name,
      effective_from = excluded.effective_from,
      effective_to   = excluded.effective_to,
      price_per_m3   = excluded.price_per_m3,
      timber_pph_rate = excluded.timber_pph_rate,
      notes          = excluded.notes,
      updated_at     = excluded.updated_at
  `).run(
    id, entry.tenantId ?? 'default-tenant', entry.woodSpecies,
    entry.supplierId ?? null, entry.supplierName ?? null,
    entry.effectiveFrom, entry.effectiveTo ?? null,
    entry.pricePerM3, entry.timberPphRate,
    entry.notes ?? null, entry.createdBy ?? null, now, now,
  );
  return { ...entry, id, createdAt: now, updatedAt: now } as TimberPriceEntry;
}

export function deletePriceEntryFromDb(db: Database, id: string): void {
  db.prepare(`DELETE FROM timber_price_entries WHERE id = ?`).run(id);
}

/**
 * Find the best matching price entry for a given species + supplier + date.
 * Priority: supplier-specific > global (no supplierId).
 */
export function lookupPriceEntryFromDb(
  db: Database,
  woodSpecies: string,
  supplierId: string | undefined,
  receiptDate: string,   // YYYY-MM-DD
): TimberPriceEntry | null {
  const base = `
    FROM timber_price_entries
    WHERE wood_species = ?
      AND effective_from <= ?
      AND (effective_to IS NULL OR effective_to >= ?)
  `;
  // 1. Try supplier-specific
  if (supplierId) {
    const row = db.prepare(
      `SELECT * ${base} AND supplier_id = ? ORDER BY effective_from DESC LIMIT 1`
    ).get(woodSpecies, receiptDate, receiptDate, supplierId) as Record<string, unknown> | undefined;
    if (row) return mapRow(row);
  }
  // 2. Fall back to global
  const row = db.prepare(
    `SELECT * ${base} AND supplier_id IS NULL ORDER BY effective_from DESC LIMIT 1`
  ).get(woodSpecies, receiptDate, receiptDate) as Record<string, unknown> | undefined;
  return row ? mapRow(row) : null;
}
```

---

## Step 4 — CREATE `src/persistence/sqlite/report-period-queries.ts`

```ts
/**
 * src/persistence/sqlite/report-period-queries.ts
 * SQLite CRUD for ReportPeriod
 */
import type { Database } from 'node:sqlite';
import type { ReportPeriod, ReportPeriodStatus } from '../../types/index.ts';

function mapRow(row: Record<string, unknown>): ReportPeriod {
  return {
    id:                  row.id as string,
    tenantId:            row.tenant_id as string,
    name:                row.name as string,
    status:              row.status as ReportPeriodStatus,
    startDate:           row.start_date as string,
    endDate:             row.end_date as string,
    closedAt:            row.closed_at as string | undefined,
    closedBy:            row.closed_by as string | undefined,
    totalRecords:        row.total_records as number | undefined,
    totalVolumeM3:       row.total_volume_m3 as number | undefined,
    totalNetPayableIDR:  row.total_net_payable_idr as number | undefined,
    priceSnapshotIds:    row.price_snapshot_ids
                           ? JSON.parse(row.price_snapshot_ids as string)
                           : undefined,
    reopenedAt:          row.reopened_at as string | undefined,
    reopenedBy:          row.reopened_by as string | undefined,
    reopenReason:        row.reopen_reason as string | undefined,
    notes:               row.notes as string | undefined,
    createdBy:           row.created_by as string | undefined,
    createdAt:           row.created_at as string,
    updatedAt:           row.updated_at as string,
  };
}

export function getAllReportPeriodsFromDb(db: Database): ReportPeriod[] {
  const rows = db.prepare(
    `SELECT * FROM report_periods ORDER BY start_date DESC`
  ).all() as Record<string, unknown>[];
  return rows.map(mapRow);
}

export function getReportPeriodByIdFromDb(db: Database, id: string): ReportPeriod | null {
  const row = db.prepare(`SELECT * FROM report_periods WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
  return row ? mapRow(row) : null;
}

export function saveReportPeriodToDb(
  db: Database,
  period: Omit<ReportPeriod, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): ReportPeriod {
  const now = new Date().toISOString();
  const id = period.id ?? `rp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  db.prepare(`
    INSERT INTO report_periods
      (id, tenant_id, name, status, start_date, end_date,
       closed_at, closed_by, total_records, total_volume_m3,
       total_net_payable_idr, price_snapshot_ids,
       reopened_at, reopened_by, reopen_reason,
       notes, created_by, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET
      name                  = excluded.name,
      status                = excluded.status,
      start_date            = excluded.start_date,
      end_date              = excluded.end_date,
      closed_at             = excluded.closed_at,
      closed_by             = excluded.closed_by,
      total_records         = excluded.total_records,
      total_volume_m3       = excluded.total_volume_m3,
      total_net_payable_idr = excluded.total_net_payable_idr,
      price_snapshot_ids    = excluded.price_snapshot_ids,
      reopened_at           = excluded.reopened_at,
      reopened_by           = excluded.reopened_by,
      reopen_reason         = excluded.reopen_reason,
      notes                 = excluded.notes,
      updated_at            = excluded.updated_at
  `).run(
    id, period.tenantId ?? 'default-tenant', period.name, period.status,
    period.startDate, period.endDate,
    period.closedAt ?? null, period.closedBy ?? null,
    period.totalRecords ?? null, period.totalVolumeM3 ?? null,
    period.totalNetPayableIDR ?? null,
    period.priceSnapshotIds ? JSON.stringify(period.priceSnapshotIds) : null,
    period.reopenedAt ?? null, period.reopenedBy ?? null, period.reopenReason ?? null,
    period.notes ?? null, period.createdBy ?? null, now, now,
  );
  return { ...period, id, createdAt: now, updatedAt: now } as ReportPeriod;
}
```

---

## Step 5 — CREATE `src/utils/price-lookup.ts`

Pure utility — no DB dependency. Takes a list of price entries and finds
the best match for a record. Used by both the preview API and the close API.

```ts
/**
 * src/utils/price-lookup.ts
 *
 * Pure price lookup logic — given a list of TimberPriceEntry,
 * find the best match for a WoodReceivingRecord.
 * No DB dependency — entries are passed in (already fetched).
 */
import type { TimberPriceEntry, WoodReceivingRecord } from '../types/index.ts';

export interface PriceLookupResult {
  matched: true;
  entry: TimberPriceEntry;
} | {
  matched: false;
  reason: string;
}

/**
 * Find the best price entry for a record.
 * Priority: supplier-specific > global (supplierId undefined/null).
 * Date range: entry.effectiveFrom <= record.receiptDate <= entry.effectiveTo (or open-ended).
 */
export function lookupPriceForRecord(
  record: WoodReceivingRecord,
  allEntries: TimberPriceEntry[],
): PriceLookupResult {
  const d = record.receiptDate;
  const species = record.woodSpecies?.trim().toLowerCase();

  const candidates = allEntries.filter((e) => {
    if (e.woodSpecies.trim().toLowerCase() !== species) return false;
    if (e.effectiveFrom > d) return false;
    if (e.effectiveTo && e.effectiveTo < d) return false;
    return true;
  });

  if (candidates.length === 0) {
    return { matched: false, reason: `Tidak ada harga untuk "${record.woodSpecies}" pada tanggal ${d}` };
  }

  // Prefer supplier-specific match
  const supplierMatch = candidates
    .filter((e) => e.supplierId && e.supplierId === record.brokerId)  // note: use supplierId if available
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];

  // Global fallback
  const globalMatch = candidates
    .filter((e) => !e.supplierId)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];

  const best = supplierMatch ?? globalMatch;
  if (!best) return { matched: false, reason: `Tidak ada harga untuk "${record.woodSpecies}"` };

  return { matched: true, entry: best };
}

/**
 * Batch lookup for all records. Returns two arrays: ready (have a price) and pending (no match).
 */
export function batchLookupPrices(
  records: WoodReceivingRecord[],
  allEntries: TimberPriceEntry[],
): {
  ready: Array<{ record: WoodReceivingRecord; entry: TimberPriceEntry }>;
  pending: Array<{ record: WoodReceivingRecord; reason: string }>;
} {
  const ready: Array<{ record: WoodReceivingRecord; entry: TimberPriceEntry }> = [];
  const pending: Array<{ record: WoodReceivingRecord; reason: string }> = [];

  for (const record of records) {
    // Skip already-priced records that are already locked
    if (record.isLocked && record.timberPricePerM3 !== null) {
      continue;
    }
    const result = lookupPriceForRecord(record, allEntries);
    if (result.matched) {
      ready.push({ record, entry: result.entry });
    } else {
      pending.push({ record, reason: result.reason });
    }
  }

  return { ready, pending };
}
```

---

## Step 6 — CREATE `src/utils/report-period-close.ts`

Core business logic for closing a report period. Called by the API route.
Returns a structured result that the API serializes.

```ts
/**
 * src/utils/report-period-close.ts
 *
 * Business logic for closing a ReportPeriod.
 * Applies matched prices to all pending records in the period's date range,
 * locks them, and writes summary stats back to the period.
 */
import type { Database } from 'node:sqlite';
import type {
  ReportPeriod, WoodReceivingRecord, ReportPeriodClosePreview,
} from '../types/index.ts';
import { getAllPriceEntriesFromDb } from '../persistence/sqlite/price-queries.ts';
import { batchLookupPrices } from './price-lookup.ts';
import { computeRecordCalculations } from './timber-calc.ts';

export interface PeriodCloseResult {
  appliedCount: number;
  skippedCount: number;
  totalVolumeM3: number;
  totalNetPayableIDR: number;
  usedPriceEntryIds: string[];
}

/**
 * Preview only — no writes. Returns what WOULD happen if period were closed.
 */
export function previewPeriodClose(
  db: Database,
  period: ReportPeriod,
  records: WoodReceivingRecord[],   // already filtered to period date range
): ReportPeriodClosePreview {
  const allEntries = getAllPriceEntriesFromDb(db);
  const pendingRecords = records.filter((r) => r.timberPricePerM3 === null && !r.isLocked);
  const { ready, pending } = batchLookupPrices(pendingRecords, allEntries);

  let totalVol = 0;
  let totalNet = 0;

  const readyItems = ready.map(({ record, entry }) => {
    const calcs = computeRecordCalculations({
      tallyVolumeM3: record.tallyVolumeM3,
      deliveredVolumeM3: record.deliveredVolumeM3,
      tallyPieces: record.tallyPieces,
      deliveredPieces: record.deliveredPieces,
      timberPricePerM3: entry.pricePerM3,
      timberPphRate: entry.timberPphRate,
      freightRatePerM3: record.freightRatePerM3,
      freightPphAmount: record.freightPphAmount,
      brokerFee: record.brokerFee,
    });
    totalVol += record.tallyVolumeM3;
    totalNet += calcs.grandNetPayable ?? 0;
    return {
      recordId: record.id,
      truckPlateNumber: record.truckPlateNumber,
      woodSpecies: record.woodSpecies,
      supplierName: record.supplierName,
      tallyVolumeM3: record.tallyVolumeM3,
      matchedPriceEntryId: entry.id,
      matchedPricePerM3: entry.pricePerM3,
      estimatedNetPayableIDR: calcs.grandNetPayable ?? 0,
    };
  });

  return {
    periodId: period.id,
    readyRecords: readyItems,
    pendingRecords: pending.map(({ record, reason }) => ({
      recordId: record.id,
      truckPlateNumber: record.truckPlateNumber,
      woodSpecies: record.woodSpecies,
      supplierName: record.supplierName,
      reason,
    })),
    totalReadyVolumeM3: totalVol,
    totalEstimatedNetIDR: totalNet,
  };
}

/**
 * Execute period close — writes prices to records, locks them, updates period stats.
 * Called inside a DB transaction from the API route.
 */
export function executePeriodClose(
  db: Database,
  period: ReportPeriod,
  records: WoodReceivingRecord[],
  closedBy: string,
): PeriodCloseResult {
  const allEntries = getAllPriceEntriesFromDb(db);
  const pendingRecords = records.filter((r) => r.timberPricePerM3 === null && !r.isLocked);
  const { ready } = batchLookupPrices(pendingRecords, allEntries);

  const now = new Date().toISOString();
  let totalVol = 0;
  let totalNet = 0;
  const usedIds = new Set<string>();

  // Update each matched record
  const updateStmt = db.prepare(`
    UPDATE receiving_items SET
      timber_price_per_m3 = ?,
      timber_pph_rate     = ?,
      report_period_id    = ?,
      price_entry_id      = ?,
      is_locked           = 1,
      updated_at          = ?
    WHERE id = ?
  `);

  for (const { record, entry } of ready) {
    const calcs = computeRecordCalculations({
      tallyVolumeM3: record.tallyVolumeM3,
      deliveredVolumeM3: record.deliveredVolumeM3,
      tallyPieces: record.tallyPieces,
      deliveredPieces: record.deliveredPieces,
      timberPricePerM3: entry.pricePerM3,
      timberPphRate: entry.timberPphRate,
      freightRatePerM3: record.freightRatePerM3,
      freightPphAmount: record.freightPphAmount,
      brokerFee: record.brokerFee,
    });
    updateStmt.run(
      entry.pricePerM3, entry.timberPphRate,
      period.id, entry.id, now,
      record.item_id ?? record.id,
    );
    totalVol += record.tallyVolumeM3;
    totalNet += calcs.grandNetPayable ?? 0;
    usedIds.add(entry.id);
  }

  // Lock all records in range (even already-priced ones)
  db.prepare(`
    UPDATE receiving_items SET is_locked = 1, report_period_id = ?, updated_at = ?
    WHERE report_period_id IS NULL
      AND EXISTS (
        SELECT 1 FROM receiving_manifests m
        WHERE m.id = receiving_items.manifest_id
          AND m.receipt_date BETWEEN ? AND ?
      )
  `).run(period.id, now, period.startDate, period.endDate);

  // Update period stats
  db.prepare(`
    UPDATE report_periods SET
      status                = 'CLOSED',
      closed_at             = ?,
      closed_by             = ?,
      total_records         = ?,
      total_volume_m3       = ?,
      total_net_payable_idr = ?,
      price_snapshot_ids    = ?,
      updated_at            = ?
    WHERE id = ?
  `).run(
    now, closedBy,
    records.length, totalVol, totalNet,
    JSON.stringify([...usedIds]),
    now, period.id,
  );

  return {
    appliedCount: ready.length,
    skippedCount: pendingRecords.length - ready.length,
    totalVolumeM3: totalVol,
    totalNetPayableIDR: totalNet,
    usedPriceEntryIds: [...usedIds],
  };
}
```

---

## Step 7 — MODIFY `src/persistence/server-master-data-bridge.ts`

Add imports and 6 new methods to the existing bridge class.

### Add imports at top:
```ts
import {
  getAllPriceEntriesFromDb,
  savePriceEntryToDb,
  deletePriceEntryFromDb,
  lookupPriceEntryFromDb,
} from './sqlite/price-queries.ts';
import {
  getAllReportPeriodsFromDb,
  getReportPeriodByIdFromDb,
  saveReportPeriodToDb,
} from './sqlite/report-period-queries.ts';
import { previewPeriodClose, executePeriodClose } from '../utils/report-period-close.ts';
import type { TimberPriceEntry, ReportPeriod, ReportPeriodClosePreview } from '../types/index.ts';
```

### Add 6 new methods to the bridge class:
```ts
// ── Price Entries ────────────────────────────────────────────────────────
async getAllPriceEntries(): Promise<TimberPriceEntry[]> {
  const db = await getDb();
  return getAllPriceEntriesFromDb(db);
}

async savePriceEntry(entry: Partial<TimberPriceEntry> & { woodSpecies: string; pricePerM3: number; effectiveFrom: string }): Promise<TimberPriceEntry> {
  const db = await getDb();
  return savePriceEntryToDb(db, entry as Parameters<typeof savePriceEntryToDb>[1]);
}

async deletePriceEntry(id: string): Promise<void> {
  const db = await getDb();
  return deletePriceEntryFromDb(db, id);
}

// ── Report Periods ───────────────────────────────────────────────────────
async getAllReportPeriods(): Promise<ReportPeriod[]> {
  const db = await getDb();
  return getAllReportPeriodsFromDb(db);
}

async saveReportPeriod(period: Partial<ReportPeriod> & { name: string; startDate: string; endDate: string }): Promise<ReportPeriod> {
  const db = await getDb();
  return saveReportPeriodToDb(db, period as Parameters<typeof saveReportPeriodToDb>[1]);
}

async previewReportPeriodClose(periodId: string, records: WoodReceivingRecord[]): Promise<ReportPeriodClosePreview> {
  const db = await getDb();
  const period = getReportPeriodByIdFromDb(db, periodId);
  if (!period) throw new Error(`ReportPeriod id="${periodId}" not found`);
  return previewPeriodClose(db, period, records);
}

async closeReportPeriod(periodId: string, records: WoodReceivingRecord[], closedBy: string) {
  const db = await getDb();
  const period = getReportPeriodByIdFromDb(db, periodId);
  if (!period) throw new Error(`ReportPeriod id="${periodId}" not found`);
  if (period.status === 'CLOSED') throw new Error('Laporan sudah ditutup');
  return executePeriodClose(db, period, records, closedBy);
}

async reopenReportPeriod(periodId: string, reopenedBy: string, reason: string): Promise<ReportPeriod> {
  const db = await getDb();
  const period = getReportPeriodByIdFromDb(db, periodId);
  if (!period) throw new Error(`ReportPeriod id="${periodId}" not found`);
  if (period.status !== 'CLOSED') throw new Error('Hanya laporan CLOSED yang bisa dibuka kembali');
  const now = new Date().toISOString();
  return saveReportPeriodToDb(db, {
    ...period,
    status: 'REOPENED',
    reopenedAt: now,
    reopenedBy,
    reopenReason: reason,
  });
}
```

---

## Step 8 — MODIFY `src/persistence/server-record-store.ts`

Expose the 8 new bridge methods through the facade (same pattern as existing methods).

### Add after existing `saveStorageYard` / `saveStorageLot` group:
```ts
// Price entries
async getAllPriceEntries() { return this.bridge.getAllPriceEntries(); }
async savePriceEntry(e: Parameters<typeof this.bridge.savePriceEntry>[0]) { return this.bridge.savePriceEntry(e); }
async deletePriceEntry(id: string) { return this.bridge.deletePriceEntry(id); }

// Report periods
async getAllReportPeriods() { return this.bridge.getAllReportPeriods(); }
async saveReportPeriod(p: Parameters<typeof this.bridge.saveReportPeriod>[0]) { return this.bridge.saveReportPeriod(p); }
async previewReportPeriodClose(periodId: string, records: WoodReceivingRecord[]) {
  return this.bridge.previewReportPeriodClose(periodId, records);
}
async closeReportPeriod(periodId: string, records: WoodReceivingRecord[], closedBy: string) {
  return this.bridge.closeReportPeriod(periodId, records, closedBy);
}
async reopenReportPeriod(periodId: string, reopenedBy: string, reason: string) {
  return this.bridge.reopenReportPeriod(periodId, reopenedBy, reason);
}
```

---

## Steps 9–15 — API Routes

### Step 9 — CREATE `app/api/prices/route.ts`
```ts
import { NextResponse } from 'next/server.js';
import { serverRecordStore } from '../../../src/persistence/server-record-store.ts';
import { getAuthenticatedUser } from '../../../src/auth/session.ts';
export const dynamic = 'force-dynamic';

export async function GET() {
  const entries = await serverRecordStore.getAllPriceEntries();
  return NextResponse.json({ success: true, data: entries });
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  if (user.roleLevel !== 1) return NextResponse.json({ success: false, error: 'Akses ditolak' }, { status: 403 });
  const body = await request.json();
  if (!body.woodSpecies || body.pricePerM3 == null || !body.effectiveFrom) {
    return NextResponse.json({ success: false, error: 'woodSpecies, pricePerM3, effectiveFrom wajib diisi' }, { status: 400 });
  }
  const entry = await serverRecordStore.savePriceEntry({ ...body, createdBy: user.name });
  return NextResponse.json({ success: true, data: entry });
}
```

### Step 10 — CREATE `app/api/prices/[id]/route.ts`
```ts
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  if (user.roleLevel !== 1) return NextResponse.json({ success: false, error: 'Akses ditolak' }, { status: 403 });
  const body = await request.json();
  const entry = await serverRecordStore.savePriceEntry({ ...body, id: params.id });
  return NextResponse.json({ success: true, data: entry });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  if (user.roleLevel !== 1) return NextResponse.json({ success: false, error: 'Akses ditolak' }, { status: 403 });
  await serverRecordStore.deletePriceEntry(params.id);
  return NextResponse.json({ success: true });
}
```

### Step 11 — CREATE `app/api/report-periods/route.ts`
```ts
export async function GET() {
  const periods = await serverRecordStore.getAllReportPeriods();
  return NextResponse.json({ success: true, data: periods });
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  if (user.roleLevel !== 1) return NextResponse.json({ success: false, error: 'Akses ditolak' }, { status: 403 });
  const body = await request.json();
  if (!body.name || !body.startDate || !body.endDate) {
    return NextResponse.json({ success: false, error: 'name, startDate, endDate wajib diisi' }, { status: 400 });
  }
  const period = await serverRecordStore.saveReportPeriod({ ...body, status: 'OPEN', createdBy: user.name });
  return NextResponse.json({ success: true, data: period });
}
```

### Step 12 — CREATE `app/api/report-periods/[id]/route.ts`
```ts
// GET detail period (for detail page)
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const periods = await serverRecordStore.getAllReportPeriods();
  const period = periods.find((p) => p.id === params.id);
  if (!period) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true, data: period });
}
```

### Step 13 — CREATE `app/api/report-periods/[id]/preview/route.ts`
```ts
// GET — returns ReportPeriodClosePreview
// Fetches records for the period's date range from serverRecordStore,
// then calls bridge.previewReportPeriodClose()
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  // fetch records in period range from DB
  const allRecords = await serverRecordStore.getFiltered({});
  const periods = await serverRecordStore.getAllReportPeriods();
  const period = periods.find((p) => p.id === params.id);
  if (!period) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  const inRange = allRecords.filter(
    (r) => r.receiptDate >= period.startDate && r.receiptDate <= period.endDate
  );
  const preview = await serverRecordStore.previewReportPeriodClose(params.id, inRange);
  return NextResponse.json({ success: true, data: preview });
}
```

### Step 14 — CREATE `app/api/report-periods/[id]/close/route.ts`
```ts
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  if (user.roleLevel !== 1) return NextResponse.json({ success: false, error: 'Akses ditolak' }, { status: 403 });
  const allRecords = await serverRecordStore.getFiltered({});
  const periods = await serverRecordStore.getAllReportPeriods();
  const period = periods.find((p) => p.id === params.id);
  if (!period) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  const inRange = allRecords.filter(
    (r) => r.receiptDate >= period.startDate && r.receiptDate <= period.endDate
  );
  const result = await serverRecordStore.closeReportPeriod(params.id, inRange, user.name ?? 'unknown');
  return NextResponse.json({ success: true, data: result });
}
```

### Step 15 — CREATE `app/api/report-periods/[id]/reopen/route.ts`
```ts
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  if (user.roleLevel !== 1) return NextResponse.json({ success: false, error: 'Akses ditolak' }, { status: 403 });
  const { reason } = await request.json();
  if (!reason?.trim()) return NextResponse.json({ success: false, error: 'Alasan wajib diisi' }, { status: 400 });
  const period = await serverRecordStore.reopenReportPeriod(params.id, user.name ?? 'unknown', reason);
  return NextResponse.json({ success: true, data: period });
}
```

---

## Steps 16–17 — Hooks

### Step 16 — CREATE `src/hooks/useTimberPrices.ts`

```ts
'use client';
import { useState, useEffect, useCallback } from 'react';
import type { TimberPriceEntry } from '../types/index.ts';

export function useTimberPrices() {
  const [entries, setEntries] = useState<TimberPriceEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true); setError(null);
    try {
      const res = await fetch('/api/prices');
      const json = await res.json();
      if (json.success) setEntries(json.data);
      else throw new Error(json.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat tabel harga');
    } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const saveEntry = useCallback(async (entry: Partial<TimberPriceEntry> & {
    woodSpecies: string; pricePerM3: number; effectiveFrom: string;
  }) => {
    const method = entry.id ? 'PATCH' : 'POST';
    const url = entry.id ? '/api/prices/' + entry.id : '/api/prices';
    const res = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error ?? 'Gagal menyimpan harga');
    await refresh();
    return json.data as TimberPriceEntry;
  }, [refresh]);

  const deleteEntry = useCallback(async (id: string) => {
    const res = await fetch('/api/prices/' + id, { method: 'DELETE' });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error ?? 'Gagal menghapus harga');
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const activeEntries  = entries.filter((e) => !e.effectiveTo || e.effectiveTo >= today);
  const expiredEntries = entries.filter((e) => e.effectiveTo && e.effectiveTo < today);

  return { entries, activeEntries, expiredEntries, isLoading, error, refresh, saveEntry, deleteEntry };
}
```

### Step 17 — CREATE `src/hooks/useReportPeriods.ts`

```ts
'use client';
import { useState, useEffect, useCallback } from 'react';
import type { ReportPeriod, ReportPeriodClosePreview } from '../types/index.ts';

export function useReportPeriods() {
  const [periods, setPeriods] = useState<ReportPeriod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true); setError(null);
    try {
      const res  = await fetch('/api/report-periods');
      const json = await res.json();
      if (json.success) setPeriods(json.data);
      else throw new Error(json.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat periode laporan');
    } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const createPeriod = useCallback(async (data: {
    name: string; startDate: string; endDate: string; notes?: string;
  }) => {
    const res  = await fetch('/api/report-periods', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error ?? 'Gagal membuat periode');
    await refresh();
    return json.data as ReportPeriod;
  }, [refresh]);

  const getPreview = useCallback(async (periodId: string): Promise<ReportPeriodClosePreview> => {
    const res  = await fetch('/api/report-periods/' + periodId + '/preview');
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error ?? 'Gagal memuat preview');
    return json.data;
  }, []);

  const closePeriodFn = useCallback(async (periodId: string) => {
    const res  = await fetch('/api/report-periods/' + periodId + '/close', { method: 'PATCH' });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error ?? 'Gagal menutup laporan');
    await refresh();
    return json.data;
  }, [refresh]);

  const reopenPeriod = useCallback(async (periodId: string, reason: string) => {
    const res  = await fetch('/api/report-periods/' + periodId + '/reopen', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error ?? 'Gagal membuka kembali laporan');
    await refresh();
    return json.data as ReportPeriod;
  }, [refresh]);

  const openPeriods   = periods.filter((p) => p.status === 'OPEN' || p.status === 'REOPENED');
  const closedPeriods = periods.filter((p) => p.status === 'CLOSED');

  return {
    periods, openPeriods, closedPeriods, isLoading, error,
    refresh, createPeriod, getPreview, closePeriod: closePeriodFn, reopenPeriod,
  };
}
```


---

## Steps 18–21 — UI Components (Outlines)

### Step 18 — CREATE `src/components/prices/PriceTable.tsx`

Props: `{ entries: TimberPriceEntry[], canWrite: boolean, onEdit, onDelete }`

Renders two sections:
1. **Harga Berlaku Saat Ini** — grid/table of activeEntries, grouped by `woodSpecies`
2. **Riwayat Harga (expired)** — collapsed accordion per species, click to expand

Per row shows:
- Species badge (amber), supplier name or "Semua Supplier" (gray)
- Harga/m³ formatted as IDR
- PPh rate %
- Rentang berlaku: `1 Jan 2026 – 31 Mar 2026` or `1 Jan 2026 – sekarang`
- Notes (truncated)
- Edit + Delete buttons (canWrite only)
- Delete disabled with tooltip if entry is referenced by a CLOSED period

### Step 19 — CREATE `src/components/prices/PriceFormModal.tsx`

Props: `{ isOpen, entry: TimberPriceEntry | null, speciesList: string[], onClose, onSave }`

Fields:
- Jenis Kayu (select dari speciesList)
- Supplier (optional — combobox from supplier list, or leave blank for "Semua")
- Harga per m³ (number, required)
- PPh Rate % (number, prefill from AppSettings.defaultTimberPphRate)
- Berlaku Dari (date, required)
- Berlaku Sampai (date, optional — blank = masih berlaku)
- Catatan (textarea, optional)

Validation: `effectiveTo` must be >= `effectiveFrom` if provided.

### Step 20 — CREATE `src/components/report-periods/PeriodList.tsx`

Props: `{ periods, canWrite, onCreateNew, onPreviewClose, onClose, onReopen }`

Renders:
- OPEN periods at top with amber badge, "Preview" button and "Tutup Laporan" button
- CLOSED periods below with green badge, "Lihat Detail" and "Buka Kembali" button (with reason modal)
- REOPENED periods with orange badge, same buttons as OPEN

### Step 21 — CREATE `src/components/report-periods/PeriodCloseModal.tsx`

Props: `{ isOpen, period, preview: ReportPeriodClosePreview | null, isLoading, onClose, onConfirmClose }`

Sections:
1. Period header: name, date range
2. Loading state: spinner while preview fetches
3. Ready records summary: `✅ N record — harga ditemukan`
4. Pending records list: `⚠️ N record — harga tidak ditemukan` + species/supplier of each
5. Totals: volume + estimated net payable IDR
6. Footer: `[Batal]` + `[Tutup Laporan (N record)]` — disabled if 0 ready records

---

## Steps 22–23 — Pages

### Step 22 — CREATE `app/prices/page.tsx`

```tsx
'use client';
import { useTimberPrices } from '@/src/hooks/useTimberPrices';
import { useWoodRecords } from '@/src/hooks/useWoodRecords';
import { useAuth } from '@/src/hooks/useAuth';
import { PriceTable } from '@/src/components/prices/PriceTable';
import { PriceFormModal } from '@/src/components/prices/PriceFormModal';
import { useState } from 'react';
import { DollarSign } from 'lucide-react';

export default function PricesPage() {
  const { canWrite } = useAuth();
  const { activeEntries, expiredEntries, isLoading, saveEntry, deleteEntry } = useTimberPrices();
  const { speciesList } = useWoodRecords();
  const [editingEntry, setEditingEntry] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  return (
    <div className="flex flex-col gap-5">
      {/* Page Header */}
      {/* PriceTable + PriceFormModal */}
    </div>
  );
}
```

### Step 23 — CREATE `app/report-periods/page.tsx`

Same pattern: uses `useReportPeriods`, renders `PeriodList` and `PeriodCloseModal`.
Includes "Buat Periode Baru" form (inline or small modal) with name, startDate, endDate, notes.

---

## Step 24 — MODIFY `src/components/layout/nav-config.ts`

Find the nav items array and add two new entries in the appropriate section
(between "Pending Harga" and "Form Pembayaran" makes logical sense):

```ts
{
  label: 'Tabel Harga',
  labelCn: '价格表',
  href: '/prices',
  icon: 'DollarSign',
  section: 'operations',
  minRole: 1,           // visible to all, edit L1 only
},
{
  label: 'Periode Laporan',
  labelCn: '结账周期',
  href: '/report-periods',
  icon: 'ClipboardCheck',
  section: 'operations',
  minRole: 1,
},
```

---

## Step 25 — MODIFY `src/components/pricing/PendingPricingTable.tsx`

Two edits:

### Edit A — Read-only lock guard on price input

Find the `<input type="number" ...>` for price in `PendingTableRow`.
Add a condition: if `record.isLocked`, render a read-only badge instead:

```tsx
{record.isLocked ? (
  <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
    <Lock className="w-3.5 h-3.5 text-gray-400" />
    <span className="font-mono font-semibold">
      {record.timberPricePerM3?.toLocaleString('id-ID') ?? '—'}
    </span>
    <span className="text-[10px] text-gray-400 ml-1">Terkunci</span>
  </div>
) : (
  <input type="number" ... />   // existing input unchanged
)}
```

### Edit B — Add "Sumber Harga" column

Add a small column after the PPh rate column showing:
```tsx
<span className="text-[10px] text-gray-400">
  {record.priceEntryId ? '📋 Tabel Harga' : '✏️ Manual'}
</span>
```

---

## Summary Checklist

```
[ ] MODIFY  src/types/index.ts                                    — 3 new types + 3 fields on WoodReceivingRecord
[ ] MODIFY  src/persistence/sqlite/migrations.ts                  — 2 new tables + 3 ALTER columns
[ ] CREATE  src/persistence/sqlite/price-queries.ts               — TimberPriceEntry CRUD
[ ] CREATE  src/persistence/sqlite/report-period-queries.ts       — ReportPeriod CRUD
[ ] CREATE  src/utils/price-lookup.ts                             — pure lookup logic
[ ] CREATE  src/utils/report-period-close.ts                      — preview + execute close
[ ] MODIFY  src/persistence/server-master-data-bridge.ts          — 8 new methods
[ ] MODIFY  src/persistence/server-record-store.ts                — 8 facade pass-throughs
[ ] CREATE  app/api/prices/route.ts                               — GET + POST
[ ] CREATE  app/api/prices/[id]/route.ts                          — PATCH + DELETE
[ ] CREATE  app/api/report-periods/route.ts                       — GET + POST
[ ] CREATE  app/api/report-periods/[id]/route.ts                  — GET detail
[ ] CREATE  app/api/report-periods/[id]/preview/route.ts          — GET preview
[ ] CREATE  app/api/report-periods/[id]/close/route.ts            — PATCH close
[ ] CREATE  app/api/report-periods/[id]/reopen/route.ts           — PATCH reopen
[ ] CREATE  src/hooks/useTimberPrices.ts                          — hook tabel harga
[ ] CREATE  src/hooks/useReportPeriods.ts                         — hook periode laporan
[ ] CREATE  src/components/prices/PriceTable.tsx                  — tabel harga UI
[ ] CREATE  src/components/prices/PriceFormModal.tsx              — form modal
[ ] CREATE  src/components/report-periods/PeriodList.tsx          — list periode
[ ] CREATE  src/components/report-periods/PeriodCloseModal.tsx    — preview + close modal
[ ] CREATE  app/prices/page.tsx                                   — halaman /prices
[ ] CREATE  app/report-periods/page.tsx                           — halaman /report-periods
[ ] MODIFY  src/components/layout/nav-config.ts                   — 2 nav items baru
[ ] MODIFY  src/components/pricing/PendingPricingTable.tsx        — lock guard + sumber harga column
```

---

## Risk Notes

| Risk | Mitigasi |
|------|---------|
| `receiving_items` vs flat `WoodReceivingRecord` mismatch | Close logic harus update `receiving_items` via `item_id`, bukan `id` di flat record. Pastikan `item_id` selalu terisi saat flatten manifest. |
| Record yang dibuat manual (bukan dari manifest) tidak punya `item_id` | Untuk record single-item, gunakan `id` sebagai fallback key di UPDATE |
| Harga sudah di-apply manual sebelum penutupan laporan | `executePeriodClose` hanya skip record `isLocked = true` atau yang sudah punya harga. Record yang sudah dipriced manual akan di-assign `reportPeriodId` + `isLocked` tanpa mengubah harganya. |
| Reopen laporan — record yang sudah masuk PaymentForm PAID | API reopen hanya ubah status period, tidak unlock record. Dokumen spec sudah menjelaskan warning ini ke user. |
| Overlap date range antar period | Tidak diblok di DB (tidak ada constraint), tapi preview akan menampilkan record yang sama di dua period. Implementor bisa tambah validasi opsional di POST /api/report-periods. |

