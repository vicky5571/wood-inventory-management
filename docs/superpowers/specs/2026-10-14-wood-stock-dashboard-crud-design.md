# Wood Stock Dashboard & Receiving CRUD — System Design Spec

**Date:** 2026-10-14  
**Status:** Approved  
**Classification:** Architectural (Modular Modern Web Application)  
**Target:** Single-page application (ESM, Native Web standards, Vanilla CSS, Zero build-step)

---

## 1. Problem Statement & Scope

The wood processing and milling facility requires a single system to record, manage (CRUD), and visualize inbound timber deliveries, physical tally inspections, volume discrepancies, and associated logistics and material payments based on factory-standard bilingual Indonesian-Chinese ledgers.

The application must run in modern web browsers without heavy compilation or bundling overhead, support offline persistence via LocalStorage with memory fallback, adhere to strict modular file size limits (<250 LOC per file), and provide automated unit test coverage with Node.js native test runner (`node:test`).

---

## 2. Core Domain Data Model (SSOT)

All domain entities are defined in `src/types/index.ts`. The central entity representing a timber shipment is `WoodReceivingRecord`:

```typescript
export interface WoodReceivingRecord {
  id: string;

  // Delivery & Legal Document Identifiers
  receiptDate: string;           // Penerimaan / 到货日期 (YYYY-MM-DD)
  docDate?: string;              // Dokumen Tanggal / 发货时间
  truckPlateNumber: string;      // No. Pol / 车牌号
  forestryDocNumber: string;     // SKSHHK / DKP / SLK (Official Forestry Permit)
  receiptNumber: string;         // Nomor Kwitansi / 订货单号
  contractNumber: string;        // No Kontrak / 合同编号
  supplierName: string;          // Nama Pemilik Hasil Hutan / 供应商

  // Wood Specifications & Yard Location
  woodSpecies: string;           // Jenis Kayu / 树种 (e.g. Teak/Jati, Merbau, Mahoni, Sengon)
  woodLengthM: number;           // Panjang Kayu (in meters)
  kavlingNumber: string;         // Nomer Kav / 进厂批号 (Yard Lot / Stack ID)
  storageYard: string;           // TPK / 木堆场地

  // Quantities & Discrepancies (Delivered vs Tally)
  deliveredPieces: number;       // Jumlah Batang / 送货根数
  deliveredVolumeM3: number;     // Volume Delivery / 送货立方 (m³)
  tallyPieces: number;           // Batang Tally / 检尺根数
  tallyVolumeM3: number;         // Volume Tally / 检尺立方 (m³)

  // Financials — Timber Material (Pembayaran Kayu)
  timberPricePerM3: number;      // Harga / m³
  timberGrossTotal: number;      // Total Harga = tallyVolumeM3 * timberPricePerM3
  timberPphRate: number;         // PPh rate % (e.g. 0.5% or 1.5%)
  timberPphAmount: number;       // PPh Tax Amount
  timberNetPayable: number;      // Net Timber = timberGrossTotal - timberPphAmount

  // Financials — Freight / Logistics (Pembayaran Ongkos Kirim)
  freightRatePerM3: number;      // Ongkir / m³
  freightGrossTotal: number;     // Total Ongkir = tallyVolumeM3 * freightRatePerM3
  freightPphAmount: number;      // PPh Tax Ongkir (PPh 23)
  freightNetPayable: number;     // Net Ongkir = freightGrossTotal - freightPphAmount

  // Broker & Overall Summary
  brokerFee: number;             // Broker fee
  grandNetPayable: number;       // timberNetPayable + freightNetPayable + brokerFee

  createdAt: string;
  updatedAt: string;
}

export interface DashboardMetrics {
  totalDeliveredVolumeM3: number;
  totalTallyVolumeM3: number;
  volumeDiscrepancyM3: number;
  totalDeliveredPieces: number;
  totalTallyPieces: number;
  pieceDiscrepancy: number;
  totalNetTimberPayable: number;
  totalNetFreightPayable: number;
  totalGrandExpenditure: number;
  totalRecordsCount: number;
  activeKavlingCount: number;
  speciesVolumeBreakdown: Record<string, number>;
}
```

---

## 3. Mathematical Calculations & Business Rules

Pure calculation functions are located in `src/utils/timber-calc.ts`:

1. **Volume Discrepancy**:
   $$\Delta V = V_{\text{tally}} - V_{\text{delivered}}$$
   - $\Delta V \ge 0$: Green badge (delivery volume confirmed or excess measured).
   - $\Delta V < 0$: Red badge (shortage detected upon gate tally inspection).

2. **Stems Discrepancy**:
   $$\Delta B = B_{\text{tally}} - B_{\text{delivered}}$$

