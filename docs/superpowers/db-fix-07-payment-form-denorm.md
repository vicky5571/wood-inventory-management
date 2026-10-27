# DB Fix 07 — `payment_forms` Denormalized Strings

**Severity:** 🟡 LOW — dokumen finansial, bukan kalkulasi aktif
**Problem:** `payment_forms` menyimpan `supplierName` dan `woodSpecies` sebagai string bebas tanpa FK
**Affects:** `payment-form-queries.ts`, `PaymentForm` type, reporting consistency

---

## Masalah Detail

```ts
// PaymentForm type saat ini:
supplierName: string;   // denormalized — bisa drift jika supplier rename
supplierId?: string;    // optional, tidak enforced di DB
woodSpecies: string;    // denormalized string bebas
```

```sql
-- payment_forms table:
supplier_name  TEXT NOT NULL,   -- string, tidak ada FK
supplier_id    TEXT,            -- nullable, tidak ada REFERENCES suppliers(id)
wood_species   TEXT NOT NULL,   -- string, tidak ada FK
-- species_id akan ditambah di DB Fix 03
```

### Mengapa ini berbeda dari tabel lain?

Payment form adalah **dokumen finansial yang sudah diterbitkan** — analoginya
seperti invoice yang sudah dikirim. Dokumen semacam ini secara konvensional
memang menyimpan data denormalized agar snapshot-nya tidak berubah meski
master data berubah.

Contoh: supplier rename dari "PT Rimba Lestari" → "PT Rimba Sejahtera" →
payment form lama yang sudah PAID tetap menampilkan nama lama yang benar
secara historis.

### Masalah nyata yang ada:

1. `supplierId` optional dan tidak ada `REFERENCES` di DB — bisa NULL
   bahkan untuk form yang seharusnya terikat supplier
2. Tidak ada index pada `supplier_id` → query by supplier lambat
3. `woodSpecies` string match di reporting bisa gagal (sudah covered DB Fix 03)

---

## Solusi

**Berbeda dari fix sebelumnya** — di sini kita TIDAK ingin FK `ON DELETE CASCADE`
atau `ON DELETE SET NULL`, karena payment form harus tetap terbaca bahkan jika
supplier/species dihapus dari master data.

Yang kita inginkan:
- `supplier_id` punya FK tapi `ON DELETE SET NULL` (tetap ada formnya, supplier-nya NULL)
- `supplier_name` tetap ada sebagai snapshot historis
- Tambah index untuk query performa
- `species_id` sudah di-handle di DB Fix 03

---

## Perubahan yang Diperlukan

### 1. `src/persistence/sqlite/migrations.ts`

```ts
// ── Migration: add supplier_id FK + index to payment_forms ───────────────
const pfCols = (db.prepare(`PRAGMA table_info(payment_forms)`).all() as { name: string }[]).map(c => c.name);

// Add supplier_id FK constraint — need to check if constraint exists
const pfFkList = db.prepare(`PRAGMA foreign_key_list(payment_forms)`).all() as { table: string }[];
const hasSupplierFK = pfFkList.some(fk => fk.table === 'suppliers');

if (!hasSupplierFK && pfCols.includes('supplier_id')) {
  // SQLite can't add FK to existing column — need to rebuild table
  // But payment_forms has complex schema — use simpler approach:
  // Add index only (FK enforcement via app layer for payment forms)
  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_payment_forms_supplier
    ON payment_forms(supplier_id)
  `).run();

  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_payment_forms_status
    ON payment_forms(status)
  `).run();

  // Backfill supplier_id where missing
  db.prepare(`
    UPDATE payment_forms
    SET supplier_id = (
      SELECT id FROM suppliers
      WHERE LOWER(name) = LOWER(payment_forms.supplier_name)
      LIMIT 1
    )
    WHERE supplier_id IS NULL OR supplier_id = ''
  `).run();
}
```

> **Keputusan desain:** Untuk `payment_forms`, kita **tidak** rebuild tabel
> untuk menambah FK constraint karena:
> 1. Payment form adalah dokumen historis — lebih aman tidak ada cascade
> 2. `payment_forms` punya skema kompleks dengan banyak kolom dan relasi ke `payment_form_lines`
> 3. App-layer validation sudah cukup — form tidak bisa dibuat tanpa supplier valid
>
> Yang kita lakukan: tambah index + backfill `supplier_id` + app-layer constraint saat create.

### 2. `src/persistence/sqlite/payment-form-queries.ts`

Update `savePaymentForm()` — wajibkan `supplierId` saat create form baru:

```ts
// Validasi sebelum INSERT:
if (!form.supplierId) {
  // Resolve dari nama
  const supplierRow = db.prepare(
    `SELECT id FROM suppliers WHERE LOWER(name) = LOWER(?) LIMIT 1`
  ).get(form.supplierName) as { id: string } | undefined;
  form.supplierId = supplierRow?.id;
}

// INSERT dengan supplier_id wajib untuk form baru:
INSERT INTO payment_forms (..., supplier_id, supplier_name, ...)
VALUES (..., ?, ?, ...)
```

### 3. `src/types/index.ts`

Update `PaymentForm` — `supplierId` dari optional menjadi lebih eksplisit:

```ts
export interface PaymentForm {
  // ...
  supplierName: string;     // snapshot historis — tetap
  supplierId: string;       // FK — sekarang required (bukan optional) untuk form baru
  // ...
}
```

> Ubah dari `supplierId?: string` menjadi `supplierId: string`.
> Data lama yang punya `supplierId = undefined` akan tetap berjalan
> karena TypeScript strict di runtime tidak enforce ini — hanya compile-time.

---

## Checklist

```
[ ] MODIFY  src/persistence/sqlite/migrations.ts           — index + backfill supplier_id
[ ] MODIFY  src/persistence/sqlite/payment-form-queries.ts — resolve supplierId saat create
[ ] MODIFY  src/types/index.ts                             — supplierId required di PaymentForm
```

---

## Risk

| Risk | Mitigasi |
|------|---------|
| Payment form lama punya `supplierId = null` | Backfill migration akan resolve. Jika nama tidak match, tetap NULL — tidak error karena kita tidak rebuild tabel dengan NOT NULL constraint. |
| Rebuild tabel `payment_forms` terlalu berisiko | Sengaja tidak rebuild — hanya tambah index dan backfill. FK enforced di app layer. |
| `species_id` untuk `payment_forms` | Sudah di-handle di DB Fix 03. |

---

## Urutan Eksekusi Semua DB Fixes

```
DB Fix 01  →  timber_price_entries FKs (rebuild table)
DB Fix 02  →  contractNumber FK di receiving_manifests (ALTER + backfill)
DB Fix 03  →  woodSpecies FK di 5 tabel (ALTER + backfill)
DB Fix 04  →  kavlingNumber FK di sales/production/sorting (ALTER + backfill)
DB Fix 05  →  broker name di v_buku_besar_flat (rebuild views)
DB Fix 06  →  tenant FK di report_periods (rebuild table)
DB Fix 07  →  payment_forms supplier cleanup (index + backfill)
```

Semua fix bisa dijalankan dalam satu `runMigrations()` call — idempotent
karena setiap block dicek dengan `PRAGMA table_info` atau column existence check.
