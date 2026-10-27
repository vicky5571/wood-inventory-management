# Spec: Real-Time Totals Footer pada Payment Form Detail View

**Date:** 2026-10-28
**Status:** Accepted
**Related ADR:** ADR-0017 (payment form totals source of truth)
**Baseline:** 949 passed, 0 failed

---

## 1. Latar Belakang & Root Cause

Halaman detail form pembayaran (DRAFT) menampilkan section **"Ringkasan Keuangan &
Volume"** yang berisi 5 angka agregat:

| Field | Label UI |
|-------|----------|
| `totalTallyPieces` | Total Batang |
| `totalTallyVolumeM3` | Total Volume |
| `totalTimberGrossIDR` | Total Bruto |
| `totalTimberPphIDR` | Potongan PPh 22 |
| `totalTimberNetIDR` | Netto / Yang Dibayar |

### Masalah 1 — Stale footer saat DRAFT diedit

`PaymentFormDetailView` line 156 saat ini memanggil:

```tsx
<PaymentFormTotalsFooter
  form={{ ...activeForm, lines, totalAmountIDR: computeFormTotals(lines).totalAmountIDR }}
/>
```

Hanya `totalAmountIDR` yang di-override dari `computeFormTotals(lines)`. Empat field
lain (`totalTallyVolumeM3`, `totalTallyPieces`, `totalTimberGrossIDR`,
`totalTimberPphIDR`, `totalTimberNetIDR`) masih dibaca dari `activeForm` (DB snapshot).

Akibat: operator menambah / ubah / hapus baris di `LineItemEditor` → footer **tidak
berubah** untuk 4 field tersebut sampai klik "Simpan Perubahan".

### Masalah 2 — Tidak ada sinyal visual "belum disimpan"

Tidak ada indikator yang membedakan "angka ini sudah di DB" vs "angka ini adalah
preview baris yang belum tersimpan". Operator tidak tahu apakah footer sinkron dengan
baris yang ia lihat.

### Masalah 3 — Manual POST form bisa punya totals ≠ 0 tapi lines = []

Form yang dibuat via `POST /api/payment-forms` langsung membawa nilai totals dari
request body (bisa berisi angka acak). Saat form itu dibuka di UI, footer menampilkan
angka dari DB — tidak ada baris — tapi angkanya tidak nol. Ini membingungkan operator.

Fix ini sekaligus menutup masalah 3: untuk DRAFT, footer selalu dihitung dari `lines`
state yang sebenarnya ada di editor, bukan dari angka yang tersimpan di DB.

---

## 2. Keputusan Desain (sesuai ADR-0017)

### 2a. DRAFT — sumber kebenaran footer: `computeFormTotals(lines)`

Footer DRAFT dihitung **real-time dari `lines` React state** setiap render.

- `lines` selalu up-to-date dengan apa yang ditampilkan `LineItemEditor`
- `computeFormTotals` adalah pure function deterministic — overhead O(n), n < 20 baris
- Menghilangkan partial-override yang ada saat ini (hanya `totalAmountIDR`)

### 2b. ISSUED / PAID / VOID — sumber kebenaran footer: DB snapshot

Form yang sudah terkunci tidak bisa diedit. `activeForm` dari DB adalah truth final
untuk kepentingan audit trail. Tidak ada perubahan behavior.

### 2c. `isDirty` flag — sinyal visual "preview, belum disimpan"

`isDirty` di-set `true` setiap kali `handleLinesChange` dipanggil, dan `false` setelah
`handleSaveDraft` berhasil. Badge kecil ditampilkan di header footer saat `isDirty`.

### 2d. Tidak ada perubahan API, DB, atau type SSOT

Perubahan murni di layer UI. Tidak ada schema change, tidak ada endpoint baru.

---

## 3. Behavior yang Diinginkan

### Skenario A — Form baru DRAFT, belum ada baris

