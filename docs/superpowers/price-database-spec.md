# Price Database & Report Period — Feature Specification

**Feature:** Tabel Harga Terpusat + Sistem Penutupan Laporan
**Status:** Planned — belum ada implementasi sama sekali
**Affects:** `/pending-pricing`, `/payment-forms`, `/settings`, dashboard

---

## 1. Masalah Saat Ini

Harga kayu (`timberPricePerM3`) disimpan langsung di setiap `WoodReceivingRecord`
dan diinput manual satu per satu di halaman `/pending-pricing`. Tidak ada:

- Tabel harga terpusat per spesies/supplier
- Riwayat perubahan harga (volatilitas harga tidak terekam)
- Konsep "penutupan laporan" — laporan bisa diubah kapan saja tanpa batas
- Auto-apply harga ke banyak record sekaligus
- Snapshot harga saat laporan dikunci

---

## 2. Solusi yang Diusulkan

Dua fitur baru yang saling berkaitan:

### A. Tabel Harga (`TimberPriceEntry`)
Database harga berlaku per kombinasi spesies + supplier dengan rentang tanggal.
Sistem otomatis mencari harga yang berlaku pada tanggal penerimaan kayu.

### B. Periode Laporan (`ReportPeriod`)
Konsep "laporan" yang bisa dibuka dan ditutup secara eksplisit — tidak terikat
pada time frame tertentu. Saat laporan ditutup, sistem mengunci semua record
dalam periode tersebut dan menyimpan snapshot harga yang digunakan.

---

## 3. User Stories

| ID | Sebagai... | Saya ingin... | Agar... |
|----|-----------|--------------|---------|
| US-1 | Admin L1 | input harga kayu per spesies + supplier dengan tanggal berlaku | harga otomatis ter-apply ke semua record yang cocok |
| US-2 | Admin L1 | melihat riwayat perubahan harga per spesies | saya bisa audit volatilitas harga dari waktu ke waktu |
| US-3 | Admin L1 | membuat periode laporan baru (OPEN) | saya bisa mengelompokkan record yang akan dilaporkan |
| US-4 | Admin L1 | menutup laporan (CLOSE) kapan saja | laporan tidak terikat bulan/minggu — selesai saat selesai |
| US-5 | Sistem | auto-apply harga ke semua record pending dalam periode saat penutupan | operator tidak perlu input harga manual satu per satu |
| US-6 | Admin L1 | melihat preview record mana yang akan di-apply harga sebelum penutupan | saya bisa verifikasi sebelum mengunci |
| US-7 | Admin L1 | membuka kembali laporan yang sudah ditutup (REOPEN) | saya bisa koreksi jika ada kesalahan, dengan audit trail |
| US-8 | Semua user | melihat harga yang berlaku saat ini per spesies | saya tahu acuan harga yang sedang digunakan |

---

## 4. Skema Data Baru

### 4.1 `TimberPriceEntry`

```ts
export interface TimberPriceEntry {
  id: string;
  tenantId: string;

  // Lookup keys — harga berlaku untuk kombinasi ini
  woodSpecies: string;          // e.g. "Jati", "Merbau" — matches WoodReceivingRecord.woodSpecies
  supplierId?: string;          // null = berlaku untuk semua supplier spesies ini
  supplierName?: string;        // denormalized untuk display

  // Rentang berlaku
  effectiveFrom: string;        // YYYY-MM-DD — mulai berlaku (inklusif)
  effectiveTo?: string;         // YYYY-MM-DD — berakhir (inklusif), null = masih berlaku

  // Harga
  pricePerM3: number;           // IDR per m³
  timberPphRate: number;        // PPh rate % untuk periode ini (default dari AppSettings)

  // Metadata
  notes?: string;               // e.g. "Kenaikan harga Q1 2026 per kesepakatan kontrak"
  createdBy?: string;           // operator name
  createdAt: string;
  updatedAt: string;
}
```

