# HANDOVER — Database Relasi & Price System Fixes

**Dibuat:** 2026-10-27
**Branch:** vicky
**Baseline:** 930 passed, 0 failed · 25/25 routes · 0 drift violations · 0 tech debt
**Session sebelumnya:** Module #18 (Timber Price Database) completed

---

## === MANDATORY SESSION START ===

Baca dalam urutan ini sebelum menyentuh kode apapun:

1. `AGENTS.md` — mandatory protocol, 250 LOC cap, SSOT rules, commit convention
2. `docs/SESSION_STATE.md` — verify baseline: 930 pass, 0 fail, 0 drift
3. `docs/architecture-system-invariants.md` — 83 baris, baca semua
4. `docs/adr/0002-null-vs-zero-for-pending-price.md` — null = PENDING (bukan 0)
5. `docs/adr/0003-loose-contract-record-linkage.md` — ADR untuk kontrak string linkage yang akan kita ubah
6. `docs/superpowers/price-database-spec.md` — spec tabel harga & report period
7. `docs/superpowers/price-database-impl.md` — implementation plan 25 langkah
8. `docs/superpowers/db-fix-01-price-entry-fk.md` ← **mulai di sini**
9. `docs/superpowers/db-fix-02-contract-fk.md`
10. `docs/superpowers/db-fix-03-species-fk.md`
11. `docs/superpowers/db-fix-04-kavling-fk.md`
12. `docs/superpowers/db-fix-05-broker-name-view.md`
13. `docs/superpowers/db-fix-06-tenant-fk.md`
14. `docs/superpowers/db-fix-07-payment-form-denorm.md`
15. `src/persistence/sqlite/migrations.ts` — schema saat ini (pahami semua tabel)
16. `src/persistence/sqlite/views-ddl.ts` — semua VIEW definitions
17. `src/persistence/sqlite/price-queries.ts` — price queries yang sudah ada
18. `src/utils/price-lookup.ts` — lookup logic yang akan diupdate

Verifikasi sebelum mulai:
```bash
npm run drift:check   # harus 0 violations
npm run test:smoke    # harus pass
npm test              # harus 930 pass, 0 fail
```

---

## === KONTEKS: APA YANG SUDAH ADA ===

### Fitur yang sudah selesai (Module #1–18):
- ✅ Auth, User Management, Buku Besar, Tally, Sales, Production, Sorting
- ✅ Contracts, Payment Forms, Suppliers, Brokers, Dashboard
- ✅ Settings (termasuk Storage Settings fix — sudah live)
- ✅ Activity Log, Inventory, Pending Pricing, Navigation
- ✅ Export/Import Modal (spec + impl plan sudah di docs/superpowers/)
- ✅ Price Database & Report Period (spec + impl plan sudah di docs/superpowers/)
  - `src/persistence/sqlite/price-queries.ts` — sudah ada
  - `src/persistence/sqlite/report-period-queries.ts` — sudah ada
  - `src/hooks/useTimberPrices.ts` — sudah ada
  - `src/hooks/useReportPeriods.ts` — sudah ada
  - Nav items `prices` dan `report-periods` sudah ada di `nav-config.ts`

### Yang BELUM diimplementasi (task session ini):
- ❌ DB Fix 01–07 (relasi database — semua masih spec/plan, belum kode)
- ❌ `timber_price_entries` belum punya FK ke `wood_species` dan `suppliers`
- ❌ `contractNumber` belum ada FK ke `perhutani_contracts`
- ❌ `woodSpecies` masih string bebas di 5 tabel
- ❌ `kavlingNumber` masih string bebas di sales/production/sorting
- ❌ Broker name belum di-JOIN di `v_buku_besar_flat`
- ❌ `report_periods` belum punya `REFERENCES tenants(id)`
- ❌ `payment_forms.supplier_id` belum di-index dan di-enforce

---

## === TASK ===

Implementasikan DB Fix 01–07 secara berurutan.
**Setiap fix adalah satu unit kerja tersendiri — commit terpisah.**

### Urutan wajib:
```
Fix 01 → Fix 02 → Fix 03 → Fix 04 → Fix 05 → Fix 06 → Fix 07
```
Fix 01 harus selesai dan test pass sebelum mulai Fix 02, dst.

### Kenapa urutan ini penting:
- Fix 01 rebuild `timber_price_entries` → Fix 03 dan Fix 06 bergantung pada schema baru
- Fix 03 menambah `species_id` ke `v_buku_besar_flat` → Fix 01 butuh ini untuk lookup yang benar
- Fix 05 rebuild views → harus dilakukan SETELAH Fix 03 (karena view berubah)
- Fix 06 rebuild `report_periods` → independen tapi lebih aman dilakukan setelah Fix 01

