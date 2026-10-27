# Spec: Price Auto-Fill dari Tabel Harga saat Input Penerimaan

**Date:** 2026-10-28
**Status:** Accepted
**Related ADR:** ADR-0018
**Baseline:** 949 passed, 0 failed

---

## 1. Latar Belakang

`ManifestItemRow` menampilkan field `timberPricePerM3` (Harga / m³) yang selalu
kosong saat penerimaan baru dibuat. Sistem tidak pernah mengkonsultasi tabel harga
(`timber_price_entries`) meskipun fungsi lookup sudah tersedia lengkap di
`src/utils/price-lookup.ts`.

Alur saat ini:
```
Input species → timberPricePerM3 = null → simpan → masuk Pending Pricing
→ operator isi manual satu per satu
```

Alur yang diinginkan:
```
Input species → lookup tabel harga → auto-fill jika ada match → operator verifikasi
→ simpan → tidak masuk Pending Pricing (kecuali memang belum ada harga)
```

---

## 2. Komponen yang Terlibat

| Komponen | Role | Perubahan |
|----------|------|-----------|
| `useTimberPrices` hook | Sumber data `priceEntries` | Tidak diubah |
| `RecordModal` | Coordinator — ambil `priceEntries`, pass ke bawah | Tambah hook call |
| `ManifestItemsTable` | Pass-through prop | Tambah prop `priceEntries` |
| `ManifestItemRow` | Trigger lookup saat species berubah | Logika utama + badge UI |
| `lookupPriceForRecord()` | Pure lookup function | Tidak diubah |

---

## 3. Behavior Detail

### 3a. Trigger Kondisi Auto-Fill

Auto-fill **hanya terjadi** jika semua kondisi ini terpenuhi:

| Kondisi | Nilai yang memenuhi |
|---------|-------------------|
| `woodSpecies` berubah ke nilai non-empty | species dipilih dari combobox |
| `item.timberPricePerM3 === null` | field harga belum pernah diisi operator |
| `priceEntries.length > 0` | tabel harga tidak kosong |

Auto-fill **tidak terjadi** jika:
- `timberPricePerM3` sudah ada (angka > 0 atau angka 0 yang sengaja diisi)
- Species berubah ke string kosong
- Record dalam mode edit dan sudah punya harga dari DB

### 3b. Lookup Logic (tidak berubah dari `lookupPriceForRecord`)

Priority:
1. Supplier-specific match (cocok `supplierName` + `woodSpecies` + date range)
2. Global match (tidak ada supplier, cocok `woodSpecies` + date range)

Untuk lookup, `ManifestItemRow` membutuhkan:
- `woodSpecies` — dari value yang baru dipilih
- `supplierName` — dari `form.supplierName` di `RecordModal` (di-pass sebagai prop)
- `receiptDate` — dari `form.receiptDate` di `RecordModal` (di-pass sebagai prop)

### 3c. Hasil Auto-Fill

Jika match ditemukan, dua field di-update sekaligus:
- `timberPricePerM3` ← `entry.pricePerM3`
- `timberPphRate` ← `entry.timberPphRate`

### 3d. Badge Sumber Harga

Saat `timberPricePerM3` tidak null dan field baru saja di-auto-fill, tampilkan
badge kecil di bawah field harga:

```
[ Harga / m³ (单价)        ]   ← input field
  ● Auto: Rp 4.500.000 (Jati Global)   ← badge, hanya saat auto-filled
```

Badge harus:
- Menampilkan nama entry (`woodSpecies` + `supplierName` jika ada, atau "Global")
- Hilang saat operator mengedit field harga secara manual
- Tidak muncul saat form edit yang sudah ada harga dari DB

Badge styling (konsisten dengan design system amber):
```tsx
<span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-1.5 py-0.5 font-medium flex items-center gap-1">
  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
  Auto: Rp {pricePerM3.toLocaleString('id-ID')} · {sourceLabel}
</span>
```

### 3e. Override Manual

Saat operator mengubah nilai field `timberPricePerM3` secara manual:
- Badge hilang
- Nilai baru disimpan
- Auto-fill tidak akan terpicu lagi untuk baris ini kecuali species di-reset ke null
  lalu dipilih ulang

---

## 4. Props Interface Baru

### `ManifestItemRow`

```ts
// TAMBAH ke ManifestItemRowProps:
priceEntries?: TimberPriceEntry[];   // dari tabel harga, passed down
supplierName?: string;               // dari form.supplierName di RecordModal
receiptDate?: string;                // dari form.receiptDate di RecordModal
```

### `ManifestItemsTable`

```ts
// TAMBAH ke ManifestItemsTableProps:
priceEntries?: TimberPriceEntry[];
supplierName?: string;
receiptDate?: string;
```

### `RecordModal`

```ts
// TAMBAH di body RecordModal:
const { activeEntries: priceEntries } = useTimberPrices();
// Pass ke ManifestItemsTable:
<ManifestItemsTable
  items={items}
  onChange={setItems}
  availableSpecies={availableSpecies}
  priceEntries={priceEntries}           // NEW
  supplierName={form.supplierName}      // NEW
  receiptDate={form.receiptDate}        // NEW
/>
```

---

## 5. State Management di `ManifestItemRow`

Badge "auto-filled" perlu dilacak per baris. Gunakan local state:

