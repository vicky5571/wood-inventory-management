# DB Fix 05 — Broker Name di `v_buku_besar_flat` View

**Severity:** 🟠 MEDIUM — CSV export dan UI tampilkan raw broker ID, bukan nama
**Problem:** `v_buku_besar_flat` project `m.broker_id` tanpa JOIN ke `brokers` table
**Affects:** `views-ddl.ts`, `WoodReceivingRecord` type, CSV export, payment form display

---

## Masalah Detail

```sql
-- views-ddl.ts saat ini (v_buku_besar_flat):
m.broker_id AS brokerId    -- hanya ID mentah, tidak ada JOIN ke brokers
```

`WoodReceivingRecord.brokerId` berisi raw ID seperti `"BRK-001"`.

Efeknya:
- `generateRecordsCsvContent()` di `records-csv.ts` ada optional param `brokerMap`
  tapi jarang dipass → CSV column "Nama Broker" berisi `"BRK-001"` bukan nama asli
- `PendingPricingTable` menampilkan broker ID di kolom broker
- Dashboard broker metrics harus resolve nama secara terpisah

---

## Solusi

Tambah `LEFT JOIN brokers` ke `v_buku_besar_flat` dan expose `brokerName`.
`LEFT JOIN` karena `broker_id` nullable — record tanpa broker tetap muncul.

---

## Perubahan yang Diperlukan

### 1. `src/persistence/sqlite/views-ddl.ts`

**View `v_buku_besar_flat`** — tambah JOIN dan kolom baru:

Find bagian FROM/JOIN:
```sql
FROM receiving_manifests m
JOIN suppliers sup ON m.supplier_id = sup.id
JOIN receiving_items i ON m.id = i.manifest_id
JOIN v_receiving_item_financials f ON i.id = f.item_id
```

Replace dengan:
```sql
FROM receiving_manifests m
JOIN suppliers sup ON m.supplier_id = sup.id
LEFT JOIN brokers b ON m.broker_id = b.id          -- NEW
JOIN receiving_items i ON m.id = i.manifest_id
JOIN v_receiving_item_financials f ON i.id = f.item_id
```

Tambah kolom ke SELECT list:
```sql
-- Setelah: m.broker_id AS brokerId,
-- Tambah:
COALESCE(b.name, '') AS brokerName,
```

### 2. `src/types/index.ts`

Tambah `brokerName` ke `WoodReceivingRecord`:

```ts
brokerId?: string;        // FK ke Broker.id — sudah ada
brokerName?: string;      // NEW — nama broker dari JOIN, empty string jika tidak ada broker
```

### 3. `src/utils/records-csv.ts`

Update `generateRecordsCsvContent()` — pakai `brokerName` dari record langsung,
tidak perlu lagi `brokerMap` optional param:

```ts
// SEBELUM:
escapeCsvField(r.brokerId ? (brokerMap?.[r.brokerId] || r.brokerId) : ''),

// SESUDAH:
escapeCsvField(r.brokerName || ''),
```

`brokerMap` parameter bisa deprecated (tetap ada untuk backward compat tapi
tidak dibutuhkan lagi jika view sudah JOIN).

### 4. `src/utils/records-excel.ts`

Sama — update baris broker di `buildSheetRows()`:
```ts
// SEBELUM:
r.brokerId || '',

// SESUDAH:
r.brokerName || '',
```

### 5. View rebuild — SQLite tidak bisa ALTER VIEW

SQLite tidak support `ALTER VIEW`. View harus di-DROP dan di-CREATE ulang.
Ini aman karena view adalah computed, tidak ada data yang hilang.

Tambah ke `runMigrations()`:

```ts
// ── Migration: rebuild v_buku_besar_flat with broker name JOIN ───────────
// Drop existing views (order matters — dependent views first)
db.prepare(`DROP VIEW IF EXISTS v_buku_besar_flat`).run();
db.prepare(`DROP VIEW IF EXISTS v_receiving_manifest_summaries`).run();
// Recreate dengan definisi baru (dari SQLITE_VIEWS_DDL yang sudah diupdate)
db.prepare(SQLITE_VIEWS_DDL).run();
```

> **Pastikan** konstanta `SQLITE_VIEWS_DDL` di `views-ddl.ts` sudah
> menggunakan definisi view baru dengan LEFT JOIN broker sebelum migration dijalankan.

---

## Checklist

```
[ ] MODIFY  src/persistence/sqlite/views-ddl.ts      — tambah LEFT JOIN brokers + brokerName column
[ ] MODIFY  src/persistence/sqlite/migrations.ts     — DROP + recreate views
[ ] MODIFY  src/types/index.ts                       — tambah brokerName ke WoodReceivingRecord
[ ] MODIFY  src/utils/records-csv.ts                 — pakai brokerName langsung
[ ] MODIFY  src/utils/records-excel.ts               — pakai brokerName langsung
```

---

## Risk

| Risk | Mitigasi |
|------|---------|
| `DROP VIEW IF EXISTS` saat migration — aman? | Ya — view hanya computed query, tidak ada data. Selalu bisa di-recreate. |
| View `v_receiving_manifest_summaries` juga depend on brokers? | Cek definisi — jika tidak pakai broker, tidak perlu diubah. Tetap di-DROP/recreate untuk konsistensi. |
| `brokerMap` param di `generateRecordsCsvContent` — breaking change? | Tidak — param tetap optional. Jika dipass, tetap digunakan. Hanya default behavior yang berubah (dari ID → nama). |