**SQLite DDL:**
```sql
CREATE TABLE IF NOT EXISTS timber_price_entries (
  id               TEXT PRIMARY KEY,
  tenant_id        TEXT NOT NULL DEFAULT 'default-tenant',
  wood_species     TEXT NOT NULL,
  supplier_id      TEXT,
  supplier_name    TEXT,
  effective_from   TEXT NOT NULL,          -- YYYY-MM-DD
  effective_to     TEXT,                   -- YYYY-MM-DD nullable
  price_per_m3     REAL NOT NULL CHECK (price_per_m3 >= 0),
  timber_pph_rate  REAL NOT NULL DEFAULT 0.5,
  notes            TEXT,
  created_by       TEXT,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL
);
CREATE INDEX idx_tpe_species_date ON timber_price_entries(wood_species, effective_from);
CREATE INDEX idx_tpe_supplier      ON timber_price_entries(supplier_id);
```

**Lookup logic (priority order):**
1. Cari entri dengan `woodSpecies` cocok + `supplierId` cocok + `effectiveFrom <= receiptDate <= effectiveTo`
2. Jika tidak ada, cari entri dengan `woodSpecies` cocok + `supplierId IS NULL` + rentang tanggal cocok
3. Jika tidak ada → tetap `null` (masih PENDING, tidak bisa auto-apply)

### 4.2 `ReportPeriod`

```ts
export type ReportPeriodStatus = 'OPEN' | 'CLOSED' | 'REOPENED';

export interface ReportPeriod {
  id: string;
  tenantId: string;

  name: string;                 // e.g. "Laporan Minggu W30 - Agustus 2026"
  status: ReportPeriodStatus;

  // Rentang record yang masuk laporan ini (inklusif, berdasarkan receiptDate)
  startDate: string;            // YYYY-MM-DD
  endDate: string;              // YYYY-MM-DD

  // Statistik saat penutupan (di-freeze)
  closedAt?: string;            // ISO timestamp
  closedBy?: string;            // operator name
  totalRecords?: number;
  totalVolumeM3?: number;
  totalNetPayableIDR?: number;

  // Snapshot harga: array of TimberPriceEntry.id yang digunakan saat close
  priceSnapshotIds?: string[];

  // Audit trail
  reopenedAt?: string;
  reopenedBy?: string;
  reopenReason?: string;

  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}
```

**SQLite DDL:**
```sql
CREATE TABLE IF NOT EXISTS report_periods (
  id                   TEXT PRIMARY KEY,
  tenant_id            TEXT NOT NULL DEFAULT 'default-tenant',
  name                 TEXT NOT NULL,
  status               TEXT NOT NULL DEFAULT 'OPEN'
                         CHECK (status IN ('OPEN','CLOSED','REOPENED')),
  start_date           TEXT NOT NULL,
  end_date             TEXT NOT NULL,
  closed_at            TEXT,
  closed_by            TEXT,
  total_records        INTEGER,
  total_volume_m3      REAL,
  total_net_payable_idr REAL,
  price_snapshot_ids   TEXT,              -- JSON array of TimberPriceEntry IDs
  reopened_at          TEXT,
  reopened_by          TEXT,
  reopen_reason        TEXT,
  notes                TEXT,
  created_by           TEXT,
  created_at           TEXT NOT NULL,
  updated_at           TEXT NOT NULL
);
```

### 4.3 Relasi ke `WoodReceivingRecord`

Tambah dua field opsional pada `WoodReceivingRecord` (dan `receiving_items`):

```ts
// Tambahan di WoodReceivingRecord
reportPeriodId?: string;      // FK ke ReportPeriod — diisi saat laporan ditutup
priceEntryId?: string;        // FK ke TimberPriceEntry — harga mana yang dipakai
isLocked?: boolean;           // true setelah laporan ditutup, cegah edit harga manual
```

```sql
-- Migration tambahan di receiving_items
ALTER TABLE receiving_items ADD COLUMN report_period_id TEXT;
ALTER TABLE receiving_items ADD COLUMN price_entry_id   TEXT;
ALTER TABLE receiving_items ADD COLUMN is_locked        INTEGER NOT NULL DEFAULT 0;
```

