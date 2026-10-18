# Design Spec: Mobile Tally Mode & Field Ledger Synergy (Phase 6)

**Document:** `docs/superpowers/specs/2026-10-18-mobile-tally-mode-design.md`  
**Date:** 2026-10-18  
**Status:** Approved for Implementation  
**Architecture:** Dedicated Mobile Field Workstation (`/tally`) + Mobile Card Feed in Ledger (`RecordTableMobileView.tsx`) + Hybrid Timber Measurement Engine (Sawn & Round Log) + Offline-First IndexedDB Persistence.

---

## 1. Executive Summary & Problem Statement

### 1.1 Context & Real-World Workflow
In timber sawmill, plywood, and log yard operations (**TPK - Tempat Penimbunan Kayu**), receiving incoming shipments is an outdoor physical operation. 
Currently, the system provides a comprehensive desktop ledger (`/ledger`) designed for office staff, accountants, and administrators on laptops or widescreen monitors (with a 26-column Excel spreadsheet view).

However, in real operations, the owner and field inspectors must verify timber directly at the truck bed under sunlight, dust, and intermittent cellular reception. Navigating a 26-column desktop table on a phone screen causes severe friction (excessive horizontal scrolling, pinch-zooming, and small touch targets).

### 1.2 Core Objectives
To bridge office bookkeeping and yard gate inspection without compromising architecture or maintainability, this phase delivers a dual-interface synergy:
1. **Dedicated Fullscreen Mobile Tally Workstation (`/tally`)**: A standalone, high-contrast field recording application optimized for one-handed mobile touch input, rapid log counting (+1, +5, +10), hybrid measurement math (sawn timber and round logs), and offline-first IndexedDB persistence.
2. **Mobile Card Feed in Ledger (`RecordTableMobileView.tsx`)**: An adaptive card view within `/ledger` that presents incoming trucks as easy-to-read vertical cards on small viewports (< 768px), paired with a prominent quick-launch shortcut to `/tally`.
3. **Hybrid Measurement Calculation Engine**: Extends `src/utils/timber-calc.ts` to support both dimensional sawn lumber ($T \times L \times P$) and round log cylindrical measurement formulas ($D \times L$).
4. **Strict Architectural Discipline**: Enforces the Strangler Pattern (<250 LOC per module), SSOT domain types (`src/types/index.ts`), zero external npm dependencies, and Level 1 (Owner) write access control.

---

## 2. User Experience & Navigation Flows

```
[ Mobile Browser / PWA ]
          │
          ├──> /ledger (Buku Besar)
          │      ├── Desktop (≥ 768px): Excel 26-column & Compact Views
          │      └── Mobile (< 768px): 
          │            ├── Segmented switch: [ 📱 Kartu / 卡片 | 📊 Excel | 📄 Ringkas ]
          │            ├── Truck cards (Plate, Supplier, Delivered vs Tally, Payment Badge)
          │            └── Quick Action Banner: "📱 Buka Tally Lapangan (打开检尺台)" ──┐
          │                                                                     │
          └──> /tally (Dedicated Field Workstation) <───────────────────────────┘
                 ├── Clean header: Offline status & Active Yard
                 ├── Truck & Supplier quick select
                 ├── Relational Yard & Kavling selector (with ⚠️ Penuh/Maintenance warning)
                 ├── Hybrid Tally Engine (Sawn Timber + Round Log)
                 ├── Batang Stepper (+1, +5, +10, -1) & live volumetric math
                 ├── Discrepancy meter vs Surat Jalan (alert before driver leaves)
                 └── "Simpan & Sinkron Manifest" button (Direct save to IndexedDB & SQLite)
```

### 2.1 User Personas
- **The Owner / Chief Yard Inspector (Level 1 - Full CRUD)**:
  - Outdoors: Opens `/tally` on smartphone at the truck bed, inputs physical dimensions, counts pieces, compares against Surat Jalan, and commits manifest directly.
  - Indoors/Office: Opens `/ledger` on laptop for financial reporting, tax deductions (PPh), and invoice generation.
