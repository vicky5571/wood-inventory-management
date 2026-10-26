# Export / Import Modal — Feature Specification
## Buku Besar Penerimaan Kayu

**Feature:** Replace "Export CSV" button with a full Export/Import modal  
**Page:** `/ledger` (`app/ledger/page.tsx`)  
**Status:** Planned  
**Author:** Engineering  

---

## 1. Problem Statement

The current "Export CSV" button in `Toolbar.tsx` exports **all currently-filtered records** immediately on click with no date-range control and no format choice. There is also no import capability. Users need:

1. Flexible date-range selection before exporting (not tied to the toolbar filter state)
2. A choice of export format: CSV or Excel (`.xlsx`)
3. The ability to import records from a CSV or Excel file

---

## 2. User Stories

| ID | As a… | I want to… | So that… |
|----|--------|-----------|---------|
| US-1 | Level 1 operator | choose a preset date range before exporting | I get a targeted file without manually setting toolbar filters |
| US-2 | Level 1 operator | export as Excel with styled headers | I can share a formatted report directly |
| US-3 | Level 1 operator | export as CSV | I can process data in other tools |
| US-4 | Level 1 operator | import records from CSV or Excel | I can bulk-load data from another system |
| US-5 | Level 1 operator | preview imported rows before confirming | I can catch errors before they enter the ledger |
| US-6 | Any user | download a blank import template | I know the correct column format |

---

## 3. Scope

### In Scope
- New modal component `ExportImportModal`
- Date preset pills: This Month, Last Month, This Week, Last Week, Custom Range
- Export formats: CSV, Excel (`.xlsx`) with styled amber header row
- Import: `.csv` and `.xlsx`/`.xls` files
- Import preview: first 10 rows, column validation
- Duplicate handling: skip duplicates by `receiptNumber`
- Download blank template (CSV and Excel)

### Out of Scope
- Server-side export (all processing is client-side)
- Import history / audit trail (activity log entry only)
- Role-gated import (canWrite gate reused from existing pattern)
- Scheduled / automated exports

---

## 4. UI Design

### 4.1 Trigger Button

**Location:** `Toolbar.tsx`, where the current "Export CSV" button lives.

**Before:**
```
[ ↓ Export CSV ]
```

**After:**
```
[ ↑↓ Export / Import ]
```

Icon: `ArrowUpDown` from lucide-react  
Style: same as current export button (`border border-gray-200 rounded-xl shadow-2xs`)

---

### 4.2 Modal Layout

```
┌─────────────────────────────────────────────────────┐
│  ↑↓ Export / Import Data          [×]               │
│  Buku Besar Penerimaan Kayu                         │
├─────────────────────────────────────────────────────┤
│  [ Export ]  [ Import ]   ← Tab switcher            │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ── EXPORT TAB ──────────────────────────────────   │
│                                                     │
│  Rentang Tanggal (Range Selector)                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │This Month│ │Last Month│ │This Week │ ...         │
│  └──────────┘ └──────────┘ └──────────┘            │
│                                                     │
│  [Custom] → shows date inputs: [dari] – [sampai]   │
│                                                     │
│  Preview count: "42 record akan diekspor"           │
│                                                     │
│  Format:                                            │
│  ◉ CSV    ○ Excel (.xlsx)                          │
│                                                     │
│  [ ↓ Export CSV ]  or  [ ↓ Export Excel ]          │
│                                                     │
│  ── IMPORT TAB ──────────────────────────────────   │
│                                                     │
│  Drop zone / file picker (.csv, .xlsx, .xls)       │
│  ┌────────────────────────────────────────────┐    │
│  │   📁 Drag & drop file atau klik untuk pilih│    │
│  │       .csv / .xlsx / .xls, maks 5 MB       │    │
│  └────────────────────────────────────────────┘    │
│                                                     │
│  [After file selected → show preview table]         │
│                                                     │
│  Summary: "38 baris valid • 2 duplikat dilewati"   │
│                                                     │
│  [ ✓ Konfirmasi Import ]  [ Batal ]                │
│                                                     │
│  ─ Download Template ──────────────────────────    │
│  [ ↓ Template CSV ]  [ ↓ Template Excel ]          │
└─────────────────────────────────────────────────────┘
```

**Modal size:** `max-w-2xl`, scrollable body  
**z-index:** `z-50` (matches other modals in the app)  
**Overlay:** `bg-[#101828]/60 backdrop-blur-xs` (matches app pattern)

---

### 4.3 Date Preset Logic

| Preset | `startDate` | `endDate` |
|--------|------------|---------|
| This Month | `YYYY-MM-01` (1st of current month) | today |
| Last Month | 1st of previous month | last day of previous month |
| This Week | Monday of current week | today |
| Last Week | Monday of previous week | Sunday of previous week |
| Custom | user input | user input |
| All Data | `undefined` | `undefined` |

All dates compared against `WoodReceivingRecord.receiptDate` (field: `YYYY-MM-DD` string).

---

## 5. Export Specification

### 5.1 CSV Export

- **Reuses:** `generateRecordsCsvContent()` from `src/utils/records-csv.ts`
- **Filter:** records filtered by modal date range (independent of toolbar filter)
- **Encoding:** UTF-8 with BOM (`\uFEFF`) so Excel opens it correctly
- **Filename:** `penerimaan_kayu_YYYYMMDD_YYYYMMDD.csv`

