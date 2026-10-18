# Design Spec: Wood Sales & Outbound Stock Ledger (Phase 7)

**Document:** `docs/superpowers/specs/2026-10-18-wood-sales-outbound-design.md`  
**Date:** 2026-10-18  
**Status:** Approved for Implementation  
**Architecture:** Dedicated Outbound Sales Route (`/sales`) + Live Kavling Stock Deduction + Freeform Customer Input (No Customer Master needed) + Printable Delivery Order (Surat Jalan Keluar) + Offline-First IndexedDB Persistence & SQLite Sync.

---

## 1. Executive Summary & Problem Statement

### 1.1 Context
Currently, the wood inventory system is purely focused on **Inbound Timber Receiving & Log Yard Inspection** (`/ledger`, `/tally`). Timber shipments from suppliers are inspected, measured, and stored into designated Log Yards (TPK) and Kavling Lots (`storage_lots`).

However, sawmill and log yard operations must also deliver and sell timber to buyers (buyers, processing mills, or third-party contractors). To maintain accurate stock balance and financial bookkeeping, the business requires a streamlined **Outbound Sales & Stock Deduction** workflow.

### 1.2 Core Objectives
1. **Dedicated Outbound Sales Page (`/sales`)**: A standalone bookkeeping ledger for timber sales, keeping the inbound ledger (`/ledger`) clean and compliant with the <250 LOC Strangler invariant.
2. **Freeform Customer Input (YAGNI)**: Eliminates the complexity of a separate customer master directory. The buyer's name (`customerName`) is entered directly per transaction with autocompletion from previous transaction history.
3. **Live Kavling Stock Balance & Deduction**: When selecting a source TPK Yard and Kavling Lot, the interface evaluates current remaining stock ($V_{\text{sisa}} = \sum V_{\text{in}} - \sum V_{\text{out}}$) and warns the operator if the requested sale exceeds available stock in that lot.
4. **Printable Delivery Order (Surat Jalan Keluar / 销货出库单)**: Provides an official bilingual delivery slip for the truck driver and buyer upon dispatch.
5. **Strict Architectural Discipline**: Enforces the Strangler Pattern (<250 LOC per module), SSOT domain types (`src/types/index.ts`), native Node.js 26 ESM with zero external npm dependencies, and Level 1 (Owner) write access control.

---

## 2. User Experience & Navigation Flows

```
[ Top Navigation Bar ]
  ├── 📥 Penerimaan (Inbound): /ledger (Buku Besar Masuk)
  ├── 📱 Mode Tally: /tally (Ukur Fisik Lapangan)
  └── 📤 Penjualan (Outbound): /sales (Buku Penjualan & Pengeluaran Kayu)
        │
        ├── Summary Cards:
        │     ├── Total Volume Terjual (m³)
        │     ├── Total Batang Keluar (btg)
        │     ├── Total Omzet Penjualan (Rp)
        │     └── Total Piutang Belum Lunas (UNPAID/PARTIAL)
        │
        ├── Action Toolbar:
        │     ├── Search (No. Plat, Pembeli, No. DO)
        │     ├── Filters (Jenis Kayu, TPK, Status Pembayaran, Rentang Tanggal)
        │     └── "+ Catat Penjualan (Surat Jalan Keluar)" Button ──┐
        │                                                          │
        ├── Sales Record Table:                                    │
        │     ├── Columns: Tanggal, No. DO, No. Pol, Pembeli,      │
        │     │   TPK/Kavling, Jenis, Batang, Vol m³, Harga/m³,    │
        │     │   Total Harga, Status Bayar, Aksi                  │
        │     └── Row Actions: [ Cetak DO ] [ Edit ] [ Hapus ]     │
        │                                                          │
        └── <SalesModal>: <────────────────────────────────────────┘
              ├── Section 1: Info Angkutan & Pembeli
              │     ├── Tanggal Penjualan (YYYY-MM-DD)
              │     ├── No. Surat Jalan Keluar / DO (Auto-generated: DO-YYMMDD-XXX)
              │     ├── Nama Pembeli * (Input teks langsung dengan auto-suggest riwayat)
              │     ├── No. Plat Truk * (e.g. KB 1234 XY)
              │     └── Nama Sopir (e.g. Budi)
              │
              ├── Section 2: Sumber Stok & Lokasi
              │     ├── YardSelect (Pilih TPK)
              │     ├── KavlingSelect (Pilih Kavling)
              │     └── 📊 Live Stock Badge:
              │           "Stok Tersedia di KAV-01: 34.2500 m³ (85 btg)"
              │
              ├── Section 3: Rincian Kayu & Finansial
              │     ├── Jenis Kayu (Meranti, Bengkirai, dll.)
              │     ├── Jumlah Batang (btg)
              │     ├── Volume Terjual (m³)
              │     ├── Validasi Stok: ⚠️ Peringatan jika melebihi stok kavling
              │     ├── Harga Jual per m³ (Rp)
              │     ├── Total Nilai Penjualan (Rp) [Auto-calculated]
              │     └── Status Pembayaran (UNPAID | PARTIAL | PAID)
              │
              └── Footer: [ Batal ] [ Simpan & Potong Stok ]
```