---

## 5. Flow Lengkap

```
[Admin] Buka halaman /prices
  → Input harga baru: Jati | PT Supplier A | Rp 2.200.000/m³ | berlaku 1 Jan–31 Mar 2026
  → Simpan ke timber_price_entries

[Truk masuk] Record dibuat → timberPricePerM3 = null (PENDING)

[Admin] Buka /report-periods → Buat periode baru "Laporan W30"
  → startDate: 2026-07-21, endDate: 2026-07-27, status: OPEN

[Admin] Klik "Preview Penutupan"
  → Sistem cari semua record dalam rentang startDate–endDate
  → Per record: lookup harga dari timber_price_entries
  → Tampilkan: "38 record cocok harga, 2 record tidak ditemukan harga"

[Admin] Klik "Tutup Laporan"
  → Sistem apply harga ke semua record yang cocok (batch PATCH)
  → Kalkulasi ulang semua finansial
  → Set record.reportPeriodId = period.id
  → Set record.priceEntryId = matched entry id
  → Set record.isLocked = true
  → Simpan snapshot statistik ke report_periods
  → Status → CLOSED

[Payment Form] generate() sekarang bisa include record dari periode CLOSED
  → Tidak perlu skip PENDING_PRICE lagi untuk record dalam periode tertutup
```

---

## 6. UI — Halaman Baru

### 6.1 `/prices` — Manajemen Tabel Harga

```
┌─────────────────────────────────────────────────────┐
│  💰 Tabel Harga Kayu              [+ Tambah Harga]  │
│─────────────────────────────────────────────────────│
│  Filter: [Semua Spesies ▾] [Semua Supplier ▾]       │
│                                                     │
│  HARGA BERLAKU SAAT INI                             │
│  ┌────────────┬──────────┬──────────┬────────────┐  │
│  │ Spesies    │ Supplier │ Harga/m³ │ Berlaku    │  │
│  ├────────────┼──────────┼──────────┼────────────┤  │
│  │ Jati       │ Semua    │ 2.200.000│ Jan–Mar 26 │  │
│  │ Merbau     │ PT Rimba │ 1.850.000│ Feb 26 – ∞ │  │
│  └────────────┴──────────┴──────────┴────────────┘  │
│                                                     │
│  RIWAYAT HARGA (expired)                            │
│  [collapsed accordion per spesies]                  │
└─────────────────────────────────────────────────────┘
```

**Form tambah/edit harga:**
- Spesies (dropdown dari species list)
- Supplier (opsional — kosong = berlaku semua supplier)
- Harga per m³ (number input)
- PPh rate % (prefill dari AppSettings.defaultTimberPphRate)
- Berlaku dari (date)
- Berlaku sampai (date, opsional)
- Catatan (textarea)

### 6.2 `/report-periods` — Manajemen Periode Laporan

```
┌──────────────────────────────────────────────────────┐
│  📋 Periode Laporan          [+ Buat Periode Baru]   │
│──────────────────────────────────────────────────────│
│  ● OPEN   Laporan W30 — 21–27 Jul 2026               │
│    38 record • 245.6 m³ • [Preview] [Tutup Laporan]  │
│                                                      │
│  ✓ CLOSED Laporan W29 — 14–20 Jul 2026               │
│    41 record • 312.4 m³ • Rp 687.280.000             │
│    Ditutup: 22 Jul 2026 oleh Budi Santoso            │
│    [Lihat Detail] [Buka Kembali ▾]                   │
│                                                      │
│  ✓ CLOSED Laporan W28 — ...                          │
└──────────────────────────────────────────────────────┘
```

### 6.3 Preview Penutupan Modal

