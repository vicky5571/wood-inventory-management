# DB Fix 06 — `tenant_id` FK di Tabel Baru

**Severity:** 🟡 LOW — kelengkapan constraint, tidak ada bug aktif
**Problem:** `timber_price_entries` dan `report_periods` tidak punya `REFERENCES tenants(id)`
**Affects:** `migrations.ts` only (DB Fix 01 sudah menangani `timber_price_entries`)

---

## Masalah Detail

Semua tabel lama punya:
```sql
tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE
```

Dua tabel baru dari price-database-impl.md melewatkan ini:
```sql
-- timber_price_entries (akan diperbaiki di DB Fix 01):
tenant_id TEXT NOT NULL DEFAULT 'default-tenant'   -- tidak ada REFERENCES

-- report_periods (belum diperbaiki):
tenant_id TEXT NOT NULL DEFAULT 'default-tenant'   -- tidak ada REFERENCES
```

Karena saat ini hanya satu tenant (`'default-tenant'`), ini tidak menyebabkan
bug nyata. Tapi konsistensi schema penting untuk ketika multi-tenancy diaktifkan.

---

## Solusi

DB Fix 01 sudah menangani `timber_price_entries` dengan rebuild tabel penuh
(include `REFERENCES tenants(id) ON DELETE CASCADE`).

Untuk `report_periods`: karena SQLite tidak support ALTER COLUMN untuk
menambah FK constraint, perlu rebuild tabel juga.

---

## Perubahan yang Diperlukan

### `src/persistence/sqlite/migrations.ts`

Tambah migration block untuk rebuild `report_periods`:

```ts
// ── Migration: rebuild report_periods with tenant FK ─────────────────────
// Cek apakah sudah ada FK dengan cara cek PRAGMA foreign_key_list
const rpFkList = db.prepare(`PRAGMA foreign_key_list(report_periods)`).all() as { table: string }[];
const hasTenantsFK = rpFkList.some(fk => fk.table === 'tenants');

if (!hasTenantsFK) {
  db.prepare(`ALTER TABLE report_periods RENAME TO report_periods_old`).run();

  db.prepare(`
    CREATE TABLE report_periods (
      id                    TEXT PRIMARY KEY,
      tenant_id             TEXT NOT NULL DEFAULT 'default-tenant'
                              REFERENCES tenants(id) ON DELETE CASCADE,
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

  db.prepare(`
    INSERT INTO report_periods SELECT * FROM report_periods_old
  `).run();

  db.prepare(`DROP TABLE report_periods_old`).run();
}
```

> **Note:** Jalankan DB Fix 06 **setelah** DB Fix 01, karena DB Fix 01 sudah
> rebuild `timber_price_entries` dengan FK yang benar. DB Fix 06 hanya perlu
> handle `report_periods`.

---

## Checklist

```
[ ] MODIFY  src/persistence/sqlite/migrations.ts  — rebuild report_periods dengan tenant FK
```

> `timber_price_entries` sudah di-handle di DB Fix 01 — tidak perlu diulang di sini.

---

## Risk

| Risk | Mitigasi |
|------|---------|
| Data di `report_periods` hilang saat rebuild | `INSERT INTO ... SELECT * FROM old` — semua data di-copy sebelum drop. |
| `PRAGMA foreign_key_list` check tidak akurat di semua SQLite version | Fallback: cek dengan try/catch pada INSERT dummy yang melanggar FK — tapi `PRAGMA` lebih clean. |