```ts
const [autoFilledEntryLabel, setAutoFilledEntryLabel] = useState<string | null>(null);
```

- Di-set saat auto-fill terjadi: nilai = label entry (e.g. `"Jati Global"` atau
  `"Jati · Perhutani"`)
- Di-reset ke `null` saat operator mengubah `timberPricePerM3` secara manual
- Tidak disimpan ke `ManifestItemInput` — hanya untuk UI feedback di session ini

---

## 6. Skenario Lengkap

### Skenario A — Form baru, species dipilih, harga ada di tabel

| Step | State |
|------|-------|
| Buka form baru | `timberPricePerM3 = null`, badge tidak ada |
| Pilih supplier "Perhutani Randublatung" | — |
| Pilih species "Jati" | Lookup: supplier-specific match ditemukan → auto-fill Rp 4.800.000 + PPh 0.5% |
| Badge muncul | "Auto: Rp 4.800.000 · Jati · Perhutani Randublatung" |
| Operator tidak mengubah harga → simpan | Record tersimpan dengan harga, tidak masuk pending pricing |

### Skenario B — Form baru, species dipilih, harga tidak ada

| Step | State |
|------|-------|
| Pilih species "Kayu Lokal ABC" | Lookup: tidak ada match |
| Field harga | tetap null/kosong, tidak ada badge |
| Simpan | Record masuk pending pricing (behavior lama tidak berubah) |

### Skenario C — Operator ubah harga setelah auto-fill

| Step | State |
|------|-------|
| Auto-fill terjadi: Rp 4.800.000 | badge muncul |
| Operator ketik 5.000.000 | `timberPricePerM3 = 5000000`, badge hilang |
| Simpan | harga operator yang dipakai |

### Skenario D — Form edit record yang sudah ada harga

| Step | State |
|------|-------|
| Buka form edit, `timberPricePerM3 = 3.000.000` | badge tidak muncul |
| Operator ganti species ke "Merbau" | `timberPricePerM3 !== null` → tidak ada auto-fill |
| Harga tetap 3.000.000 | operator yang bertanggung jawab |

### Skenario E — Supplier dipilih setelah species

| Step | State |
|------|-------|
| Pilih species "Jati" tanpa supplier | Lookup: global match → auto-fill Rp 4.500.000 |
| Pilih supplier "Perhutani Randublatung" | Tidak ada re-trigger (out of scope ADR-0018) |
| Harga tetap Rp 4.500.000 | operator bisa ubah manual jika perlu |

---

## 7. Tidak Termasuk dalam Scope

- Re-trigger lookup saat supplier berubah (bisa jadi ADR-0019 / future)
- Menyimpan `priceEntryId` ke record saat auto-fill (sudah ditangani di period close)
- Perubahan halaman Pending Pricing
- Perubahan API atau DB schema
- Perubahan `lookupPriceForRecord()` atau `useTimberPrices()`

---

## 8. Edge Cases

| Case | Behavior |
|------|----------|
| `priceEntries` kosong array (tabel harga belum diisi) | Lookup tidak dipanggil, tidak ada auto-fill, tidak ada error |
| `receiptDate` kosong (operator belum isi tanggal) | Lookup tetap dipanggil dengan today sebagai fallback |
| Species combobox di-clear ke empty string | Auto-fill tidak terpicu (kondisi non-empty tidak terpenuhi) |
| Dua baris di manifest dengan species sama | Masing-masing baris independent — auto-fill per baris |
| Baris baru ditambah via "Tambah Baris" | `timberPricePerM3` di-copy dari baris terakhir (existing behavior di `ManifestItemsTable.handleAddItem`) — auto-fill tidak terjadi karena species belum berubah |

---

## 9. Test Coverage

### Unit test baru: `test/price-autofill-receiving.test.ts`

```
[ ] lookupPriceForRecord: supplier-specific match lebih prioritas dari global
[ ] lookupPriceForRecord: global match digunakan saat tidak ada supplier-specific
[ ] lookupPriceForRecord: tidak match jika species berbeda
[ ] lookupPriceForRecord: tidak match jika receiptDate sebelum effectiveFrom
[ ] lookupPriceForRecord: tidak match jika receiptDate setelah effectiveTo
[ ] lookupPriceForRecord: entry tanpa effectiveTo dianggap masih aktif (open-ended)
```

Catatan: `lookupPriceForRecord` sudah ada dan kemungkinan sudah ada test di
`test/payment-form-grouping.test.ts`. Verifikasi dulu sebelum membuat duplikat.

---

## 10. Verification Checklist

```
[ ] Species dipilih → timberPricePerM3 dan timberPphRate ter-fill otomatis (jika match)
[ ] Badge "Auto: Rp X · Label" muncul setelah auto-fill
[ ] Badge hilang saat operator edit field harga
[ ] Tidak ada auto-fill jika timberPricePerM3 sudah ada (form edit)
[ ] Tidak ada auto-fill jika tidak ada match di tabel harga
[ ] Form simpan tanpa harga tetap bisa (pending pricing tidak diblokir)
[ ] LOC ManifestItemRow tetap < 250 (saat ini 208 baris)
[ ] LOC RecordModal tetap < 250 (saat ini 234 baris)
[ ] npm test >= 949 pass, 0 fail
[ ] npm run build:check 0 errors
[ ] npm run drift:check 0 violations
```