- **Auditors & Viewers (Levels 2 & 3 - Read Only)**:
  - Can inspect mobile cards in `/ledger` and review physical tally readings without modification permissions.

---

## 3. Detailed Component Architecture

To respect the `<250 LOC` Strangler invariant, responsibilities are decomposed into modular subcomponents:

```
src/
├── components/
│   ├── tally/
│   │   ├── TallyMeasurementPad.tsx       # (< 200 LOC) Hybrid dimension inputs & +1/+5/+10 steppers
│   │   └── TallyDiscrepancyCard.tsx      # (< 120 LOC) Live Surat Jalan vs Tally comparison meter
│   └── ledger/
│       ├── RecordTableMobileView.tsx     # (< 180 LOC) Mobile card feed for /ledger
│       └── RecordTable.tsx               # (< 220 LOC) Mounts mobile view and view switcher
app/
└── tally/
    └── page.tsx                          # (< 200 LOC) Fullscreen mobile tally workstation
```

### 3.1 `src/components/tally/TallyMeasurementPad.tsx`
- **Purpose**: Field keypad for rapid timber measurement.
- **Supported Modes**:
  1. **Mode Sawn (Balok / Papan)**:
     - Inputs: `Tebal (cm)`, `Lebar (cm)`, `Panjang (cm)`, `Batang`.
     - Formula:
       $$\text{Volume } (m^3) = \frac{T \times L \times P \times \text{Batang}}{1,000,000}$$
  2. **Mode Round Log (Kayu Bulat / 检尺原木)**:
     - Inputs: `Diameter (cm)` (or average of ends $(D_1 + D_2) / 2$), `Panjang (m)`, `Batang`.
     - Standard Indonesian Timber / Brereton Formula:
       $$\text{Volume } (m^3) = \frac{0.7854 \times D^2 \times L \times \text{Batang}}{10,000}$$
- **Ergonomics**:
  - Touch-friendly increment buttons: `+1`, `+5`, `+10`, and `-1`.
  - Common preset buttons for rapid sizing:
    - Sawn: `20×25×400`, `15×20×400`, `12×15×300`.
    - Round: `D: 30cm L: 4m`, `D: 40cm L: 4m`, `D: 50cm L: 4m`.

### 3.2 `src/components/tally/TallyDiscrepancyCard.tsx`
- **Purpose**: Real-time volumetric and piece count difference evaluation.
- **Logic**:
  - $\Delta V = V_{\text{tally}} - V_{\text{delivered}}$
  - $\Delta B = B_{\text{tally}} - B_{\text{delivered}}$
- **Visual Alert Thresholds**:
  - `Cocok / 匹配` (Green): $|\Delta V| \le 0.05\,m^3$.
  - `Surplus / 超出` (Blue): $\Delta V > 0.05\,m^3$ (physical wood exceeds delivery slip).
  - `Penyusutan / 亏损` (Red): $\Delta V < -0.05\,m^3$ (missing logs or volumetric shrinkage).

### 3.3 `app/tally/page.tsx`
- **Purpose**: Dedicated route for the mobile field workstation.
- **Workflow**:
  1. Top Bar: App branding (`TG Tally • 检尺`), Network Status indicator (`Online` / `Offline Ready`), Yard Badge (`TPK-Timur`).
  2. Section 1: Truck & Supplier info (Truck Plate Number, Supplier combobox, Driver, Surat Jalan Document Number, Delivered Volume & Pieces).
  3. Section 2: Storage Yard & Kavling selector (embeds `YardSelect` and `KavlingSelect` with Option 1.A top-down cascade and Option 2.A soft capacity warnings).
  4. Section 3: Embeds `TallyMeasurementPad` and `TallyDiscrepancyCard`.
  5. Sticky Footer: Direct "Simpan & Sinkron Manifest" button.
- **Persistence**:
  - Immediately writes to `defaultStorage` (`IndexedDbAdapter`) for instant local durability.
  - Automatically dispatches `POST /api/records` in the background with `ManifestFormInput`.