---

## === PHASE PLAN ===

### Phase 1 — DB Fix 01: `timber_price_entries` FKs
**Spec:** `docs/superpowers/db-fix-01-price-entry-fk.md`

Files yang dimodifikasi:
```
MODIFY  src/persistence/sqlite/migrations.ts
MODIFY  src/types/index.ts                    — tambah speciesId ke TimberPriceEntry
MODIFY  src/persistence/sqlite/price-queries.ts
MODIFY  src/utils/price-lookup.ts
MODIFY  src/hooks/useTimberPrices.ts
MODIFY  src/components/prices/PriceFormModal.tsx
```

Test yang harus ditulis/update:
```
test/api-prices.test.ts           — verifikasi POST /api/prices requires speciesId
test/price-lookup.test.ts         — verifikasi lookup pakai species_id bukan string
```

Verification gate:
```bash
npm run drift:check
npm test
# grep assertion:
grep -r "speciesId" src/persistence/sqlite/price-queries.ts | grep -c "species_id"
# harus > 0
```

Commit:
```
fix(db): add species_id and supplier FK to timber_price_entries

- Rebuild table with REFERENCES wood_species(id) ON DELETE RESTRICT
- REFERENCES suppliers(id) ON DELETE SET NULL
- REFERENCES tenants(id) ON DELETE CASCADE
- Backfill species_id via LOWER(common_name) match
- Update price-queries.ts to use FK-based lookup
- Update price-lookup.ts to prefer speciesId over string match

Refs: docs/superpowers/db-fix-01-price-entry-fk.md
```

---

### Phase 2 — DB Fix 02: `contractNumber` FK
**Spec:** `docs/superpowers/db-fix-02-contract-fk.md`

Files yang dimodifikasi:
```
MODIFY  src/persistence/sqlite/migrations.ts
MODIFY  src/types/index.ts                    — contractId di ReceivingManifest + WoodReceivingRecord
MODIFY  src/persistence/sqlite/views-ddl.ts   — tambah contractId ke v_buku_besar_flat
MODIFY  src/utils/payment-form-grouping.ts    — buildGroupingKey pakai contractId
MODIFY  manifest save logic (cari di sqlite-record-store.ts atau manifest-queries.ts)
```

Test yang harus ditulis/update:
```
test/contract-fulfillment.test.ts  — verifikasi FK match lebih presisi dari string match
test/payment-form-grouping.test.ts — verifikasi buildGroupingKey pakai contractId
```

⚠️ **Perhatian ADR-0003:** `docs/adr/0003-loose-contract-record-linkage.md` mendokumentasikan
keputusan lama untuk loose linkage. Fix ini **mengubah keputusan tersebut** — update ADR
tersebut atau buat ADR baru yang supersedes ADR-0003.

Commit:
```
fix(db): add contract_id FK to receiving_manifests

- ALTER TABLE receiving_manifests ADD COLUMN contract_id FK
- Backfill via LOWER(contract_number) match
- Expose contractId in v_buku_besar_flat view
- Update payment-form-grouping to prefer contractId key
- Supersedes ADR-0003 loose linkage decision

Refs: docs/superpowers/db-fix-02-contract-fk.md
```

---

### Phase 3 — DB Fix 03: `woodSpecies` FK di 5 Tabel
**Spec:** `docs/superpowers/db-fix-03-species-fk.md`

Files yang dimodifikasi:
```
MODIFY  src/persistence/sqlite/migrations.ts
MODIFY  src/types/index.ts                            — speciesId di 5 types + WoodReceivingRecord
MODIFY  src/persistence/sqlite/views-ddl.ts           — tambah speciesId ke v_buku_besar_flat
MODIFY  src/persistence/sqlite/sales-queries.ts
MODIFY  src/persistence/sqlite/contract-queries.ts
MODIFY  src/persistence/sqlite/production-queries.ts
MODIFY  src/persistence/sqlite/sorting-queries.ts
MODIFY  src/persistence/sqlite/payment-form-queries.ts
MODIFY  src/utils/price-lookup.ts                     — switch ke FK compare penuh
```

⚠️ **LOC cap:** Jika `migrations.ts` mendekati 250 LOC setelah semua ALTER,
extract migration blocks ke `src/persistence/sqlite/migrations-phase2.ts`
dan import dari `migrations.ts`.

