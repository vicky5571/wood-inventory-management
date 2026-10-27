# DB Fix 04 — `kavlingNumber` FK di Sales, Production, Sorting

**Severity:** 🟠 MEDIUM — kalkulasi stok kavling bisa salah karena string mismatch
**Problem:** Hanya `receiving_items` pakai `lot_id FK`. Sales/production/sorting pakai string bebas.
**Affects:** `aggregateAllLotBalances()`, inventory view, stok per kavling calculation

---

## Masalah Detail

`aggregateAllLotBalances()` di `src/utils/lot-balance.ts` (atau equivalent)
menghitung stok per kavling dengan menggabungkan data dari 4 sumber:

```
Stok kavling = Σ receiving (tallyVolumeM3)
             - Σ sales (volumeM3)
             - Σ production (inputVolumeM3)
             +/- Σ sorting (source - target)
```

Semua penggabungan ini pakai **string match** pada `kavlingNumber`. Satu beda
spasi atau kapitalisasi → stok kavling salah hitung.

### Tabel terdampak

| Tabel | Kolom saat ini | Target |
|-------|---------------|--------|
| `receiving_items` | `lot_id FK → storage_lots(id)` ✅ | tidak berubah |
| `wood_sales_records` | `kavling_number TEXT` ❌ | tambah `lot_id FK` |
| `sawmill_production_records` | `source_kavling_number TEXT` ❌ | tambah `source_lot_id FK` |
| `stock_sorting_records` | `source_kavling_number TEXT` ❌ | tambah `source_lot_id FK` |
| `stock_sorting_records` | `target_kavling_number TEXT` ❌ | tambah `target_lot_id FK` |

---

## Solusi

Sama dengan pola sebelumnya: tambah kolom FK di samping string, backfill,
update save logic. `ON DELETE SET NULL` agar record tetap ada jika lot dihapus.

---

## Perubahan yang Diperlukan

### 1. `src/persistence/sqlite/migrations.ts`

```ts
// ── Migration: add lot_id FK to sales, production, sorting ───────────────
const lotMigrations = [
  { table: 'wood_sales_records',         newCol: 'lot_id',        srcCol: 'kavling_number' },
  { table: 'sawmill_production_records', newCol: 'source_lot_id', srcCol: 'source_kavling_number' },
  { table: 'stock_sorting_records',      newCol: 'source_lot_id', srcCol: 'source_kavling_number' },
  { table: 'stock_sorting_records',      newCol: 'target_lot_id', srcCol: 'target_kavling_number' },
];

for (const { table, newCol, srcCol } of lotMigrations) {
  const cols = (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map(c => c.name);
  if (!cols.includes(newCol)) {
    db.prepare(`
      ALTER TABLE ${table}
      ADD COLUMN ${newCol} TEXT REFERENCES storage_lots(id) ON DELETE SET NULL
    `).run();

    // Backfill by matching lot_code string
    db.prepare(`
      UPDATE ${table}
      SET ${newCol} = (
        SELECT id FROM storage_lots
        WHERE LOWER(lot_code) = LOWER(${table}.${srcCol})
        LIMIT 1
      )
      WHERE ${newCol} IS NULL AND ${srcCol} IS NOT NULL AND ${srcCol} != ''
    `).run();

    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_${table}_${newCol}
      ON ${table}(${newCol})
    `).run();
  }
}
```

### 2. `src/types/index.ts`

**`WoodSalesRecord`:**
```ts
kavlingNumber: string;   // tetap
lotId?: string;          // NEW FK
```

**`SawmillProductionRecord`:**
```ts
sourceKavlingNumber: string;   // tetap
sourceLotId?: string;          // NEW FK
```

**`StockSortingRecord`:**
```ts
sourceKavlingNumber: string;   // tetap
sourceLotId?: string;          // NEW FK
targetKavlingNumber: string;   // tetap
targetLotId?: string;          // NEW FK
```

### 3. `src/utils/lot-balance.ts` (atau equivalent aggregation)

Update kalkulasi stok — prefer FK match, fallback ke string:

```ts
// SEBELUM:
const salesForLot = salesRecords.filter(s => s.kavlingNumber === lot.lotCode);

// SESUDAH (FK-first):
const salesForLot = salesRecords.filter(s =>
  s.lotId
    ? s.lotId === lot.id                                    // FK match — akurat
    : s.kavlingNumber?.toLowerCase() === lot.lotCode?.toLowerCase()  // string fallback
);
```

Terapkan pola yang sama untuk production dan sorting records.

### 4. Save functions — isi `lot_id` saat create

Helper reusable:
```ts
function resolveLotId(db: Database, kavlingNumber: string): string | null {
  const row = db.prepare(
    `SELECT id FROM storage_lots WHERE LOWER(lot_code) = LOWER(?) LIMIT 1`
  ).get(kavlingNumber) as { id: string } | undefined;
  return row?.id ?? null;
}
```

Files yang perlu update:
- `src/persistence/sqlite/sales-queries.ts` — saat save sale record
- `src/persistence/sqlite/production-queries.ts` — saat save production record
- `src/persistence/sqlite/sorting-queries.ts` — saat save sorting record (source + target)

---

## Checklist

```
[ ] MODIFY  src/persistence/sqlite/migrations.ts           — ALTER + backfill 4 kolom
[ ] MODIFY  src/types/index.ts                             — lotId di 3 types
[ ] MODIFY  src/utils/lot-balance.ts                       — FK-first aggregation
[ ] MODIFY  src/persistence/sqlite/sales-queries.ts        — resolve + simpan lot_id
[ ] MODIFY  src/persistence/sqlite/production-queries.ts   — resolve + simpan source_lot_id
[ ] MODIFY  src/persistence/sqlite/sorting-queries.ts      — resolve + simpan source + target lot_id
```

---

## Risk

| Risk | Mitigasi |
|------|---------|
| Lot dihapus → `lot_id` jadi NULL | `ON DELETE SET NULL` — string `kavlingNumber` tetap ada. String fallback masih berjalan untuk historical data. |
| Backfill gagal match (kavling belum ada di `storage_lots`) | `lot_id` NULL — tidak error. Data lama tetap terbaca via string. |
| `stock_sorting_records` punya `target_kavling` berbeda schema | Cek aktual tabel — ada kemungkinan `target_kavling_number` disimpan berbeda. |
