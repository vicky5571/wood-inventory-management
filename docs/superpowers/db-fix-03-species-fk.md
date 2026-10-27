# DB Fix 03 — `woodSpecies` String ke FK di 5 Tabel

**Severity:** 🟠 MEDIUM — inkonsistensi antar tabel merusak lookup harga & laporan
**Problem:** Hanya `receiving_items` pakai FK ke `wood_species`. Lima tabel lain pakai string bebas.
**Affects:** `wood_sales_records`, `contract_sortiment_items`, `sawmill_production_records`, `stock_sorting_records`, `payment_forms`, views, price lookup

---

## Tabel Terdampak

| Tabel | Kolom saat ini | Target |
|-------|---------------|--------|
| `receiving_items` | `species_id FK` ✅ | tidak berubah |
| `wood_sales_records` | `wood_species TEXT` ❌ | tambah `species_id FK` |
| `contract_sortiment_items` | `wood_species TEXT` ❌ | tambah `species_id FK` |
| `sawmill_production_records` | `wood_species TEXT` ❌ | tambah `species_id FK` |
| `stock_sorting_records` | `source_wood_species TEXT` ❌ | tambah `species_id FK` |
| `timber_price_entries` | sudah fixed di DB Fix 01 ✅ | — |
| `payment_forms` | `wood_species TEXT` ❌ | tambah `species_id FK` (nullable — historical doc) |

---

## Pendekatan

Sama seperti DB Fix 02: **tambah kolom FK di samping string yang sudah ada**.
Tidak hapus kolom `wood_species TEXT` karena:
- Dipakai sebagai display string di banyak tempat
- Dokumen historis (payment form) harus tetap terbaca bahkan jika species dihapus
- Backward compat dengan data lama

Pattern per tabel:
```sql
ALTER TABLE <tabel> ADD COLUMN species_id TEXT REFERENCES wood_species(id) ON DELETE SET NULL;
-- lalu backfill:
UPDATE <tabel> SET species_id = (
  SELECT id FROM wood_species WHERE LOWER(common_name) = LOWER(<tabel>.wood_species) LIMIT 1
) WHERE species_id IS NULL;
```

---

## Perubahan yang Diperlukan

### 1. `src/persistence/sqlite/migrations.ts`

Tambah satu migration block untuk semua 5 tabel:

```ts
// ── Migration: add species_id FK to all wood_species string tables ────────
const tablesToMigrate = [
  { table: 'wood_sales_records',         col: 'wood_species' },
  { table: 'contract_sortiment_items',   col: 'wood_species' },
  { table: 'sawmill_production_records', col: 'wood_species' },
  { table: 'stock_sorting_records',      col: 'source_wood_species' },
  { table: 'payment_forms',             col: 'wood_species' },
];

for (const { table, col } of tablesToMigrate) {
  const cols = (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map(c => c.name);
  if (!cols.includes('species_id')) {
    db.prepare(`
      ALTER TABLE ${table}
      ADD COLUMN species_id TEXT REFERENCES wood_species(id) ON DELETE SET NULL
    `).run();

    db.prepare(`
      UPDATE ${table}
      SET species_id = (
        SELECT id FROM wood_species
        WHERE LOWER(common_name) = LOWER(${table}.${col})
        LIMIT 1
      )
      WHERE species_id IS NULL
    `).run();

    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_${table}_species
      ON ${table}(species_id)
    `).run();
  }
}
```

> **Catatan `stock_sorting_records`:** tabel ini punya dua kolom species
> (`source_wood_species` dan kemungkinan `target_wood_species`). Cek
> skema aktual dan tambah `source_species_id` + `target_species_id` jika perlu.

### 2. `src/types/index.ts` — Tambah `speciesId` ke 5 type

**`WoodSalesRecord`:**
```ts
woodSpecies: string;    // tetap
speciesId?: string;     // NEW
```

**`ContractSortimentItem`:**
```ts
woodSpecies: string;    // tetap
speciesId?: string;     // NEW
```

**`SawmillProductionRecord`:**
```ts
woodSpecies: string;    // tetap
speciesId?: string;     // NEW
```

**`StockSortingRecord`:**
```ts
sourceWoodSpecies: string;   // tetap
sourceSpeciesId?: string;    // NEW
```

**`PaymentForm`:**
```ts
woodSpecies: string;    // tetap
speciesId?: string;     // NEW (nullable — historical doc)
```

### 3. Tambah `speciesId` ke `v_buku_besar_flat` view

Di `src/persistence/sqlite/views-ddl.ts`, view sudah JOIN ke `wood_species`
via `receiving_items.species_id`. Tambahkan kolom ke SELECT:

```sql
-- Tambah ke v_buku_besar_flat SELECT list:
i.species_id   AS speciesId,
```

Lalu update `WoodReceivingRecord` type untuk terima `speciesId`:
```ts
speciesId?: string;   // NEW — dari receiving_items.species_id via view JOIN
```

Ini yang memungkinkan `price-lookup.ts` pakai FK match instead of string match
(lihat DB Fix 01 Risk section).

### 4. Save functions — isi `species_id` saat create/update

Di setiap save function yang buat record baru, resolve `species_id` dari
`woodSpecies` string:

```ts
// Helper reusable:
function resolveSpeciesId(db: Database, woodSpeciesName: string): string | null {
  const row = db.prepare(
    `SELECT id FROM wood_species WHERE LOWER(common_name) = LOWER(?) LIMIT 1`
  ).get(woodSpeciesName) as { id: string } | undefined;
  return row?.id ?? null;
}