### 5.2 Excel Export

- **Library:** `xlsx` (SheetJS Community Edition, `npm install xlsx`)
- **Filename:** `penerimaan_kayu_YYYYMMDD_YYYYMMDD.xlsx`
- **Sheet name:** `Buku Besar`
- **Styling:**
  - Row 1 (header): background `#FFC908` (amber brand), bold, font color `#101828`
  - Column widths: auto-fit based on header length
  - Freeze top row (`freezeRows: 1`)
- **Data:** same 27 columns as CSV (reuses `CSV_HEADERS`)

> Note: SheetJS CE supports data + basic column widths. True cell color styling requires the Pro version OR writing raw XML. The plan uses `!cols` for widths and outputs a clean spreadsheet. Header row color will be achieved via a separate `!styles` workaround documented in the implementation notes.

### 5.3 Date Filtering Function (new utility)

```ts
// src/utils/records-export-filter.ts
export function filterRecordsByDateRange(
  records: WoodReceivingRecord[],
  startDate?: string,   // YYYY-MM-DD or undefined = no lower bound
  endDate?: string      // YYYY-MM-DD or undefined = no upper bound
): WoodReceivingRecord[]
```

Comparison: lexicographic string compare on `receiptDate` (safe for `YYYY-MM-DD`).

---

## 6. Import Specification

### 6.1 Supported Formats
- `.csv` — parsed with custom RFC 4180 parser
- `.xlsx` / `.xls` — parsed with SheetJS `read()`

### 6.2 Column Mapping

Import file must have headers matching `CSV_HEADERS` (case-insensitive, trimmed). The parser maps columns to `WoodReceivingRecord` fields via a fixed index map.

Required columns (import will reject rows missing these):
- `Penerimaan (到货日期)` → `receiptDate`
- `No. Polisi (车牌号)` → `truckPlateNumber`
- `No. Kwitansi (订货单号)` → `receiptNumber`
- `Supplier (供应商)` → `supplierName`
- `Jenis Kayu (树种)` → `woodSpecies`

All other columns: optional, default to `0` or `''` if missing.

### 6.3 Duplicate Detection

A record is considered a **duplicate** if `receiptNumber` matches an existing record in `allRecords`. Duplicates are **skipped** (not replaced). The user sees a count of skipped duplicates in the preview summary.

### 6.4 ID Generation

Imported records that pass validation receive a new `id` via `crypto.randomUUID()` (overrides any `id` column in the file to prevent collisions).

### 6.5 Validation Rules

| Rule | Behavior |
|------|---------|
| `receiptDate` not a valid `YYYY-MM-DD` | Row marked as error, skipped |
| Numeric fields (`tallyVolumeM3`, etc.) NaN after parse | Default to `0` |
| `paymentStatus` not one of `UNPAID/PARTIAL/PAID` | Default to `UNPAID` |
| File > 5 MB | Rejected before parsing, user shown error |
| File with 0 data rows | Error shown: "File tidak memiliki data" |
| Header row missing required columns | Full import rejected with specific column names listed |

### 6.6 Import Preview Table

Shows first **10 rows** of valid parsed data with columns:
`receiptDate` | `truckPlateNumber` | `receiptNumber` | `supplierName` | `woodSpecies` | `tallyVolumeM3`

Below the table: summary pill row:
- 🟢 `N baris valid`
- 🟡 `N duplikat dilewati`
- 🔴 `N baris error`

### 6.7 Confirm Import Flow

1. User clicks "Konfirmasi Import"
2. Valid (non-duplicate) records are passed to `importRecords()` in `useWoodRecords`
3. `importRecords()` merges into `allRecords` (prepend), calls `persistRecords()` and sync
4. Modal closes
5. Activity log entry: `RECORDS_IMPORTED` with count
6. Toast: "X record berhasil diimport"

---

## 7. Template Download

A blank template with only the header row is available for download as:
- `template_import_buku_besar.csv`
- `template_import_buku_besar.xlsx`

The Excel template includes a frozen header row with amber styling and example data in row 2 (grayed out / italic as a hint row).

---

## 8. Accessibility & UX

- Modal trap focus (`Escape` closes, backdrop click closes)
- Tab switcher uses `role="tablist"` / `role="tab"` / `role="tabpanel"`
- File drop zone has `aria-label` and keyboard activation (`Enter`/`Space` on focused zone)
- Export button is disabled (with spinner) while generating large files
- Import confirm button disabled until a valid file is loaded

---

## 9. Error States

| Scenario | User-Facing Message |
|----------|-------------------|
| Export with 0 records in range | "Tidak ada data dalam rentang tanggal ini" (button disabled) |
| File type not supported | "Format file tidak didukung. Gunakan .csv, .xlsx, atau .xls" |
| File > 5 MB | "Ukuran file melebihi batas 5 MB" |
| Parse failure (corrupt file) | "Gagal membaca file. Pastikan file tidak rusak." |
| All rows are duplicates | "Semua baris sudah ada di buku besar. Tidak ada data baru." |
| Network error on import sync | Existing `notifySyncFailure()` toast |

