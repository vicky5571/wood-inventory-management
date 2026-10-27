# DB Fix 01 — `timber_price_entries` Foreign Keys

**Severity:** 🔴 HIGH — langsung mempengaruhi fitur price database yang baru dirancang
**Problem:** `timber_price_entries.supplier_id` dan `wood_species` tidak punya FK constraint
**Affects:** `src/persistence/sqlite/price-queries.ts`, `migrations.ts`, `src/utils/price-lookup.ts`

---

## Masalah Detail

Tabel `timber_price_entries` saat ini:

```sql
wood_species  TEXT NOT NULL,   -- string bebas, tidak ada REFERENCES wood_species(id)
supplier_id   TEXT,            -- nullable, tidak ada REFERENCES suppliers(id)
supplier_name TEXT,            -- denormalized copy dari supplier.name
```

### Risiko 1 — String mismatch merusak auto-apply harga
`price-lookup.ts` mencocokkan harga dengan:
```ts
if (e.woodSpecies.trim().toLowerCase() !== species) return false;
```
Tapi `woodSpecies` di `WoodReceivingRecord` berasal dari JOIN:
`receiving_items.species_id → wood_species.common_name`

Jika operator input harga dengan mengetik `"Jati Merah"` tapi di master data
tercatat `"Jati"` — lookup gagal, record tetap PENDING selamanya.

### Risiko 2 — Supplier dihapus, FK di price entry tidak tahu
Jika `suppliers` dihapus dari master data, `timber_price_entries.supplier_id`
menjadi dangling reference tanpa error — data silently corrupt.

### Risiko 3 — Tidak ada `REFERENCES tenants(id)`
Semua tabel lain punya constraint ini. `timber_price_entries` melewatkannya.

---

## Solusi

### A. Ganti `wood_species TEXT` → `species_id FK + species_name denormalized`

Simpan **keduanya**:
- `species_id TEXT NOT NULL REFERENCES wood_species(id) ON DELETE RESTRICT` — untuk integritas
- `wood_species_name TEXT NOT NULL` — denormalized copy untuk display tanpa JOIN

Saat lookup: gunakan `species_id` untuk match (bukan string), ambil dari
`receiving_items.species_id` langsung — tidak ada lagi string comparison.

### B. Tambah FK constraint pada `supplier_id`

```sql
supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL
```

`ON DELETE SET NULL` = jika supplier dihapus, price entry masih ada tapi
`supplier_id` menjadi NULL → otomatis fallback ke global price (no supplier scope).

### C. Tambah `REFERENCES tenants(id) ON DELETE CASCADE` pada `tenant_id`

---

## Perubahan yang Diperlukan

### 1. `src/persistence/sqlite/migrations.ts`

**Karena SQLite tidak support ALTER COLUMN untuk menambah constraint,**
tabel harus di-recreate dengan skema baru. Gunakan pola rename → create → copy → drop.

Tambahkan migration block baru di akhir `runMigrations()`:

```ts
// ── Migration: rebuild timber_price_entries with proper FKs ─────────────
const tpeColumns = (db.prepare(`PRAGMA table_info(timber_price_entries)`).all() as { name: string }[]).map(c => c.name);

if (!tpeColumns.includes('species_id')) {
  // Step 1: rename old table
  db.prepare(`ALTER TABLE timber_price_entries RENAME TO timber_price_entries_old`).run();

  // Step 2: create new table with correct FKs and species_id column
  db.prepare(`
    CREATE TABLE timber_price_entries (
      id               TEXT PRIMARY KEY,
      tenant_id        TEXT NOT NULL DEFAULT 'default-tenant'
                         REFERENCES tenants(id) ON DELETE CASCADE,
      species_id       TEXT NOT NULL REFERENCES wood_species(id) ON DELETE RESTRICT,
      wood_species_name TEXT NOT NULL,
      supplier_id      TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
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

  // Step 3: copy existing data — resolve species_id by matching common_name
  db.prepare(`
    INSERT INTO timber_price_entries
      SELECT
        o.id, o.tenant_id,
        COALESCE(s.id, 'UNKNOWN') AS species_id,
        o.wood_species             AS wood_species_name,
        o.supplier_id,
        o.supplier_name,
        o.effective_from, o.effective_to,
        o.price_per_m3, o.timber_pph_rate,
        o.notes, o.created_by, o.created_at, o.updated_at
      FROM timber_price_entries_old o
      LEFT JOIN wood_species s ON LOWER(s.common_name) = LOWER(o.wood_species)
  `).run();

  // Step 4: drop old table
  db.prepare(`DROP TABLE timber_price_entries_old`).run();

  // Step 5: recreate indexes
  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_tpe_species_date
    ON timber_price_entries(species_id, effective_from)
  `).run();
  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_tpe_supplier
    ON timber_price_entries(supplier_id)
  `).run();
}
```

### 2. `src/types/index.ts`

Find `TimberPriceEntry` interface dan update:

```ts
export interface TimberPriceEntry {
  id: string;
  tenantId: string;

  // Species — FK + denormalized name
  speciesId: string;            // FK → WoodSpecies.id  (was: tidak ada)
  woodSpecies: string;          // denormalized display name (was: only this)

  // Supplier — optional FK + denormalized name
  supplierId?: string;          // FK → Supplier.id, ON DELETE SET NULL
  supplierName?: string;        // denormalized display name

  effectiveFrom: string;
  effectiveTo?: string;
  pricePerM3: number;
  timberPphRate: number;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}