```
┌──────────────────────────────────────────────────────┐
│  Preview Penutupan: Laporan W30             [×]      │
│──────────────────────────────────────────────────────│
│  ✅ 36 record — harga ditemukan, siap dikunci        │
│  ⚠️  2 record — harga tidak ditemukan (tetap PENDING)│
│                                                      │
│  Record tanpa harga:                                 │
│  • K 9283 TDA | Sonokeling | PT Hutan Lestari        │
│  • H 4421 BC  | Sonokeling | CV Jati Makmur          │
│  → Sonokeling belum ada di tabel harga               │
│                                                      │
│  Total volume terkunci: 231.4 m³                     │
│  Estimasi total bayar:  Rp 509.080.000               │
│                                                      │
│  [Batal]        [Tutup Laporan (36 record)]          │
└──────────────────────────────────────────────────────┘
```

---

## 7. API Routes Baru

| Method | Endpoint | Aksi |
|--------|----------|------|
| GET | `/api/prices` | List semua price entries (aktif + expired) |
| POST | `/api/prices` | Tambah price entry baru |
| PATCH | `/api/prices/[id]` | Edit price entry (hanya jika belum dipakai di CLOSED period) |
| DELETE | `/api/prices/[id]` | Hapus price entry (hanya jika belum dipakai) |
| GET | `/api/report-periods` | List semua periode |
| POST | `/api/report-periods` | Buat periode baru (status OPEN) |
| GET | `/api/report-periods/[id]` | Detail periode + preview record |
| PATCH | `/api/report-periods/[id]/close` | Tutup laporan (trigger auto-apply harga) |
| PATCH | `/api/report-periods/[id]/reopen` | Buka kembali laporan (L1 only, wajib alasan) |
| GET | `/api/report-periods/[id]/preview` | Preview record + harga sebelum penutupan |

---

## 8. Perubahan pada Fitur Existing

### 8.1 `/pending-pricing`
- Tambah kolom "Sumber Harga": `Manual` atau `Tabel Harga (entry #id)`
- Record yang `isLocked = true` tidak bisa diedit harganya lagi — tampil read-only dengan badge "🔒 Terkunci"
- Tambah tombol "Apply Harga dari Tabel" → batch preview + apply tanpa harus tutup laporan

### 8.2 Payment Form Generate
- `groupRecordsForPayment()` sudah skip record dengan `PENDING_PRICE`
- Setelah fitur ini: record dalam CLOSED period dijamin sudah punya harga → tidak ada lagi skip `PENDING_PRICE` untuk record tersebut
- Tidak perlu ubah logic generate — behavior otomatis lebih baik

### 8.3 Dashboard
- KPI "Pending Harga" sekarang bisa breakdown: `X record belum ada di tabel harga` vs `Y record belum masuk periode laporan`

---

## 9. Access Control

| Aksi | L1 | L2 | L3 |
|------|----|----|----|
| Lihat tabel harga | ✅ | ✅ | ✅ |
| Tambah/edit/hapus harga | ✅ | ❌ | ❌ |
| Buat periode laporan | ✅ | ❌ | ❌ |
| Preview penutupan | ✅ | ✅ | ✅ |
| Tutup laporan | ✅ | ❌ | ❌ |
| Buka kembali laporan | ✅ | ❌ | ❌ |
| Apply harga manual (existing) | ✅ | ❌ | ❌ |

---

## 10. Error States & Guard Rules

| Skenario | Behavior |
|----------|---------|
| Tambah harga dengan rentang tanggal overlap untuk spesies+supplier yang sama | Validasi error: "Sudah ada harga untuk Jati–PT Supplier A pada rentang ini" |
| Tutup laporan tapi 0 record cocok harga | Warning modal: "Tidak ada record yang bisa dikunci. Periksa tabel harga." |
| Hapus price entry yang sudah dipakai di CLOSED period | Tolak: "Harga ini sudah digunakan di Laporan W30 yang sudah ditutup" |
| Edit harga di price entry yang sudah dipakai | Tolak edit; sarankan buat entry baru dengan tanggal berlaku baru |
| Buka kembali laporan yang payment form-nya sudah PAID | Warning keras: "Form pembayaran sudah PAID. Membuka kembali laporan tidak akan mengubah payment form yang sudah ada." |
| Record dalam CLOSED period — user coba edit harga manual | Input disabled + tooltip: "Record ini terkunci dalam Laporan W30" |