---

## 3. Data Architecture & SSOT Schema

### 3.1 Domain Interfaces (`src/types/index.ts`)

```ts
/**
 * Operational Work Item: Wood Sales & Outbound Shipment Record.
 * Represents timber leaving the log yard / mill to a customer.
 */
export interface WoodSalesRecord {
  id: string;                     // e.g. SLS-1734567890
  saleDate: string;               // YYYY-MM-DD
  deliveryOrderNumber: string;    // No. Surat Jalan Keluar / DO
  truckPlateNumber: string;       // No. Plat Truk
  driverName?: string;            // Nama Sopir
  customerName: string;           // Nama Pembeli (freeform)
  storageYard: string;            // TPK sumber (e.g. TPK-Timur)
  kavlingNumber: string;          // Kavling sumber (e.g. KAV-01)
  woodSpecies: string;            // Jenis Kayu (e.g. Meranti)
  pieces: number;                 // Batang terjual
  volumeM3: number;               // Volume terjual (m³)
  pricePerM3: number;             // Harga jual per m³ (IDR)
  totalPrice: number;             // Total nilai jual (pricePerM3 * volumeM3)
  paymentStatus: PaymentStatus;   // UNPAID | PARTIAL | PAID
  invoiceNumber?: string;         // No. Faktur Penjualan jika ada
  notes?: string;                 // Keterangan tambahan
  createdAt: string;              // ISO timestamp
  updatedAt: string;              // ISO timestamp
}

/**
 * Payload input for creating or updating a sales record.
 */
export interface SalesFormInput {
  id?: string;
  saleDate: string;
  deliveryOrderNumber: string;
  truckPlateNumber: string;
  driverName?: string;
  customerName: string;
  storageYard: string;
  kavlingNumber: string;
  woodSpecies: string;
  pieces: number;
  volumeM3: number;
  pricePerM3: number;
  paymentStatus?: PaymentStatus;
  invoiceNumber?: string;
  notes?: string;
}

/**
 * Net stock balance available inside a specific storage yard and kavling lot.
 */
export interface LotStockBalance {
  storageYard: string;
  kavlingNumber: string;
  inboundPieces: number;
  inboundVolumeM3: number;
  outboundPieces: number;
  outboundVolumeM3: number;
  remainingPieces: number;
  remainingVolumeM3: number;
}
```

### 3.2 Relational Database Schema (`src/persistence/sqlite/migrations.ts`)

```sql
CREATE TABLE IF NOT EXISTS sales_records (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sale_date TEXT NOT NULL,
  delivery_order_number TEXT NOT NULL,
  truck_plate_number TEXT NOT NULL,
  driver_name TEXT,
  customer_name TEXT NOT NULL,
  storage_yard TEXT NOT NULL,
  kavling_number TEXT NOT NULL,
  wood_species TEXT NOT NULL,
  pieces INTEGER NOT NULL CHECK (pieces > 0),
  volume_m3 REAL NOT NULL CHECK (volume_m3 > 0),
  price_per_m3 REAL NOT NULL DEFAULT 0.0 CHECK (price_per_m3 >= 0),
  total_price REAL NOT NULL DEFAULT 0.0 CHECK (total_price >= 0),
  payment_status TEXT NOT NULL DEFAULT 'UNPAID' CHECK (payment_status IN ('UNPAID', 'PARTIAL', 'PAID')),
  invoice_number TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id, delivery_order_number)
);

CREATE INDEX IF NOT EXISTS idx_sales_date ON sales_records(tenant_id, sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales_records(tenant_id, customer_name);
CREATE INDEX IF NOT EXISTS idx_sales_lot ON sales_records(tenant_id, storage_yard, kavling_number);
```