⚠️ **Views must be rebuilt:** Setelah update `views-ddl.ts`, drop dan recreate semua views
di migration block. Lihat DB Fix 05 untuk pola DROP VIEW IF EXISTS.

Commit:
```
fix(db): add species_id FK to 5 tables + v_buku_besar_flat

- wood_sales_records, contract_sortiment_items
- sawmill_production_records, stock_sorting_records, payment_forms
- Backfill via LOWER(common_name) match
- v_buku_besar_flat now exposes speciesId column
- price-lookup.ts uses FK compare (no more string mismatch risk)

Refs: docs/superpowers/db-fix-03-species-fk.md
```

---

### Phase 4 — DB Fix 04: `kavlingNumber` FK
**Spec:** `docs/superpowers/db-fix-04-kavling-fk.md`

Files yang dimodifikasi:
```
MODIFY  src/persistence/sqlite/migrations.ts
MODIFY  src/types/index.ts                             — lotId di 3 types
MODIFY  src/utils/lot-balance.ts                       — FK-first aggregation
MODIFY  src/persistence/sqlite/sales-queries.ts
MODIFY  src/persistence/sqlite/production-queries.ts
MODIFY  src/persistence/sqlite/sorting-queries.ts
```

⚠️ **Cek aktual schema `stock_sorting_records`** — mungkin ada `target_kavling_number`
yang perlu `target_lot_id` tersendiri. Verifikasi dengan:
```bash
node -e "import('./src/persistence/sqlite/db.ts').then(m => m.getDb()).then(db => console.log(db.prepare('PRAGMA table_info(stock_sorting_records)').all()))"
```

Test yang harus ditulis/update:
```
test/lot-balance.test.ts  — verifikasi FK-first aggregation lebih akurat
```

Commit:
```
fix(db): add lot_id FK to sales/production/sorting

- wood_sales_records: lot_id FK
- sawmill_production_records: source_lot_id FK
- stock_sorting_records: source_lot_id + target_lot_id FK
- lot-balance aggregation uses FK-first matching
- Backfill via LOWER(lot_code) match

Refs: docs/superpowers/db-fix-04-kavling-fk.md
```

---

### Phase 5 — DB Fix 05: Broker Name di View
**Spec:** `docs/superpowers/db-fix-05-broker-name-view.md`

Files yang dimodifikasi:
```
MODIFY  src/persistence/sqlite/views-ddl.ts      — LEFT JOIN brokers + brokerName
MODIFY  src/persistence/sqlite/migrations.ts     — DROP + recreate views
MODIFY  src/types/index.ts                       — brokerName di WoodReceivingRecord
MODIFY  src/utils/records-csv.ts                 — pakai brokerName langsung
MODIFY  src/utils/records-excel.ts               — pakai brokerName langsung
```

⚠️ **View rebuild order:**
```ts
// Di migrations.ts — urutan DROP penting (dependent views first):
db.prepare(`DROP VIEW IF EXISTS v_buku_besar_flat`).run();
db.prepare(`DROP VIEW IF EXISTS v_receiving_manifest_summaries`).run();
db.prepare(`DROP VIEW IF EXISTS v_receiving_item_financials`).run();
// Lalu recreate semua dari SQLITE_VIEWS_DDL yang sudah diupdate
```

Test yang harus ditulis/update:
```
test/records-csv.test.ts   — verifikasi CSV column "Nama Broker" berisi nama, bukan ID
```

Commit:
```
fix(db): join broker name in v_buku_besar_flat view

- LEFT JOIN brokers b ON m.broker_id = b.id
- Expose brokerName in WoodReceivingRecord type
- CSV/Excel export now outputs broker name directly
- Rebuild all views with correct dependency order

Refs: docs/superpowers/db-fix-05-broker-name-view.md
```

---

### Phase 6 — DB Fix 06: Tenant FK di `report_periods`
**Spec:** `docs/superpowers/db-fix-06-tenant-fk.md`

Files yang dimodifikasi:
```
MODIFY  src/persistence/sqlite/migrations.ts  — rebuild report_periods table
```

Ini yang paling kecil — hanya satu file. Tapi harus dijalankan setelah
Fix 01 karena Fix 01 sudah handle `timber_price_entries`.

Commit:
```
fix(db): add tenants FK to report_periods table

- Rebuild report_periods with REFERENCES tenants(id) ON DELETE CASCADE
- Consistent with all other tenant-scoped tables

Refs: docs/superpowers/db-fix-06-tenant-fk.md
```

