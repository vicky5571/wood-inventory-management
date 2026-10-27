# DB Fix 02 — `contractNumber` Foreign Key ke `perhutani_contracts`

**Severity:** 🔴 HIGH — relasi kontrak vs penerimaan kayu hanya string match
**Problem:** `receiving_manifests.contract_number` tidak punya FK ke `perhutani_contracts`
**Affects:** `migrations.ts`, contract fulfillment calculation, payment form grouping

---

## Masalah Detail

```sql
-- receiving_manifests saat ini:
contract_number TEXT NOT NULL   -- plain string, tidak ada REFERENCES perhutani_contracts
```

Seluruh linkage antara penerimaan kayu dan kontrak dilakukan di **application layer**
menggunakan string equality:

```ts
// contract-calc.ts
record.contractNumber.toLowerCase() === contract.contractNumber.toLowerCase()

// payment-form-grouping.ts
const contractNumber = record.contractNumber || ''
// grouped by string match untuk menentukan payment form
```

### Risiko 1 — Data orphan tidak terdeteksi
Record penerimaan bisa punya `contractNumber = "CTR-XYZ-999"` yang tidak ada
di `perhutani_contracts` — tidak ada error, tidak ada validasi.

### Risiko 2 — Kalkulasi fulfillment kontrak tidak akurat
`contract-calc.ts` menghitung sisa volume kontrak dengan string match.
Jika `contract_number` di manifest berbeda format tipis dari yang di kontrak
(spasi, huruf besar/kecil, dash vs underscore), fulfillment tidak terhitung.

### Risiko 3 — Hapus kontrak tidak cascade ke manifests
Hapus `perhutani_contracts` record → `receiving_manifests` yang mengacu tetap
punya `contract_number` string lama, tidak tahu kontraknya sudah tidak ada.

### Risiko 4 — Payment form grouping salah
`payment-form-grouping.ts` group by `contractNumber` string. Dua manifest
dengan `contractNumber` berbeda kapitalisasi bisa masuk form berbeda padahal
kontrak yang sama.

---

## Solusi

Tambah kolom `contract_id` (nullable FK) di `receiving_manifests` **di samping**
`contract_number` yang sudah ada — tidak hapus `contract_number` karena:
1. `contract_number` dipakai sebagai display string di banyak tempat
2. Beberapa manifest mungkin tidak punya kontrak sama sekali (non-Perhutani)
3. Backward compatibility dengan data lama

```sql
-- Tambah ke receiving_manifests:
contract_id TEXT REFERENCES perhutani_contracts(id) ON DELETE SET NULL
```

`ON DELETE SET NULL` = hapus kontrak → `contract_id` di manifest menjadi NULL,
`contract_number` string tetap ada sebagai historical record.

---

## Perubahan yang Diperlukan

### 1. `src/persistence/sqlite/migrations.ts`

Tambah migration block baru:

```ts
// ── Migration: add contract_id FK to receiving_manifests ─────────────────
const rmCols = (db.prepare(`PRAGMA table_info(receiving_manifests)`).all() as { name: string }[]).map(c => c.name);

if (!rmCols.includes('contract_id')) {
  db.prepare(`
    ALTER TABLE receiving_manifests
    ADD COLUMN contract_id TEXT REFERENCES perhutani_contracts(id) ON DELETE SET NULL
  `).run();

  // Backfill: resolve contract_id by matching contract_number string
  db.prepare(`
    UPDATE receiving_manifests
    SET contract_id = (
      SELECT id FROM perhutani_contracts
      WHERE LOWER(contract_number) = LOWER(receiving_manifests.contract_number)
      LIMIT 1
    )
    WHERE contract_number IS NOT NULL AND contract_number != ''
  `).run();

  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_rm_contract_id
    ON receiving_manifests(contract_id)
  `).run();
}
```

### 2. `src/types/index.ts`

**Edit A — `ReceivingManifest`**: tambah optional `contractId`:
```ts
export interface ReceivingManifest {
  // ...existing fields...
  contractNumber: string;   // tetap ada untuk display
  contractId?: string;      // NEW — FK ke PerhutaniContract.id
}
```

**Edit B — `WoodReceivingRecord`**: tambah optional `contractId`:
```ts
export interface WoodReceivingRecord {
  // ...existing fields...
  contractNumber: string;   // tetap ada
  contractId?: string;      // NEW — propagated dari manifest
}
```

### 3. `src/persistence/sqlite/views-ddl.ts`

Tambah `m.contract_id AS contractId` ke `v_buku_besar_flat` SELECT list:

```sql
-- Tambah di SELECT list v_buku_besar_flat:
m.contract_id    AS contractId,
```

### 4. `src/persistence/sqlite/contract-queries.ts` (atau `contract-calc.ts`)

Update fulfillment query — gunakan `contract_id` jika tersedia, fallback ke
string match:

```ts
// Prioritas lookup:
// 1. Jika manifest punya contract_id → match langsung by FK (akurat)
// 2. Fallback ke string match untuk data lama tanpa contract_id