---

## 4. Pure Business Logic & Stock Calculation Engine

New utility module: `src/utils/stock-balance.ts` (< 150 LOC):

1. **`calculateLotStockBalance(inboundRecords, salesRecords, yard, kavling)`**:
   - Computes:
     $$V_{\text{in}} = \sum \text{inbound.tallyVolumeM3}, \quad B_{\text{in}} = \sum \text{inbound.tallyPieces}$$
     $$V_{\text{out}} = \sum \text{sales.volumeM3}, \quad B_{\text{out}} = \sum \text{sales.pieces}$$
     $$V_{\text{sisa}} = \max(0, V_{\text{in}} - V_{\text{out}}), \quad B_{\text{sisa}} = \max(0, B_{\text{in}} - B_{\text{out}})$$
2. **`validateSalesStockAllowance(balance, requestedVolumeM3, requestedPieces)`**:
   - Returns `{ isAllowed: boolean; warning?: string }`.
   - If requested volume > remaining volume, emits clear warning: `"Volume melebihi sisa stok kavling (Tersedia: X.XXXX m³, Diminta: Y.YYYY m³)"`.
3. **`calculateSalesFinancials(volumeM3, pricePerM3)`**:
   - Computes `totalPrice = Math.round(volumeM3 * pricePerM3)`.

---

## 5. Component Modular Decomposition (< 250 LOC Invariant)

To guarantee that no god-files emerge, responsibilities are partitioned as follows:

```
src/
├── types/
│   └── index.ts                          # Updated with WoodSalesRecord & LotStockBalance
├── utils/
│   └── stock-balance.ts                  # (< 150 LOC) Pure stock deduction & balance calculator
├── persistence/
│   ├── sqlite/
│   │   └── sales-queries.ts              # (< 180 LOC) SQLite queries for sales_records
│   └── sales-repository.ts               # (< 160 LOC) Bridge for SQLite/Memory sales store
├── hooks/
│   └── useWoodSalesRecords.ts            # (< 200 LOC) Offline-first sales hook (IndexedDB + API)
└── components/
    └── sales/
        ├── SalesSummaryCards.tsx         # (< 120 LOC) Top KPIs (Vol Terjual, Omzet, Piutang)
        ├── SalesModal.tsx                # (< 220 LOC) Sales entry modal with live stock gauge
        ├── SalesTable.tsx                # (< 220 LOC) Desktop & mobile sales data table
        └── PrintDeliveryOrderModal.tsx   # (< 180 LOC) Printable Delivery Order (Surat Jalan Keluar)
app/
├── api/
│   └── sales/
│       └── route.ts                      # (< 160 LOC) GET/POST REST endpoint for sales records
└── sales/
    └── page.tsx                          # (< 200 LOC) Outbound sales ledger view coordinator
```

---

## 6. Security, RBAC & Offline-First Persistence

1. **Role-Based Access Control (RBAC)**:
   - Level 1 (Owner): Full CRUD on sales records (Can create, edit, delete sales).
   - Level 2 (Staff / Viewer): View-only (can inspect sales history and print Delivery Orders).
   - Level 3 (Auditor): View-only.
2. **Offline-First Synchronization**:
   - Writes immediately to native `defaultStorage` (`IndexedDbAdapter`) with key `'wood_sales_records'`.
   - Dispatches background sync to `POST /api/sales`.
   - On offline status, stores locally and syncs automatically when connection restores.
3. **Input Sanitization & Safety**:
   - Parameterized SQLite queries protection against SQL injection.
   - Trims and normalizes uppercase truck plate and uppercase delivery order number.

---

## 7. Verification & Success Criteria

1. **Automated Test Coverage**:
   - `test/stock-balance.test.ts`: Pure stock deduction math, zero handling, overdraw warnings.
   - `test/api-sales.test.ts`: REST endpoint integration for GET and POST with validation and RBAC.
   - `test/sales-components.test.ts`: SalesModal, SalesTable, PrintDeliveryOrderModal LOC limits and interactions.
   - `test/sales-page.test.ts`: Coordinator integration test verifying < 250 LOC ceiling.
2. **Quality Gates**:
   - 100% test pass rate with 0 failures (`npm test`).
   - 0 TypeScript compiler errors (`npx tsc --noEmit`).
   - 0 Next.js build errors across all 15 routes (`npm run build:check`).
