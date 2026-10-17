# Relational Database Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the timber inventory data persistence layer from a flat JSON file (`data/wood_records.json`) into a normalized relational SQLite database (`node:sqlite`) with Header-Detail split, foreign key constraints, dynamic views, and 100% backward compatibility with the existing Buku Besar ledger UI.

**Architecture:**
- Native Node.js 26.8.1 `node:sqlite` engine (`DatabaseSync`) providing zero external npm dependencies, WAL concurrency mode, and ACID transactions.
- 3NF relational schema partitioning data into `tenants`, `suppliers`, `wood_species`, `storage_yards`, `storage_lots`, `receiving_manifests` (Header), and `receiving_items` (Detail).
- SQL views (`v_receiving_item_financials`, `v_receiving_manifest_summaries`, `v_buku_besar_flat`) dynamically computing taxes, totals, discrepancies, and exposing an identical flat projection for the existing frontend.
- `SqliteRecordStore` implementing the exact interface of `ServerRecordStore` to guarantee zero UI regressions across all 37 test suites.
- Automated migration utility migrating existing JSON records on startup with zero data loss.

**Tech Stack:** Node.js 26.8.1 (Native ESM & TypeScript), `node:sqlite`, Next.js 15.5, `node:test` + `node:assert`.

**Spec:** `docs/superpowers/specs/2026-10-18-relational-database-architecture-design.md`

## Global Constraints
- Maximum file size: keep all modules strictly under ~250 LOC (Strangler pattern on God files).
- Single Source of Truth (SSOT): all domain interfaces and entities must be imported from `src/types/index.ts`.
- Zero external dependencies: rely strictly on native Node.js 26 `node:sqlite` and existing project primitives.
- Concurrency discipline: WAL journal mode, `PRAGMA foreign_keys = ON;`, busy timeout 5000ms.
- Automated test coverage: every task must provide automated tests executed via `node --test` with 0 failures.
- Language standard: source code, types, and git commits in English; user-facing labels bilingual Indonesian-Chinese.

---

### Task 1: SQLite Database Engine & Connection Manager (`src/persistence/sqlite/db.ts`)

**Files:**
- Create: `src/persistence/sqlite/db.ts`
- Test: `test/sqlite-db.test.ts`

**Interfaces:**
- Consumes: `node:sqlite` (`DatabaseSync`)
- Produces: `createSqliteDatabase(dbPath?: string): DatabaseSync`
- Produces: `getDatabaseConnection(): DatabaseSync`
- Produces: `closeDatabaseConnection(): void`

- [ ] **Step 1: Write the failing test**

```ts
// test/sqlite-db.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSqliteDatabase } from '../src/persistence/sqlite/db.ts';

test('SQLite Connection Manager Suite', async (t) => {
  await t.test('creates an in-memory database with foreign keys and WAL mode configured', () => {
    const db = createSqliteDatabase(':memory:');
    try {
      const fkResult = db.prepare('PRAGMA foreign_keys;').get() as { foreign_keys: number };
      assert.strictEqual(fkResult.foreign_keys, 1, 'foreign_keys pragma must be enabled (1)');

      const busyTimeout = db.prepare('PRAGMA busy_timeout;').get() as { timeout: number };
      assert.strictEqual(busyTimeout.timeout, 5000, 'busy_timeout must be configured to 5000ms');
    } finally {
      db.close();
    }
  });

  await t.test('executes basic SQL queries and transactions', () => {
    const db = createSqliteDatabase(':memory:');
    try {
      db.exec('CREATE TABLE test_items (id TEXT PRIMARY KEY, val TEXT);');
      const insert = db.prepare('INSERT INTO test_items (id, val) VALUES (?, ?);');
      insert.run('1', 'Alpha');
      insert.run('2', 'Beta');

      const rows = db.prepare('SELECT id, val FROM test_items ORDER BY id;').all() as Array<{ id: string; val: string }>;
      assert.strictEqual(rows.length, 2);
      assert.strictEqual(rows[0].val, 'Alpha');
      assert.strictEqual(rows[1].val, 'Beta');
    } finally {
      db.close();
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/sqlite-db.test.ts`
Expected: FAIL with "Cannot find module '../src/persistence/sqlite/db.ts'"

- [ ] **Step 3: Write minimal implementation**

```ts
// src/persistence/sqlite/db.ts
import path from 'node:path';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

let globalDbInstance: DatabaseSync | null = null;

export function createSqliteDatabase(dbPath?: string): DatabaseSync {
  const resolvedPath = dbPath || process.env.WOOD_DB_PATH || path.join(process.cwd(), 'data', 'wood_inventory.db');

  if (resolvedPath !== ':memory:') {
    const dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new DatabaseSync(resolvedPath);

  // Enable foreign keys and pragmas
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA busy_timeout = 5000;');

  if (resolvedPath !== ':memory:') {
    db.exec('PRAGMA journal_mode = WAL;');
    db.exec('PRAGMA synchronous = NORMAL;');
  }

  return db;
}

export function getDatabaseConnection(): DatabaseSync {
  if (!globalDbInstance) {
    globalDbInstance = createSqliteDatabase();
  }
  return globalDbInstance;
}

export function closeDatabaseConnection(): void {
  if (globalDbInstance) {
    try {
      globalDbInstance.close();
    } catch {
      // Ignore if already closed
    }
    globalDbInstance = null;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/sqlite-db.test.ts`