```

### 3. `src/persistence/sqlite/price-queries.ts`

**Edit A — `mapRow()`**: tambah `speciesId` dari kolom `species_id`:
```ts
speciesId:      row.species_id as string,
woodSpecies:    row.wood_species_name as string,   // kolom baru
```

**Edit B — `savePriceEntryToDb()`**: terima `speciesId` sebagai parameter wajib,
simpan ke `species_id` dan `wood_species_name`:
```ts
// Parameter tambahan:
entry: { speciesId: string; woodSpecies: string; pricePerM3: number; effectiveFrom: string; ... }

// INSERT:
INSERT INTO timber_price_entries
  (id, tenant_id, species_id, wood_species_name, supplier_id, ...)
VALUES (?, ?, ?, ?, ?, ...)
```

**Edit C — `lookupPriceEntryFromDb()`**: ganti filter `wood_species = ?` dengan
`species_id = ?` — tidak ada lagi string comparison:

```ts
export function lookupPriceEntryFromDb(
  db: Database,
  speciesId: string,      // ← sekarang pakai ID, bukan string nama
  supplierId: string | undefined,
  receiptDate: string,
): TimberPriceEntry | null {
  const base = `
    FROM timber_price_entries
    WHERE species_id = ?              -- ← FK match, bukan string match
      AND effective_from <= ?
      AND (effective_to IS NULL OR effective_to >= ?)
  `;
  if (supplierId) {
    const row = db.prepare(
      `SELECT * ${base} AND supplier_id = ? ORDER BY effective_from DESC LIMIT 1`
    ).get(speciesId, receiptDate, receiptDate, supplierId) as Record<string, unknown> | undefined;
    if (row) return mapRow(row);
  }
  const row = db.prepare(
    `SELECT * ${base} AND supplier_id IS NULL ORDER BY effective_from DESC LIMIT 1`
  ).get(speciesId, receiptDate, receiptDate) as Record<string, unknown> | undefined;
  return row ? mapRow(row) : null;
}
```

### 4. `src/utils/price-lookup.ts`

Update `lookupPriceForRecord()` — ganti string comparison dengan ID comparison:

```ts
// SEBELUM (rentan mismatch):
const species = record.woodSpecies?.trim().toLowerCase();
const candidates = allEntries.filter((e) => {
  if (e.woodSpecies.trim().toLowerCase() !== species) return false;
  ...
});

// SESUDAH (FK-based, robust):
const candidates = allEntries.filter((e) => {
  // Gunakan speciesId dari record jika tersedia (dari item_id join)
  // Fallback ke string match hanya jika speciesId tidak ada (legacy flat record)
  const speciesMatch = record.item_id
    ? e.speciesId === (record as any).speciesId    // ideal path
    : e.woodSpecies.trim().toLowerCase() === record.woodSpecies?.trim().toLowerCase(); // fallback
  if (!speciesMatch) return false;
  if (e.effectiveFrom > record.receiptDate) return false;
  if (e.effectiveTo && e.effectiveTo < record.receiptDate) return false;
  return true;
});
```

> **Note:** `WoodReceivingRecord` (flat type) tidak punya `speciesId` field karena
> datang dari `v_buku_besar_flat`. Untuk matching yang benar-benar FK-based,
> perlu tambahkan `speciesId` ke view (lihat DB Fix 03).

### 5. `src/hooks/useTimberPrices.ts`

Update `saveEntry()` — require `speciesId` sebagai parameter:
```ts
const saveEntry = useCallback(async (entry: Partial<TimberPriceEntry> & {
  speciesId: string;      // ← wajib sekarang
  woodSpecies: string;
  pricePerM3: number;
  effectiveFrom: string;
}) => { ... }, [refresh]);
```

### 6. `src/components/prices/PriceFormModal.tsx`

Update form — "Jenis Kayu" dropdown sekarang submit `speciesId` (value dari
`WoodSpecies.id`) bukan string nama:

```tsx
// Dropdown option:
<option key={s.id} value={s.id}>{s.commonName}</option>

// On save, pass both:
onSave({
  speciesId: selectedSpeciesId,
  woodSpecies: selectedSpeciesName,   // untuk display
  ...otherFields
})
```

---

## Checklist

```
[ ] MODIFY  src/persistence/sqlite/migrations.ts      — rebuild table dengan FKs
[ ] MODIFY  src/types/index.ts                        — tambah speciesId ke TimberPriceEntry
[ ] MODIFY  src/persistence/sqlite/price-queries.ts   — mapRow + save + lookup pakai species_id
[ ] MODIFY  src/utils/price-lookup.ts                 — ganti string compare ke ID compare
[ ] MODIFY  src/hooks/useTimberPrices.ts              — require speciesId di saveEntry
[ ] MODIFY  src/components/prices/PriceFormModal.tsx  — dropdown submit speciesId
```

---

## Risk

| Risk | Mitigasi |
|------|---------|
| Data lama di `timber_price_entries` tidak bisa resolve `species_id` (nama tidak cocok di `wood_species`) | Migration pakai `LEFT JOIN` + `COALESCE(..., 'UNKNOWN')` — baris tanpa match disimpan dengan `species_id = 'UNKNOWN'`, tidak crash. Admin perlu re-input entry tersebut. |
| `WoodReceivingRecord` flat type tidak punya `speciesId` | `price-lookup.ts` fallback ke string match untuk flat records. Fix permanen ada di DB Fix 03 (tambah `speciesId` ke view). |
EOF
echo "fix-01 done"