---

### Phase 7 — DB Fix 07: Payment Form Supplier Cleanup
**Spec:** `docs/superpowers/db-fix-07-payment-form-denorm.md`

Files yang dimodifikasi:
```
MODIFY  src/persistence/sqlite/migrations.ts           — index + backfill
MODIFY  src/persistence/sqlite/payment-form-queries.ts — resolve supplierId saat create
MODIFY  src/types/index.ts                             — supplierId required di PaymentForm
```

Commit:
```
fix(db): enforce supplier_id on payment_forms

- Add index on payment_forms(supplier_id)
- Backfill missing supplier_id via name match
- savePaymentForm now resolves supplierId before INSERT
- PaymentForm.supplierId changed from optional to required

Refs: docs/superpowers/db-fix-07-payment-form-denorm.md
```

---

### Phase 8 — Final Verification Gate

Setelah semua 7 fix selesai:

```bash
# 1. Drift check
npm run drift:check
# Expected: 0 violations

# 2. Full test suite
npm test
# Expected: >= 930 pass, 0 fail

# 3. Build check
npm run build:check
# Expected: 0 errors, 0 type errors

# 4. Grep assertions
grep -r "species_id" src/persistence/sqlite/price-queries.ts
# Must find: species_id column in INSERT and SELECT

grep -r "contract_id" src/persistence/sqlite/migrations.ts
# Must find: ALTER TABLE receiving_manifests ADD COLUMN contract_id

grep -r "brokerName" src/utils/records-csv.ts
# Must find: r.brokerName (not r.brokerId)

grep -r "REFERENCES tenants" src/persistence/sqlite/migrations.ts | wc -l
# Must be >= 10 (semua tabel punya tenant FK)

# 5. Smoke test
npm run test:smoke
# Expected: pass
```

---

## === RISKS & CONTINGENCY ===

| Risk | Deteksi | Mitigasi |
|------|---------|---------|
| `migrations.ts` melewati 250 LOC setelah semua fix | `wc -l src/persistence/sqlite/migrations.ts` | Extract ke `migrations-v2.ts`, import dan call dari `migrations.ts` |
| Backfill species_id tidak match (nama beda format) | Setelah migration, `SELECT COUNT(*) FROM timber_price_entries WHERE species_id = 'UNKNOWN'` | Entry tersebut perlu re-input manual via `/prices` UI |
| View rebuild gagal karena circular dependency | Error pada `DROP VIEW IF EXISTS` | Drop semua views dulu sebelum recreate, urutan: flat → summaries → financials |
| `stock_sorting_records` punya schema berbeda dari asumsi | `PRAGMA table_info(stock_sorting_records)` sebelum write migration | Sesuaikan kolom di Fix 04 berdasarkan schema aktual |
| ADR-0003 conflict dengan Fix 02 | Test `contract-fulfillment.test.ts` gagal | Update ADR-0003 untuk supersede dengan ADR baru, atau buat `docs/adr/0015-contract-fk-enforcement.md` |
| LOC cap di `src/types/index.ts` setelah tambah banyak field | `wc -l src/types/index.ts` setelah setiap phase | AGENTS.md mengizinkan SSOT exemption untuk types — tapi tetap monitor |

---

## === NOTES PENTING ===

1. **Idempotent migrations** — semua ALTER harus dicek dulu dengan
   `PRAGMA table_info()` sebelum dijalankan. Jangan assume fresh DB.

2. **ON DELETE SET NULL, bukan CASCADE** — untuk semua FK baru di tabel
   dokumen (manifests, sales, payment forms). Data historis tidak boleh
   hilang saat master data dihapus.

3. **ON DELETE RESTRICT** — untuk `species_id` di `timber_price_entries`
   (harga tidak boleh mengacu species yang tidak ada).

4. **ON DELETE CASCADE** — hanya untuk `tenant_id` references (multi-tenancy cleanup).

5. **String column tetap ada** — jangan hapus `wood_species TEXT`, `kavling_number TEXT`,
   `contract_number TEXT`. Ini adalah denormalized display copy yang diperlukan
   untuk backward compat dan display tanpa JOIN.

6. **Test-first di setiap phase** — tulis test yang FAIL dulu, baru implementasi
   sampai pass. Sesuai workflow di AGENTS.md.

7. **ADR update untuk Fix 02** — wajib update atau supersede ADR-0003 karena
   Fix 02 mengubah keputusan arsitektur yang sudah didokumentasikan.