### 3.4 `src/components/ledger/RecordTableMobileView.tsx`
- **Purpose**: Mobile card presentation for the ledger.
- **Props**:
  ```ts
  export interface RecordTableMobileViewProps {
    records: WoodReceivingRecord[];
    canWrite: boolean;
    onEdit: (record: WoodReceivingRecord) => void;
    onDelete: (id: string) => void;
    onPrint?: (record: WoodReceivingRecord) => void;
  }
  ```
- **Card Elements**:
  - Top: Truck Plate Number, Receipt Date, Payment Status badge (`PAID`, `PARTIAL`, `UNPAID`).
  - Middle: Supplier Name, Wood Species, Storage Yard & Kavling pill.
  - Bottom Metrics: Delivered volume vs Physical Tally volume, Net Payable.
  - Action row: `Cetak` (Printer), `Edit`, `Hapus` (guarded by `canWrite`).

---

## 4. Mathematical & Calculation Specifications

New pure calculation functions in `src/utils/timber-calc.ts`:

```ts
/**
 * Calculates cubic meters for round logs (kayu bulat) using standard cylindrical formula:
 * Volume (m³) = 0.7854 * (diameterCm)^2 * (lengthM) / 10,000 * pieces
 *
 * @param diameterCm - Average log diameter in centimeters
 * @param lengthM - Log length in meters
 * @param pieces - Quantity of logs
 */
export function calculateRoundLogVolumeM3(
  diameterCm: number,
  lengthM: number,
  pieces: number = 1
): number {
  if (diameterCm < 0 || lengthM < 0 || pieces < 0) {
    throw new RangeError('Dimensions and pieces cannot be negative');
  }
  if (diameterCm === 0 || lengthM === 0 || pieces === 0) {
    return 0;
  }
  const rawVolume = (0.7854 * Math.pow(diameterCm, 2) * lengthM * pieces) / 10000;
  return Number(rawVolume.toFixed(4));
}
```

---

## 5. Security, RBAC & Architectural Invariants

1. **Role-Based Access Control**:
   - Level 1 (Owner / Admin): Full write access (`canWrite = true`), can submit tally manifests and delete records.
   - Level 2 & 3 (Supervisor / Viewer): Read-only view. The submit button in `/tally` is replaced with an informational notice, and edit/delete triggers are hidden in `RecordTableMobileView`.
2. **Strangler Pattern Compliance**:
   - `RecordTable.tsx` is currently 178 LOC. Adding the mobile view switcher will keep it at ~210 LOC (< 250 LOC).
   - All newly created files (`page.tsx`, `TallyMeasurementPad.tsx`, `TallyDiscrepancyCard.tsx`, `RecordTableMobileView.tsx`) must strictly remain under 200 LOC.
3. **SSOT Invariants**:
   - All domain interfaces must be imported from `src/types/index.ts`.
4. **Bilingual Requirement**:
   - All mobile labels, steppers, and alert messages must provide Indonesian with Chinese translation subtitles.

---

## 6. Verification & Testing Strategy

1. **Unit Tests (`test/timber-calc.test.ts`)**:
   - Test `calculateRoundLogVolumeM3` with typical log diameters (e.g., 30cm, 40cm, 50cm), lengths (4m, 6m), and piece counts.
   - Test boundary conditions (0 diameter, negative dimensions throw `RangeError`, decimal precision).
2. **Component Tests (`test/tally-mobile.test.ts`)**:
   - Test `TallyMeasurementPad` state toggling between Sawn and Round modes.
   - Test piece steppers incrementing and decrementing piece counts.
   - Test `TallyDiscrepancyCard` threshold colors (`Cocok`, `Kelebihan`, `Penyusutan`).
   - Test `RecordTableMobileView` rendering card list and respecting `canWrite` prop.
   - Test file size invariants (<250 LOC for all touched modules).
3. **Integration & Regression**:
   - Run `node --test test/tally-mobile.test.ts`.
   - Run `npx tsc --noEmit` (0 errors).
   - Run `npm test` (all 410+ tests passing, 0 failures).
   - Run `npm run build:check` (Next.js production build clean).