// Di setiap save:
const speciesId = resolveSpeciesId(db, record.woodSpecies);
// INSERT/UPDATE dengan species_id = speciesId
```

Files yang perlu update save logic:
- `src/persistence/sqlite/sales-queries.ts`
- `src/persistence/sqlite/contract-queries.ts`
- `src/persistence/sqlite/production-queries.ts`
- `src/persistence/sqlite/sorting-queries.ts`
- `src/persistence/sqlite/payment-form-queries.ts`

---

## Bonus — `v_buku_besar_flat` dengan `speciesId`

Setelah tambah `speciesId` ke view output, `price-lookup.ts` bisa langsung
pakai FK comparison:

```ts
// price-lookup.ts — setelah fix:
const candidates = allEntries.filter((e) => {
  if (e.speciesId !== record.speciesId) return false;   // FK compare — tidak bisa mismatch
  if (e.effectiveFrom > record.receiptDate) return false;
  if (e.effectiveTo && e.effectiveTo < record.receiptDate) return false;
  return true;
});
```

Zero typo risk, zero case-sensitivity risk.

---

## Checklist

```
[ ] MODIFY  src/persistence/sqlite/migrations.ts        — ALTER + backfill 5 tabel
[ ] MODIFY  src/types/index.ts                          — speciesId di 5 types + WoodReceivingRecord
[ ] MODIFY  src/persistence/sqlite/views-ddl.ts         — tambah speciesId ke v_buku_besar_flat
[ ] MODIFY  src/persistence/sqlite/sales-queries.ts     — resolve + simpan species_id
[ ] MODIFY  src/persistence/sqlite/contract-queries.ts  — resolve + simpan species_id
[ ] MODIFY  src/persistence/sqlite/production-queries.ts — resolve + simpan species_id
[ ] MODIFY  src/persistence/sqlite/sorting-queries.ts   — resolve + simpan species_id
[ ] MODIFY  src/persistence/sqlite/payment-form-queries.ts — resolve + simpan species_id
[ ] MODIFY  src/utils/price-lookup.ts                   — switch ke FK compare (setelah view updated)
```

---

## Risk

| Risk | Mitigasi |
|------|---------|
| Backfill tidak menemukan match (nama spesies tidak konsisten) | `species_id` nullable — record tanpa match tetap `NULL`. String fallback masih berjalan untuk legacy data. |
| `stock_sorting_records` mungkin punya dua kolom species | Cek skema aktual dulu, tambah `source_species_id` dan `target_species_id` jika perlu |
| `payment_forms.species_id` jadi NULL jika species dihapus | Intentional — `ON DELETE SET NULL`. `wood_species` string tetap ada untuk display historis. |