3. **Timber Payment (Pembayaran Kayu)**:
   - $\text{Gross Timber} = V_{\text{tally}} \times \text{Harga}_{\text{kayu/m3}}$
   - $\text{PPh Timber} = \text{Gross Timber} \times \left(\frac{\text{PPh Rate}}{100}\right)$
   - $\text{Net Timber} = \text{Gross Timber} - \text{PPh Timber}$

4. **Freight Payment (Pembayaran Ongkos Kirim)**:
   - $\text{Gross Freight} = V_{\text{tally}} \times \text{Ongkir}_{\text{rate/m3}}$
   - $\text{Net Freight} = \text{Gross Freight} - \text{PPh Freight}$

5. **Grand Total Batch Outlay**:
   $$\text{Grand Total} = \text{Net Timber} + \text{Net Freight} + \text{Broker Fee}$$

6. **Validation Invariants**:
   - Volume, pieces, rates, and tax amounts must be non-negative real numbers.
   - If user leaves PPh empty, it defaults to 0.

---

## 4. System & Component Architecture

### 4.1 Modular Layout (<250 LOC per module)
```text
wood-inventory-management/
├── public/
│   └── index.html               # Semantic HTML5 shell, navigation, mount targets
├── src/
│   ├── types/
│   │   └── index.ts             # Domain types, filters, metric interfaces
│   ├── styles/
│   │   └── theme.css            # CSS custom properties, grid layout, badges, modal
│   ├── utils/
│   │   ├── calculator.ts        # General volumetric conversions
│   │   └── timber-calc.ts       # Specialized receiving math & metric aggregation
│   ├── persistence/
│   │   ├── storage.ts           # Storage adapter (LocalStorage + Memory fallback)
│   │   └── seed-data.ts         # Initial pre-loaded realistic Indonesian timber records
│   ├── components/
│   │   ├── kpi-dashboard.ts     # Metric cards & species distribution bar rendering
│   │   ├── record-table.ts      # Bilingual table, search, filters, action buttons
│   │   └── record-modal.ts      # Add/Edit modal dialog with dynamic live calculation
│   └── app.ts                   # App initialization & UI event coordinator (<150 LOC)
└── test/
    ├── smoke.test.ts            # Baseline tests
    └── timber-calc.test.ts      # Domain calculation & aggregation test suite
```

### 4.2 State Flow & Persistence Lifecycle
1. On initial boot, `src/app.ts` requests records from `storageAdapter`.
2. If store is empty, it hydrates from `seed-data.ts` (records for Teak/Jati, Merbau, Mahoni, Sengon) and saves them.
3. User interactions (Search, Filter, Add, Edit, Delete, Reset) mutate the persistent store and trigger a clean re-render of KPI cards and the table.

---

## 5. User Interface Specifications

### 5.1 Bilingual Header Reference
| Field Label | Subtitle / Chinese | Description |
| :--- | :--- | :--- |
| **Penerimaan** | 到货日期 | Date timber arrived at mill |
| **No. Polisi** | 车牌号 | Vehicle truck plate number |
| **SKSHHK / DKP** | 送货单号 | Official forestry legal document |
| **No. Kontrak** | 合同编号 | Procurement contract reference |
| **Supplier** | 供应商 | Forestry owner / timber vendor |
| **Jenis Kayu** | 树种 / 材种 | Timber species (Teak, Merbau, etc.) |
| **No. Kavling** | 进厂批号 | Yard batch lot code |
| **Batang (Tally)**| 检尺根数 | Measured physical stem count |
| **Volume (Tally)**| 检尺立方 (m³) | Measured physical volume |
| **Selisih Vol** | 误差立方 | Variance ($m^3$) between delivered & tally |
| **Net Kayu** | 木材应付 | Payable net material cost |
| **Net Ongkir** | 运费应付 | Payable net freight cost |
| **Total Bayar**| 应付金额 | Final net batch disbursement |

### 5.2 Modal Form Interaction
- Modal displays 4 fieldsets: Documents, Wood & Yard Specs, Tally Measurements, and Pricing & Taxes.
- Key inputs (`tallyVolumeM3`, `timberPricePerM3`, `timberPphRate`, `freightRatePerM3`, etc.) have `input` event listeners that recalculate Gross, PPh, and Net previews in real time before the user clicks "Simpan / Save".

---

## 6. Verification & Testing Criteria

1. **Unit Testing (`node:test`)**:
   - `test/timber-calc.test.ts` verifies:
     - Accurate gross, PPh withholding, and net calculation for timber.
     - Accurate freight gross and net calculation.
     - Accurate discrepancy calculation between delivery document and tally volume.
     - Accurate dashboard aggregate metrics (total volume, grand expenditures, species breakdown).
     - Non-negative boundary constraints (throwing `RangeError` on invalid values).
2. **Execution Baseline**:
   - `node --test` runs in <150 ms with 0 failures.
3. **In-Browser Verification**:
   - Launching a local HTTP server confirms that the dashboard renders KPI cards, displays sample records with bilingual columns, permits adding/editing records with live computation, and persists edits upon page refresh.
