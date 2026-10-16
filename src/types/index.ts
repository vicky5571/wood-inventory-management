/**
 * src/types/index.ts
 *
 * Single Source of Truth (SSOT) Domain Entity Definitions
 * Wood & Timber Inventory Management Architecture
 */

/**
 * Wood lumber grade classification according to NHLA / international grading rules.
 */
export type WoodGrade = 'FAS' | 'Select' | 'No.1 Common' | 'No.2 Common' | 'Construction' | 'Custom';

/**
 * Moisture status of lumber pieces.
 */
export type MoistureState = 'Green' | 'Air-Dried' | 'Kiln-Dried';

/**
 * Global Master Data: Wood Species definition (unscoped shared catalogue).
 */
export interface WoodSpecies {
  id: string;
  code: string;               // e.g. "TEAK", "OAK-W", "MAHOG"
  commonName: string;         // e.g. "Teak", "White Oak", "Mahogany"
  botanicalName: string;      // e.g. "Tectona grandis"
  densityKgM3: number;        // Nominal dry density in kg/m³
  jankaHardnessN?: number;    // Hardness rating in Newtons
  isHardwood: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Global Master Data: Warehouse & Storage Facility structure.
 */
export interface WarehouseLocation {
  id: string;
  tenantId: string;
  warehouseCode: string;      // e.g. "WH-01"
  zone: string;               // e.g. "Yard-A", "Dry-Shed-2"
  aisle: string;
  bay: string;
  shelf?: string;
  maxCapacityM3: number;
  currentVolumeM3: number;
}

/**
 * Operational Work Item: Core Wood / Timber Inventory Item (tenant-scoped).
 */
export interface WoodItem {
  id: string;
  tenantId: string;
  sku: string;                // e.g. "TEAK-50-200-2400-FAS"
  speciesId: string;
  batchId?: string;
  locationId: string;

  // Metric Dimensions (Stored Canonical Standard)
  thicknessMm: number;        // e.g. 50 mm (~2 in)
  widthMm: number;            // e.g. 200 mm (~8 in)
  lengthMm: number;           // e.g. 2400 mm (~8 ft)

  // Quantity and Volume
  quantityPieces: number;
  calculatedVolumeM3: number; // Volume per piece * quantity
  boardFeet: number;          // Nominal lumber calculation

  grade: WoodGrade;
  moistureContentPercent: number; // e.g. 12.5%
  moistureState: MoistureState;

  unitPrice: number;
  currency: string;
  status: 'IN_STOCK' | 'RESERVED' | 'QUARANTINE' | 'DEPLETED';

  createdAt: string;
  updatedAt: string;
}

/**
 * Operational Work Item: Inbound procurement batch / consignment.
 */
export interface InventoryBatch {
  id: string;
  tenantId: string;
  batchNumber: string;        // e.g. "BATCH-2026-10-001"
  supplierId: string;
  supplierName: string;
  receivedDate: string;
  totalPieces: number;
  totalVolumeM3: number;
  status: 'PENDING_INSPECTION' | 'ACCEPTED' | 'REJECTED' | 'PROCESSED';
  notes?: string;
}

/**
 * Audit Trail & Movement: Stock adjustment and log history.
 */
export type TransactionType = 'INBOUND_RECEIPT' | 'OUTBOUND_SALE' | 'INTERNAL_TRANSFER' | 'CYCLE_COUNT_ADJUSTMENT' | 'DEFECT_WRITE_OFF';

export interface InventoryTransaction {
  id: string;
  tenantId: string;
  itemId: string;
  batchId?: string;
  transactionType: TransactionType;
  deltaPieces: number;
  deltaVolumeM3: number;
  sourceLocationId?: string;
  targetLocationId?: string;
  operatorId: string;
  reasonNotes?: string;
  timestamp: string;
}

/**
 * Metric and Imperial Volume Calculation Result.
 */
export interface VolumeCalculationResult {
  cubicMetersPerPiece: number;
  totalCubicMeters: number;
  boardFeetPerPiece: number;
  totalBoardFeet: number;
}

/**
 * Operational Work Item: Timber Inbound Delivery and Gate Tally Record.
 * Directly maps to bilingual factory receiving ledgers.
 */
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
  woodSpecies: string;           // Jenis Kayu / 树种 (e.g. Teak, Merbau, Mahoni, Sengon)
  woodLengthM: number;           // Panjang Kayu (in meters)
  kavlingNumber: string;         // Nomer Kav / 进厂批号 (Yard Lot / Stack ID)
  storageYard: string;           // TPK / 木堆场地