| Field | Sebelum fix | Sesudah fix |
|-------|------------|------------|
| Footer Total Batang | nilai dari DB (bisa angka acak dari manual POST) | 0 btg |
| Footer Total Volume | nilai dari DB | 0.0000 m³ |
| Footer Netto | nilai dari DB | Rp 0 |
| Badge "Belum Disimpan" | tidak ada | tidak ada (lines = DB value, isDirty=false) |

### Skenario B — Operator tambah/edit baris, belum klik Simpan

| Field | Sebelum fix | Sesudah fix |
|-------|------------|------------|
| 4 dari 5 footer fields | angka lama dari DB | angka real-time dari lines state |
| `totalAmountIDR` | sudah real-time (partial fix) | tetap real-time |
| Badge "Belum Disimpan" | tidak ada | ✅ muncul di header footer |

### Skenario C — Setelah klik "Simpan Perubahan" (berhasil)

| State | Nilai |
|-------|-------|
| `isDirty` | `false` → badge hilang |
| Footer | masih menampilkan angka yang sama (real-time dari lines state, lines tidak berubah) |
| DB | tersimpan → konsisten |

### Skenario D — Save gagal (network error)

| State | Nilai |
|-------|-------|
| `isDirty` | tetap `true` → badge tetap muncul |
| Footer | tetap menampilkan preview dari lines state |
| Operator tahu | ada data belum tersimpan |

### Skenario E — Form ISSUED / PAID / VOID

| Field | Sebelum fix | Sesudah fix |
|-------|------------|------------|
| Footer | dari DB snapshot | dari DB snapshot (tidak berubah) |
| Badge | tidak ada | tidak ada |
| `LineItemEditor` | tidak dirender | tidak dirender |

---

## 4. Komponen yang Berubah

### `PaymentFormDetailView.tsx` (satu-satunya file logika yang berubah)

1. Tambah `isDirty` state, `false` by default
2. `handleLinesChange` → set `isDirty = true`
3. `handleSaveDraft` → set `isDirty = false` setelah `updateForm` sukses (di dalam try, sebelum finally)
4. Ubah pass ke `PaymentFormTotalsFooter`:
   - DRAFT: pass computed totals penuh dari `computeFormTotals(lines)` (bukan partial)
   - Non-DRAFT: pass `activeForm` (tidak berubah)
5. Pass `isDirty` ke `PaymentFormTotalsFooter`

### `PaymentFormTotalsFooter.tsx` (perubahan UI minimal)

1. Tambah prop `isDirty?: boolean`
2. Tampilkan badge **"Preview — Belum Disimpan"** di header section jika `isDirty === true`
3. Tidak ada perubahan kalkulasi, layout, atau angka

---

## 5. Props Interface

### `PaymentFormTotalsFooter` — props baru

```ts
interface PaymentFormTotalsFooterProps {
  form: PaymentForm;      // sudah ada
  isDirty?: boolean;      // NEW — true jika ada unsaved changes (DRAFT only)
}
```

### `PaymentFormDetailView` — state baru

```ts
const [isDirty, setIsDirty] = useState(false);
```

---

## 6. Visual Design

### Badge "Preview — Belum Disimpan"

```
┌──────────────────────────────────────────────────────────────────────┐
│ RINGKASAN KEUANGAN & VOLUME (金额及体积汇总)   ● Preview — Belum Disimpan │
│                                                                      │
│  25 btg  │  12.5000 m³  │  Rp 25.000.000  │  Rp 62.500  │  Rp 24.937.500 │
└──────────────────────────────────────────────────────────────────────┘
```

Styling badge:

```tsx
<span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 flex items-center gap-1">
  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
  Preview — Belum Disimpan
</span>
```

- Hanya muncul saat `isDirty === true`
- Warna konsisten dengan design system amber (sama dengan accent warna header DRAFT)

---

## 7. Logika Komputasi Footer (DRAFT vs non-DRAFT)