const matchByFk = records.filter(r => r.contractId === contract.id);
const matchByString = records.filter(r =>
  !r.contractId &&
  r.contractNumber.toLowerCase() === contract.contractNumber.toLowerCase()
);
const allMatched = [...matchByFk, ...matchByString];
```

### 5. `src/utils/payment-form-grouping.ts`

Update `buildGroupingKey()` — prefer `contractId` over `contractNumber` string:

```ts
// SEBELUM:
export function buildGroupingKey(supplierName, woodSpecies, contractNumber) {
  return [supplierName, woodSpecies, contractNumber].join('||');
}

// SESUDAH:
export function buildGroupingKey(supplierName, woodSpecies, contractNumber, contractId?) {
  // Gunakan contractId jika ada untuk key yang lebih reliable
  const contractKey = contractId ?? contractNumber.toLowerCase().trim();
  return [supplierName.toLowerCase().trim(), woodSpecies.toLowerCase().trim(), contractKey].join('||');
}
```

### 6. Save manifest — isi `contract_id` saat menyimpan

Di `src/persistence/sqlite/manifest-queries.ts` (atau equivalent save function),
saat menyimpan manifest baru, lookup `contract_id` dari `contract_number`:

```ts
// Resolve contract_id dari contract_number
const contractRow = db.prepare(
  `SELECT id FROM perhutani_contracts WHERE LOWER(contract_number) = LOWER(?) LIMIT 1`
).get(manifest.contractNumber) as { id: string } | undefined;

const contractId = contractRow?.id ?? null;

// Simpan ke DB dengan contract_id
INSERT INTO receiving_manifests (..., contract_number, contract_id, ...)
VALUES (..., ?, ?, ...)
```

---

## Checklist

```
[ ] MODIFY  src/persistence/sqlite/migrations.ts          — ALTER + backfill + index
[ ] MODIFY  src/types/index.ts                            — contractId di ReceivingManifest + WoodReceivingRecord
[ ] MODIFY  src/persistence/sqlite/views-ddl.ts           — tambah contractId ke v_buku_besar_flat
[ ] MODIFY  src/persistence/sqlite/contract-queries.ts    — fulfillment pakai FK first
[ ] MODIFY  src/utils/payment-form-grouping.ts            — buildGroupingKey pakai contractId
[ ] MODIFY  manifest save logic                           — resolve + simpan contract_id saat create
```

---

## Risk

| Risk | Mitigasi |
|------|---------|
| Backfill tidak menemukan match untuk semua `contract_number` | `contract_id` nullable — manifest tanpa match tetap `NULL`, tidak error. String fallback masih berjalan. |
| Kontrak di luar Perhutani (non-kontrak) | `contract_id = NULL` adalah valid state — berarti "tidak terikat kontrak terdaftar" |
| `buildGroupingKey` berubah bisa mempengaruhi existing payment forms | Hanya berlaku untuk form DRAFT baru. Form yang sudah ISSUED/PAID tidak di-regenerate. |