Expected: PASS with 2 tests passing

- [ ] **Step 5: Commit**

```bash
git add src/persistence/sqlite/db.ts test/sqlite-db.test.ts
git commit -m "feat(persistence): add native sqlite connection manager with WAL and foreign keys"
```

---

### Task 2: Relational DDL Migrations & Dynamic Views (`src/persistence/sqlite/migrations.ts`)

**Files:**
- Create: `src/persistence/sqlite/migrations.ts`
- Test: `test/sqlite-migrations.test.ts`

**Interfaces:**
- Consumes: `DatabaseSync` from `node:sqlite`
- Produces: `runMigrations(db: DatabaseSync): void`

- [ ] **Step 1: Write the failing test**

```ts
// test/sqlite-migrations.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSqliteDatabase } from '../src/persistence/sqlite/db.ts';
import { runMigrations } from '../src/persistence/sqlite/migrations.ts';

test('SQLite Migrations Suite', async (t) => {
  await t.test('creates all master tables, operational tables, and views idempotently', () => {
    const db = createSqliteDatabase(':memory:');
    try {
      // Run once
      runMigrations(db);
      // Run twice (idempotence verification)
      runMigrations(db);

      const tables = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;"
      ).all() as Array<{ name: string }>;
      const tableNames = tables.map((t) => t.name);

      assert.ok(tableNames.includes('tenants'), 'must create tenants table');
      assert.ok(tableNames.includes('wood_species'), 'must create wood_species table');
      assert.ok(tableNames.includes('storage_yards'), 'must create storage_yards table');
      assert.ok(tableNames.includes('storage_lots'), 'must create storage_lots table');
      assert.ok(tableNames.includes('suppliers'), 'must create suppliers table');
      assert.ok(tableNames.includes('receiving_manifests'), 'must create receiving_manifests table');
      assert.ok(tableNames.includes('receiving_items'), 'must create receiving_items table');

      const views = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='view' ORDER BY name;"
      ).all() as Array<{ name: string }>;
      const viewNames = views.map((v) => v.name);

      assert.ok(viewNames.includes('v_receiving_item_financials'), 'must create v_receiving_item_financials view');
      assert.ok(viewNames.includes('v_receiving_manifest_summaries'), 'must create v_receiving_manifest_summaries view');
      assert.ok(viewNames.includes('v_buku_besar_flat'), 'must create v_buku_besar_flat view');
    } finally {
      db.close();
    }
  });

  await t.test('enforces foreign key constraints strictly', () => {
    const db = createSqliteDatabase(':memory:');
    try {
      runMigrations(db);

      // Attempting to insert a receiving manifest with nonexistent supplier must throw FK constraint error
      assert.throws(() => {
        db.prepare(`
          INSERT INTO receiving_manifests (
            id, tenant_id, manifest_number, receipt_date, truck_plate_number,
            forestry_doc_number, receipt_number, contract_number, supplier_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          'm-1', 'tenant-1', 'MAN-01', '2026-10-18', 'B 1234 CD',
          'DOC-01', 'KW-01', 'CTR-01', 'nonexistent-supplier'
        );
      }, /FOREIGN KEY constraint failed/);
    } finally {
      db.close();
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/sqlite-migrations.test.ts`
Expected: FAIL with "Cannot find module '../src/persistence/sqlite/migrations.ts'"

- [ ] **Step 3: Write minimal implementation**

```ts
// src/persistence/sqlite/migrations.ts
import type { DatabaseSync } from 'node:sqlite';

export function runMigrations(db: DatabaseSync): void {
  db.exec('PRAGMA foreign_keys = ON;');

  db.exec(`
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS wood_species (
      id TEXT PRIMARY KEY,
      tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
      code TEXT NOT NULL UNIQUE,
      common_name TEXT NOT NULL,
      botanical_name TEXT,
      density_kg_m3 REAL NOT NULL DEFAULT 650.0,
      is_hardwood INTEGER NOT NULL DEFAULT 1 CHECK (is_hardwood IN (0, 1)),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_species_name ON wood_species(common_name);

    CREATE TABLE IF NOT EXISTS storage_yards (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      yard_code TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(tenant_id, yard_code)
    );

    CREATE TABLE IF NOT EXISTS storage_lots (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      yard_id TEXT NOT NULL REFERENCES storage_yards(id) ON DELETE CASCADE,
      lot_code TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'FULL', 'MAINTENANCE')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(tenant_id, yard_id, lot_code)
    );
    CREATE INDEX IF NOT EXISTS idx_storage_lots_code ON storage_lots(tenant_id, lot_code);

    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      contact_person TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      tax_id_npwp TEXT,
      is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(tenant_id, code)
    );
    CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(tenant_id, name);

    CREATE TABLE IF NOT EXISTS receiving_manifests (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      manifest_number TEXT NOT NULL,
      receipt_date TEXT NOT NULL,
      doc_date TEXT,
      truck_plate_number TEXT NOT NULL,
      forestry_doc_number TEXT NOT NULL,
      receipt_number TEXT NOT NULL,
      contract_number TEXT NOT NULL,
      supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
      freight_rate_per_m3 REAL NOT NULL DEFAULT 0.0 CHECK (freight_rate_per_m3 >= 0),
      freight_pph_rate REAL NOT NULL DEFAULT 2.0 CHECK (freight_pph_rate >= 0),
      broker_fee REAL NOT NULL DEFAULT 0.0 CHECK (broker_fee >= 0),
      payment_status TEXT NOT NULL DEFAULT 'UNPAID' CHECK (payment_status IN ('UNPAID', 'PARTIAL', 'PAID')),
      invoice_number TEXT,
      payment_date TEXT,
      payment_notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(tenant_id, manifest_number)
    );
    CREATE INDEX IF NOT EXISTS idx_manifests_date ON receiving_manifests(tenant_id, receipt_date);
    CREATE INDEX IF NOT EXISTS idx_manifests_truck ON receiving_manifests(tenant_id, truck_plate_number);
    CREATE INDEX IF NOT EXISTS idx_manifests_invoice ON receiving_manifests(tenant_id, invoice_number);
    CREATE INDEX IF NOT EXISTS idx_manifests_supplier ON receiving_manifests(supplier_id);

    CREATE TABLE IF NOT EXISTS receiving_items (
      id TEXT PRIMARY KEY,
      manifest_id TEXT NOT NULL REFERENCES receiving_manifests(id) ON DELETE CASCADE,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      item_sequence INTEGER NOT NULL DEFAULT 1,
      species_id TEXT NOT NULL REFERENCES wood_species(id) ON DELETE RESTRICT,
      lot_id TEXT REFERENCES storage_lots(id) ON DELETE SET NULL,
      wood_length_m REAL NOT NULL CHECK (wood_length_m > 0),
      delivered_pieces INTEGER NOT NULL CHECK (delivered_pieces >= 0),
      delivered_volume_m3 REAL NOT NULL CHECK (delivered_volume_m3 >= 0),
      tally_pieces INTEGER NOT NULL CHECK (tally_pieces >= 0),
      tally_volume_m3 REAL NOT NULL CHECK (tally_volume_m3 >= 0),
      timber_price_per_m3 REAL NOT NULL DEFAULT 0.0 CHECK (timber_price_per_m3 >= 0),
      timber_pph_rate REAL NOT NULL DEFAULT 0.5 CHECK (timber_pph_rate >= 0),
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_items_manifest ON receiving_items(manifest_id);
    CREATE INDEX IF NOT EXISTS idx_items_species ON receiving_items(species_id);
    CREATE INDEX IF NOT EXISTS idx_items_lot ON receiving_items(lot_id);

    CREATE VIEW IF NOT EXISTS v_receiving_item_financials AS
    SELECT
      i.id AS item_id,
      i.manifest_id,
      i.tenant_id,
      i.item_sequence,
      i.species_id,
      s.common_name AS species_name,
      i.lot_id,
      l.lot_code AS kavling_number,
      y.name AS storage_yard,
      i.wood_length_m,
      i.delivered_pieces,
      i.delivered_volume_m3,
      i.tally_pieces,
      i.tally_volume_m3,
      (i.tally_pieces - i.delivered_pieces) AS piece_discrepancy,
      ROUND(i.tally_volume_m3 - i.delivered_volume_m3, 4) AS volume_discrepancy_m3,
      i.timber_price_per_m3,
      ROUND(i.tally_volume_m3 * i.timber_price_per_m3, 2) AS timber_gross_total,
      i.timber_pph_rate,
      ROUND((i.tally_volume_m3 * i.timber_price_per_m3) * (i.timber_pph_rate / 100.0), 2) AS timber_pph_amount,
      ROUND(
        (i.tally_volume_m3 * i.timber_price_per_m3) - 
        ((i.tally_volume_m3 * i.timber_price_per_m3) * (i.timber_pph_rate / 100.0)),
        2
      ) AS timber_net_payable
    FROM receiving_items i
    JOIN wood_species s ON i.species_id = s.id
    LEFT JOIN storage_lots l ON i.lot_id = l.id
    LEFT JOIN storage_yards y ON l.yard_id = y.id;

    CREATE VIEW IF NOT EXISTS v_receiving_manifest_summaries AS
    SELECT
      m.id AS manifest_id,
      m.tenant_id,
      m.manifest_number,
      m.receipt_date,
      m.doc_date,
      m.truck_plate_number,
      m.forestry_doc_number,
      m.receipt_number,
      m.contract_number,
      m.supplier_id,
      sup.name AS supplier_name,
      COUNT(i.id) AS total_line_items,
      COALESCE(SUM(i.delivered_pieces), 0) AS total_delivered_pieces,
      COALESCE(ROUND(SUM(i.delivered_volume_m3), 4), 0.0) AS total_delivered_volume_m3,
      COALESCE(SUM(i.tally_pieces), 0) AS total_tally_pieces,
      COALESCE(ROUND(SUM(i.tally_volume_m3), 4), 0.0) AS total_tally_volume_m3,
      COALESCE(SUM(f.timber_gross_total), 0.0) AS total_timber_gross,
      COALESCE(SUM(f.timber_pph_amount), 0.0) AS total_timber_pph,
      COALESCE(SUM(f.timber_net_payable), 0.0) AS total_timber_net,
      m.freight_rate_per_m3,
      ROUND(COALESCE(SUM(i.tally_volume_m3), 0.0) * m.freight_rate_per_m3, 2) AS freight_gross_total,
      m.freight_pph_rate,
      ROUND((COALESCE(SUM(i.tally_volume_m3), 0.0) * m.freight_rate_per_m3) * (m.freight_pph_rate / 100.0), 2) AS freight_pph_amount,
      ROUND(
        (COALESCE(SUM(i.tally_volume_m3), 0.0) * m.freight_rate_per_m3) -
        ((COALESCE(SUM(i.tally_volume_m3), 0.0) * m.freight_rate_per_m3) * (m.freight_pph_rate / 100.0)),
        2
      ) AS freight_net_payable,
      m.broker_fee,
      ROUND(
        COALESCE(SUM(f.timber_net_payable), 0.0) +
        ((COALESCE(SUM(i.tally_volume_m3), 0.0) * m.freight_rate_per_m3) -
        ((COALESCE(SUM(i.tally_volume_m3), 0.0) * m.freight_rate_per_m3) * (m.freight_pph_rate / 100.0))) +
        m.broker_fee,
        2
      ) AS grand_net_payable,
      m.payment_status,
      m.invoice_number,
      m.payment_date,
      m.payment_notes,
      m.created_at,
      m.updated_at
    FROM receiving_manifests m
    JOIN suppliers sup ON m.supplier_id = sup.id
    LEFT JOIN receiving_items i ON m.id = i.manifest_id
    LEFT JOIN v_receiving_item_financials f ON i.id = f.item_id
    GROUP BY m.id;

    CREATE VIEW IF NOT EXISTS v_buku_besar_flat AS
    SELECT
      m.id AS id,
      m.id AS manifest_id,
      i.id AS item_id,
      m.tenant_id,
      m.receipt_date AS receiptDate,
      m.doc_date AS docDate,
      m.truck_plate_number AS truckPlateNumber,
      m.forestry_doc_number AS forestryDocNumber,
      m.receipt_number AS receiptNumber,
      m.contract_number AS contractNumber,
      sup.name AS supplierName,
      s.common_name AS woodSpecies,
      i.wood_length_m AS woodLengthM,
      COALESCE(l.lot_code, '') AS kavlingNumber,
      COALESCE(y.name, '') AS storageYard,
      i.delivered_pieces AS deliveredPieces,
      i.delivered_volume_m3 AS deliveredVolumeM3,
      i.tally_pieces AS tallyPieces,
      i.tally_volume_m3 AS tallyVolumeM3,
      i.timber_price_per_m3 AS timberPricePerM3,
      f.timber_gross_total AS timberGrossTotal,
      i.timber_pph_rate AS timberPphRate,
      f.timber_pph_amount AS timberPphAmount,
      f.timber_net_payable AS timberNetPayable,
      m.freight_rate_per_m3 AS freightRatePerM3,
      ROUND(i.tally_volume_m3 * m.freight_rate_per_m3, 2) AS freightGrossTotal,
      ROUND((i.tally_volume_m3 * m.freight_rate_per_m3) * (m.freight_pph_rate / 100.0), 2) AS freightPphAmount,
      ROUND(
        (i.tally_volume_m3 * m.freight_rate_per_m3) -
        ((i.tally_volume_m3 * m.freight_rate_per_m3) * (m.freight_pph_rate / 100.0)),
        2
      ) AS freightNetPayable,
      m.broker_fee AS brokerFee,
      ROUND(
        f.timber_net_payable +
        ((i.tally_volume_m3 * m.freight_rate_per_m3) -
        ((i.tally_volume_m3 * m.freight_rate_per_m3) * (m.freight_pph_rate / 100.0))) +
        m.broker_fee,
        2
      ) AS grandNetPayable,
      m.payment_status AS paymentStatus,
      m.invoice_number AS invoiceNumber,
      m.payment_date AS paymentDate,
      m.payment_notes AS paymentNotes,
      m.created_at AS createdAt,
      m.updated_at AS updatedAt
    FROM receiving_manifests m
    JOIN suppliers sup ON m.supplier_id = sup.id
    JOIN receiving_items i ON m.id = i.manifest_id
    JOIN wood_species s ON i.species_id = s.id
    JOIN v_receiving_item_financials f ON i.id = f.item_id
    LEFT JOIN storage_lots l ON i.lot_id = l.id
    LEFT JOIN storage_yards y ON l.yard_id = y.id;
  `);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/sqlite-migrations.test.ts`
Expected: PASS with 2 tests passing

- [ ] **Step 5: Commit**

```bash
git add src/persistence/sqlite/migrations.ts test/sqlite-migrations.test.ts
git commit -m "feat(persistence): implement normalized relational schema ddl and dynamic calculation views"
```

---

### Task 3: Domain Types Modernization (`src/types/index.ts`)

**Files:**
- Modify: `src/types/index.ts`
- Test: `test/timber-calc.test.ts`

**Interfaces:**
- Consumes: Existing domain types
- Produces: `Tenant`, `StorageYard`, `StorageLot`, `ReceivingManifest`, `ReceivingItem`, `ManifestWithItems`

- [ ] **Step 1: Write the failing test**

```ts
// In test/timber-calc.test.ts, add a subtest verifying relational interfaces compile and map to flat records:
test('Relational Domain Type Invariants Suite', async (t) => {
  await t.test('ManifestWithItems matches aggregate financial properties', async () => {
    const { getDatabaseConnection } = await import('../src/persistence/sqlite/db.ts');
    assert.ok(getDatabaseConnection);
  });
});
```

- [ ] **Step 2: Run test to verify baseline**

Run: `node --test test/timber-calc.test.ts`
Expected: PASS

- [ ] **Step 3: Update `src/types/index.ts`**

Add the formal relational types to `src/types/index.ts`:

```ts
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface StorageYard {
  id: string;
  tenantId: string;
  yardCode: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StorageLot {
  id: string;
  tenantId: string;
  yardId: string;
  lotCode: string;
  status: 'ACTIVE' | 'FULL' | 'MAINTENANCE';
  createdAt: string;
  updatedAt: string;
}

export interface ReceivingManifest {
  id: string;
  tenantId: string;
  manifestNumber: string;
  receiptDate: string;
  docDate?: string;
  truckPlateNumber: string;
  forestryDocNumber: string;
  receiptNumber: string;
  contractNumber: string;
  supplierId: string;
  freightRatePerM3: number;
  freightPphRate: number;
  brokerFee: number;
  paymentStatus: PaymentStatus;
  invoiceNumber?: string;
  paymentDate?: string;
  paymentNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReceivingItem {
  id: string;
  manifestId: string;
  tenantId: string;
  itemSequence: number;
  speciesId: string;
  lotId?: string;
  woodLengthM: number;
  deliveredPieces: number;
  deliveredVolumeM3: number;
  tallyPieces: number;
  tallyVolumeM3: number;
  timberPricePerM3: number;
  timberPphRate: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ManifestWithItems extends ReceivingManifest {
  supplierName: string;
  items: Array<ReceivingItem & {
    speciesName: string;
    kavlingNumber?: string;
    storageYard?: string;
    timberGrossTotal: number;
    timberPphAmount: number;
    timberNetPayable: number;
    volumeDiscrepancyM3: number;
    pieceDiscrepancy: number;
  }>;
  summary: {
    totalDeliveredPieces: number;
    totalDeliveredVolumeM3: number;
    totalTallyPieces: number;
    totalTallyVolumeM3: number;
    totalTimberGross: number;
    totalTimberPph: number;
    totalTimberNet: number;
    freightGrossTotal: number;
    freightPphAmount: number;
    freightNetPayable: number;
    grandNetPayable: number;
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/timber-calc.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts test/timber-calc.test.ts
git commit -m "feat(types): define relational entities Tenant, ReceivingManifest, ReceivingItem, and ManifestWithItems"
```

---

### Task 4: JSON Data Migration Utility (`src/persistence/sqlite/migrate-json.ts`)

**Files:**
- Create: `src/persistence/sqlite/migrate-json.ts`
- Test: `test/sqlite-migrate-json.test.ts`

**Interfaces:**
- Consumes: `WoodReceivingRecord[]` from `src/types/index.ts`
- Consumes: `DatabaseSync` from `node:sqlite`
- Produces: `migrateJsonToSqlite(db: DatabaseSync, records: WoodReceivingRecord[], tenantId?: string): { manifestsCount: number, itemsCount: number }`

- [ ] **Step 1: Write the failing test**

```ts
// test/sqlite-migrate-json.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSqliteDatabase } from '../src/persistence/sqlite/db.ts';
import { runMigrations } from '../src/persistence/sqlite/migrations.ts';
import { migrateJsonToSqlite } from '../src/persistence/sqlite/migrate-json.ts';
import { SEED_WOOD_RECORDS } from '../src/persistence/seed-data.ts';

test('JSON to SQLite Migration Utility Suite', async (t) => {
  await t.test('migrates SEED_WOOD_RECORDS and populates master data and flat view accurately', () => {
    const db = createSqliteDatabase(':memory:');
    try {
      runMigrations(db);

      const result = migrateJsonToSqlite(db, SEED_WOOD_RECORDS);
      assert.strictEqual(result.manifestsCount, SEED_WOOD_RECORDS.length);
      assert.strictEqual(result.itemsCount, SEED_WOOD_RECORDS.length);

      // Verify v_buku_besar_flat contains exactly the expected records
      const flatRows = db.prepare('SELECT * FROM v_buku_besar_flat ORDER BY receiptDate DESC, id ASC;').all() as any[];
      assert.strictEqual(flatRows.length, SEED_WOOD_RECORDS.length);

      const firstSeed = SEED_WOOD_RECORDS[0];
      const matched = flatRows.find((r) => r.id === firstSeed.id);
      assert.ok(matched, 'seed record must exist in v_buku_besar_flat by id');
      assert.strictEqual(matched.truckPlateNumber, firstSeed.truckPlateNumber);
      assert.strictEqual(matched.supplierName, firstSeed.supplierName);
      assert.strictEqual(matched.woodSpecies, firstSeed.woodSpecies);
      assert.strictEqual(matched.tallyVolumeM3, firstSeed.tallyVolumeM3);
      assert.strictEqual(matched.grandNetPayable, firstSeed.grandNetPayable);
    } finally {
      db.close();
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/sqlite-migrate-json.test.ts`
Expected: FAIL with "Cannot find module '../src/persistence/sqlite/migrate-json.ts'"

- [ ] **Step 3: Write minimal implementation**

```ts
// src/persistence/sqlite/migrate-json.ts
import type { DatabaseSync } from 'node:sqlite';
import type { WoodReceivingRecord } from '../../types/index.ts';

export function migrateJsonToSqlite(
  db: DatabaseSync,
  records: WoodReceivingRecord[],
  tenantId = 'default-tenant'
): { manifestsCount: number; itemsCount: number } {
  // Ensure default tenant exists
  db.prepare(`
    INSERT INTO tenants (id, name, slug)
    VALUES (?, ?, ?)
    ON CONFLICT(id) DO NOTHING
  `).run(tenantId, 'Default Factory Tenant', 'default');

  const upsertSupplierStmt = db.prepare(`
    INSERT INTO suppliers (id, tenant_id, code, name, contact_person, is_active)
    VALUES (?, ?, ?, ?, ?, 1)
    ON CONFLICT(tenant_id, code) DO UPDATE SET name = excluded.name
  `);

  const upsertSpeciesStmt = db.prepare(`
    INSERT INTO wood_species (id, tenant_id, code, common_name)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(code) DO UPDATE SET common_name = excluded.common_name
  `);

  const upsertYardStmt = db.prepare(`
    INSERT INTO storage_yards (id, tenant_id, yard_code, name)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(tenant_id, yard_code) DO NOTHING
  `);

  const upsertLotStmt = db.prepare(`
    INSERT INTO storage_lots (id, tenant_id, yard_id, lot_code, status)
    VALUES (?, ?, ?, ?, 'ACTIVE')
    ON CONFLICT(tenant_id, yard_id, lot_code) DO NOTHING
  `);

  const insertManifestStmt = db.prepare(`
    INSERT INTO receiving_manifests (
      id, tenant_id, manifest_number, receipt_date, doc_date, truck_plate_number,
      forestry_doc_number, receipt_number, contract_number, supplier_id,
      freight_rate_per_m3, freight_pph_rate, broker_fee, payment_status,
      invoice_number, payment_date, payment_notes, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?
    )
    ON CONFLICT(id) DO UPDATE SET
      receipt_date = excluded.receipt_date,
      doc_date = excluded.doc_date,
      truck_plate_number = excluded.truck_plate_number,
      forestry_doc_number = excluded.forestry_doc_number,
      receipt_number = excluded.receipt_number,
      contract_number = excluded.contract_number,
      supplier_id = excluded.supplier_id,
      freight_rate_per_m3 = excluded.freight_rate_per_m3,
      broker_fee = excluded.broker_fee,
      payment_status = excluded.payment_status,
      invoice_number = excluded.invoice_number,
      payment_date = excluded.payment_date,
      payment_notes = excluded.payment_notes,
      updated_at = excluded.updated_at
  `);

  const insertItemStmt = db.prepare(`
    INSERT INTO receiving_items (
      id, manifest_id, tenant_id, item_sequence, species_id, lot_id,
      wood_length_m, delivered_pieces, delivered_volume_m3, tally_pieces,
      tally_volume_m3, timber_price_per_m3, timber_pph_rate, notes,
      created_at, updated_at
    ) VALUES (
      ?, ?, ?, 1, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?
    )
    ON CONFLICT(id) DO UPDATE SET
      species_id = excluded.species_id,
      lot_id = excluded.lot_id,
      wood_length_m = excluded.wood_length_m,
      delivered_pieces = excluded.delivered_pieces,
      delivered_volume_m3 = excluded.delivered_volume_m3,
      tally_pieces = excluded.tally_pieces,
      tally_volume_m3 = excluded.tally_volume_m3,
      timber_price_per_m3 = excluded.timber_price_per_m3,
      timber_pph_rate = excluded.timber_pph_rate,
      updated_at = excluded.updated_at
  `);

  const supplierMap = new Map<string, string>();
  const speciesMap = new Map<string, string>();
  const yardMap = new Map<string, string>();
  const lotMap = new Map<string, string>();

  let manifestsCount = 0;
  let itemsCount = 0;

  db.exec('BEGIN TRANSACTION;');
  try {
    for (const rec of records) {
      // 1. Supplier
      const supplierName = (rec.supplierName || 'Unknown Supplier').trim();
      let supplierId = supplierMap.get(supplierName);
      if (!supplierId) {
        const code = `SUP-${supplierName.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 10) || 'GEN'}`;
        supplierId = `sup-${Math.random().toString(36).slice(2, 9)}`;
        upsertSupplierStmt.run(supplierId, tenantId, code, supplierName, 'Contact Person');
        supplierMap.set(supplierName, supplierId);
      }

      // 2. Species
      const speciesName = (rec.woodSpecies || 'General Timber').trim();
      let speciesId = speciesMap.get(speciesName);
      if (!speciesId) {
        const code = `SP-${speciesName.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 10) || 'GEN'}`;
        speciesId = `sp-${Math.random().toString(36).slice(2, 9)}`;
        upsertSpeciesStmt.run(speciesId, tenantId, code, speciesName);
        speciesMap.set(speciesName, speciesId);
      }

      // 3. Storage Yard & Lot
      const yardName = (rec.storageYard || 'TPK-General').trim();
      let yardId = yardMap.get(yardName);
      if (!yardId) {
        const yardCode = `YD-${yardName.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8) || 'GEN'}`;
        yardId = `yard-${Math.random().toString(36).slice(2, 9)}`;
        upsertYardStmt.run(yardId, tenantId, yardCode, yardName);
        yardMap.set(yardName, yardId);
      }

      const lotCode = (rec.kavlingNumber || 'KAV-GEN').trim();
      const lotKey = `${yardId}_${lotCode}`;
      let lotId = lotMap.get(lotKey);
      if (!lotId) {
        lotId = `lot-${Math.random().toString(36).slice(2, 9)}`;
        upsertLotStmt.run(lotId, tenantId, yardId, lotCode);
        lotMap.set(lotKey, lotId);
      }

      // 4. Manifest
      const manifestId = rec.id || `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const manifestNumber = rec.receiptNumber || `MAN-${manifestId}`;
      const now = new Date().toISOString();

      insertManifestStmt.run(
        manifestId,
        tenantId,
        manifestNumber,
        rec.receiptDate,
        rec.docDate || null,
        rec.truckPlateNumber,
        rec.forestryDocNumber,
        rec.receiptNumber,
        rec.contractNumber,
        supplierId,
        rec.freightRatePerM3 || 0,
        2.0,
        rec.brokerFee || 0,
        rec.paymentStatus || 'UNPAID',
        rec.invoiceNumber || null,
        rec.paymentDate || null,
        rec.paymentNotes || null,
        rec.createdAt || now,
        rec.updatedAt || now
      );
      manifestsCount++;

      // 5. Receiving Item
      const itemId = `item-${manifestId}`;
      insertItemStmt.run(
        itemId,
        manifestId,
        tenantId,
        speciesId,
        lotId,
        rec.woodLengthM || 4.0,
        rec.deliveredPieces || 0,
        rec.deliveredVolumeM3 || 0,
        rec.tallyPieces || 0,
        rec.tallyVolumeM3 || 0,
        rec.timberPricePerM3 || 0,
        rec.timberPphRate || 0.5,
        null,
        rec.createdAt || now,
        rec.updatedAt || now
      );
      itemsCount++;
    }

    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }

  return { manifestsCount, itemsCount };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/sqlite-migrate-json.test.ts`
Expected: PASS with 1 test passing

- [ ] **Step 5: Commit**

```bash
git add src/persistence/sqlite/migrate-json.ts test/sqlite-migrate-json.test.ts
git commit -m "feat(persistence): implement JSON to SQLite relational migration utility"
```

---

### Task 5: Relational Record Store (`SqliteRecordStore` in `src/persistence/sqlite-record-store.ts`)

**Files:**
- Create: `src/persistence/sqlite-record-store.ts`
- Test: `test/sqlite-record-store.test.ts`

**Interfaces:**
- Consumes: `WoodReceivingRecord` from `src/types/index.ts`
- Produces: `SqliteRecordStore` with `getAll()`, `getById()`, `save()`, `delete()`, `reset()`

- [ ] **Step 1: Write the failing test**

```ts
// test/sqlite-record-store.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { SqliteRecordStore } from '../src/persistence/sqlite-record-store.ts';
import type { WoodReceivingRecord } from '../src/types/index.ts';

test('SqliteRecordStore CRUD & Contract Suite', async (t) => {
  const store = new SqliteRecordStore(':memory:');

  await t.test('initializes and hydrates seed data automatically on first getAll', async () => {
    const records = await store.getAll();
    assert.ok(records.length > 0, 'must have hydrated seed records');
    assert.ok(records[0].grandNetPayable > 0, 'must have calculated grandNetPayable');
  });

  await t.test('saves new record and returns fully computed record', async () => {
    const newRecord: WoodReceivingRecord = {
      id: '',
      receiptDate: '2026-10-18',
      truckPlateNumber: 'B 9999 XYZ',
      forestryDocNumber: 'SKSHHK-NEW-01',
      receiptNumber: 'KW-NEW-01',
      contractNumber: 'CTR-NEW-01',
      supplierName: 'PT Kayu Bersama',
      woodSpecies: 'Teak / Jati (柚木)',
      woodLengthM: 4.0,
      kavlingNumber: 'KAV-NEW',
      storageYard: 'TPK-Barat',
      deliveredPieces: 100,
      deliveredVolumeM3: 20.0,
      tallyPieces: 100,
      tallyVolumeM3: 20.0,
      timberPricePerM3: 3000000,
      timberGrossTotal: 0,
      timberPphRate: 0.5,
      timberPphAmount: 0,
      timberNetPayable: 0,
      freightRatePerM3: 100000,
      freightGrossTotal: 0,
      freightPphAmount: 0,
      freightNetPayable: 0,
      brokerFee: 0,
      grandNetPayable: 0,
      createdAt: '',
      updatedAt: '',
    };

    const saved = await store.save(newRecord);
    assert.ok(saved.id.length > 0, 'must assign an ID');
    assert.strictEqual(saved.timberGrossTotal, 60000000);
    assert.strictEqual(saved.timberPphAmount, 300000);
    assert.strictEqual(saved.timberNetPayable, 59700000);
    assert.strictEqual(saved.freightGrossTotal, 2000000);
    assert.strictEqual(saved.grandNetPayable, 61660000);

    const fetched = await store.getById(saved.id);
    assert.ok(fetched);
    assert.strictEqual(fetched?.truckPlateNumber, 'B 9999 XYZ');
  });

  await t.test('deletes record by id', async () => {
    const records = await store.getAll();
    const target = records[0];
    const deleted = await store.delete(target.id);
    assert.strictEqual(deleted, true);

    const check = await store.getById(target.id);
    assert.strictEqual(check, null);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/sqlite-record-store.test.ts`
Expected: FAIL with "Cannot find module '../src/persistence/sqlite-record-store.ts'"

- [ ] **Step 3: Write minimal implementation**

```ts
// src/persistence/sqlite-record-store.ts
import type { DatabaseSync } from 'node:sqlite';
import { createSqliteDatabase } from './sqlite/db.ts';
import { runMigrations } from './sqlite/migrations.ts';
import { migrateJsonToSqlite } from './sqlite/migrate-json.ts';
import { SEED_WOOD_RECORDS } from './seed-data.ts';
import type { WoodReceivingRecord } from '../types/index.ts';

export class SqliteRecordStore {
  private db: DatabaseSync;
  private initialized = false;

  constructor(dbPath?: string) {
    this.db = createSqliteDatabase(dbPath);
    this.ensureInitialized();
  }

  private ensureInitialized(): void {
    if (this.initialized) return;
    runMigrations(this.db);

    const countRow = this.db.prepare('SELECT COUNT(*) AS c FROM receiving_manifests;').get() as { c: number };
    if (countRow.c === 0) {
      migrateJsonToSqlite(this.db, SEED_WOOD_RECORDS);
    }
    this.initialized = true;
  }

  async getAll(): Promise<WoodReceivingRecord[]> {
    this.ensureInitialized();
    const rows = this.db.prepare('SELECT * FROM v_buku_besar_flat ORDER BY receiptDate DESC, id ASC;').all();
    return rows as unknown as WoodReceivingRecord[];
  }

  async getById(id: string): Promise<WoodReceivingRecord | null> {
    this.ensureInitialized();
    const row = this.db.prepare('SELECT * FROM v_buku_besar_flat WHERE id = ?;').get(id);
    return (row as unknown as WoodReceivingRecord) || null;
  }

  async save(record: WoodReceivingRecord): Promise<WoodReceivingRecord> {
    this.ensureInitialized();
    const now = new Date().toISOString();
    const manifestId = record.id || `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const recordToSave: WoodReceivingRecord = {
      ...record,
      id: manifestId,
      createdAt: record.createdAt || now,
      updatedAt: now,
    };

    migrateJsonToSqlite(this.db, [recordToSave]);
    const saved = await this.getById(manifestId);
    if (!saved) {
      throw new Error(`Failed to save record ${manifestId}`);
    }
    return saved;
  }

  async delete(id: string): Promise<boolean> {
    this.ensureInitialized();
    const result = this.db.prepare('DELETE FROM receiving_manifests WHERE id = ?;').run(id);
    return Number(result.changes) > 0;
  }

  async reset(): Promise<WoodReceivingRecord[]> {
    this.ensureInitialized();
    this.db.exec('DELETE FROM receiving_items;');
    this.db.exec('DELETE FROM receiving_manifests;');
    migrateJsonToSqlite(this.db, SEED_WOOD_RECORDS);
    return this.getAll();
  }
}

export const sqliteRecordStore = new SqliteRecordStore();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/sqlite-record-store.test.ts`
Expected: PASS with 3 tests passing

- [ ] **Step 5: Commit**

```bash
git add src/persistence/sqlite-record-store.ts test/sqlite-record-store.test.ts
git commit -m "feat(persistence): implement SqliteRecordStore with dynamic view calculations"
```

---

### Task 6: Server Persistence Wire-Up & API Integration (`src/persistence/server-record-store.ts`)

**Files:**
- Modify: `src/persistence/server-record-store.ts`
- Test: `test/server-record-store.test.ts`
- Test: `test/useWoodRecords.test.ts`

**Interfaces:**
- Wire `serverRecordStore` to use `sqliteRecordStore` under the hood.
- All existing tests using `serverRecordStore` continue to pass without changes to their test contracts.

- [ ] **Step 1: Run existing server record store tests to verify baseline**

Run: `node --test test/server-record-store.test.ts`
Expected: PASS

- [ ] **Step 2: Update `src/persistence/server-record-store.ts`**

Update `src/persistence/server-record-store.ts` to seamlessly delegate to `SqliteRecordStore` while maintaining file fallback capability for zero breaking changes.

- [ ] **Step 3: Run tests to verify compatibility**

Run: `node --test test/server-record-store.test.ts`
Expected: PASS

- [ ] **Step 4: Run full test suite**

Run: `npm test`
Expected: PASS across all 37 test suites

- [ ] **Step 5: Commit**

```bash
git add src/persistence/server-record-store.ts
git commit -m "feat(persistence): bridge ServerRecordStore to native SQLite persistence"
```

---

### Task 7: Full Regression & Build Verification

**Files:**
- None (Verification task)

- [ ] **Step 1: Execute all unit and contract tests**

Run: `npm test`
Expected: 100% PASS with 0 failures

- [ ] **Step 2: Run Next.js production build**

Run: `npm run build`
Expected: Compiled successfully with 0 TypeScript or lint errors

- [ ] **Step 3: Commit and summarize**

```bash
git status
```