```tsx
// Di PaymentFormDetailView — computed setiap render (pure, O(n))
const footerTotals = isDraft
  ? computeFormTotals(lines)
  : {
      totalAmountIDR:       activeForm.totalAmountIDR,
      totalTallyVolumeM3:   activeForm.totalTallyVolumeM3,
      totalTallyPieces:     activeForm.totalTallyPieces,
      totalTimberGrossIDR:  activeForm.totalTimberGrossIDR,
      totalTimberPphIDR:    activeForm.totalTimberPphIDR,
      totalTimberNetIDR:    activeForm.totalTimberNetIDR,
    };

// Pass ke footer:
<PaymentFormTotalsFooter
  form={{ ...activeForm, ...footerTotals }}
  isDirty={isDirty}
/>
```

Pendekatan ini:
- Menghilangkan partial-override lama (`totalAmountIDR` only)
- Satu variabel `footerTotals` → mudah di-trace saat debugging
- Non-DRAFT tidak pernah masuk `computeFormTotals` → zero overhead untuk form historis

---

## 8. Edge Cases

| Case | Behavior |
|------|----------|
| Form ISSUED/PAID/VOID — `isDirty` tidak relevan | `isDirty` tidak pernah true untuk non-DRAFT karena `LineItemEditor` tidak dirender → `handleLinesChange` tidak pernah dipanggil |
| Form DRAFT baru dimuat — `lines` diisi dari `activeForm.lines` di useEffect | `isDirty = false`, tidak ada badge, footer sinkron dengan DB |
| Baris dihapus sampai kosong (lines = []) | `computeFormTotals([])` → semua 0 → footer menampilkan 0 semua + badge muncul |
| Save gagal | `isDirty` tetap true karena `setIsDirty(false)` ada di dalam try (sebelum finally), bukan di finally |
| Form dimuat ulang (re-navigate) | komponen unmount → remount → `isDirty` reset ke `false` default |
| Manual POST form dengan angka di body tapi lines kosong | Setelah fix: footer akan tampilkan 0 (dari `computeFormTotals([])`) — lebih jujur dari angka DB yang tidak sinkron |

---

## 9. Tidak Termasuk dalam Scope

- Auto-save saat baris berubah
- Konfirmasi "ada perubahan belum disimpan" saat navigasi away
- Perubahan `updatePaymentForm` di DB queries
- Perubahan API endpoint
- Perubahan type SSOT (`PaymentForm`, `PaymentFormLineItem`)

---

## 10. Test Coverage

### Unit test baru: `test/payment-form-totals-footer.test.ts`

```
[ ] Render dengan isDirty=false: tidak ada teks "Belum Disimpan" di output
[ ] Render dengan isDirty=true: muncul teks "Belum Disimpan"
[ ] Render dengan isDirty=undefined (default): tidak ada badge
[ ] Nilai footer sesuai dengan nilai form yang di-pass
```

### Update: `test/payment-form-grouping.test.ts`

Tidak perlu update — `computeFormTotals` tidak berubah.

---

## 11. Verification Checklist

```
[ ] Footer DRAFT menampilkan angka real-time saat baris diedit (sebelum simpan)
[ ] Semua 5 field footer DRAFT berasal dari computeFormTotals(lines), bukan dari activeForm
[ ] Badge "Belum Disimpan" muncul saat operator mengubah baris
[ ] Badge hilang setelah "Simpan Perubahan" berhasil
[ ] Badge tetap muncul jika save gagal (error)
[ ] Footer ISSUED/PAID/VOID tidak terpengaruh — tetap baca dari DB
[ ] Form manual POST dengan lines kosong menampilkan footer 0 (bukan angka DB)
[ ] LOC PaymentFormDetailView tetap < 250
[ ] LOC PaymentFormTotalsFooter tetap < 100 (saat ini 74 baris)
[ ] npm test >= 949 pass, 0 fail (+ test baru PaymentFormTotalsFooter)
[ ] npm run build:check 0 errors
[ ] npm run drift:check 0 violations
```