  // Quantities & Measurements (Delivered vs Tally)
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

/**
 * Filter & Search Criteria for Wood Receiving Records
 */
export interface RecordFilterCriteria {
  searchQuery?: string;
  species?: string;
  kavling?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Executive Dashboard Aggregate Metrics
 */
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

/**
 * Financial calculation result for timber material or freight payments.
 */
export interface PaymentCalculationResult {
  gross: number;
  pphAmount: number;
  netPayable: number;
}

/**
 * Raw input parameters required to compute financial and discrepancy metrics for a receiving record.
 */
export interface RecordCalculationInput {
  tallyVolumeM3: number;
  deliveredVolumeM3: number;
  tallyPieces: number;
  deliveredPieces: number;
  timberPricePerM3: number;
  timberPphRate?: number;
  freightRatePerM3: number;
  freightPphAmount?: number;
  brokerFee?: number;
}

/**
 * Computed financial and discrepancy fields output for a receiving record.
 */
export interface RecordCalculationOutput {
  volumeDiscrepancyM3: number;
  pieceDiscrepancy: number;
  timberGrossTotal: number;
  timberPphAmount: number;
  timberNetPayable: number;
  freightGrossTotal: number;
  freightNetPayable: number;
  grandNetPayable: number;
}

export type UserRoleLevel = 1 | 2 | 3;

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  roleLevel: UserRoleLevel;
  title: string;
}

export interface AuthSession {
  user: AuthUser;
  expiresAt: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthApiResponse {
  success: boolean;
  user?: AuthUser;
  error?: string;
}

/**
 * Toast notification category
 */
export type ToastType = 'success' | 'info' | 'warning' | 'error';

/**
 * Action button inside a toast notification (e.g. Undo)
 */
export interface ToastAction {
  label: string;
  onClick: () => void;
}

/**
 * Global toast notification message item
 */
export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  durationMs?: number;
  action?: ToastAction;
}

/**
 * Supplier / Vendor Performance & Scorecard Summary
 */
export interface SupplierSummary {
  supplierName: string;
  totalDeliveries: number;
  totalDeliveredVolumeM3: number;
  totalTallyVolumeM3: number;
  volumeDiscrepancyM3: number;
  discrepancyRatePercent: number; // Discrepancy / Delivered * 100
  totalGrandNetPayable: number;
  primarySpecies: string[];
  lastDeliveryDate: string;
  status: 'OPTIMAL' | 'ACCEPTABLE' | 'ATTENTION';
}

/**
 * Audit trail event action categories
 */
export type ActivityActionType =
  | 'RECORD_CREATED'
  | 'RECORD_UPDATED'
  | 'RECORD_DELETED'
  | 'RECORD_RESTORED'
  | 'DEMO_RESET'
  | 'SETTINGS_UPDATED';

/**
 * Operational audit log entry item
 */
export interface ActivityLogEntry {
  id: string;
  action: ActivityActionType;
  entityId?: string;
  entitySummary: string;
  operatorName: string;
  operatorRole: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

/**
 * Global warehouse configuration and tax rate settings
 */
export interface AppSettings {
  defaultTimberPphRate: number;
  defaultFreightPphRate: number;
  defaultBrokerFee: number;
  acceptableDiscrepancyThresholdPct: number;
  yardName: string;
  yardCode: string;
}
