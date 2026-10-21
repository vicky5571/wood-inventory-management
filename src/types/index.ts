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
  botanicalName?: string;     // e.g. "Tectona grandis"
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
 * Payment fulfillment status for timber inbound shipments.
 */
export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID';

/**
 * Operational Work Item: Timber Inbound Delivery and Gate Tally Record.
 * Directly maps to bilingual factory receiving ledgers.
 */
export interface WoodReceivingRecord {
  id: string;
  manifest_id?: string;         // Relational manifest foreign ID
  item_id?: string;             // Relational line item ID

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

  // Payment Lifecycle & AP Tracking
  paymentStatus?: PaymentStatus; // Status Pembayaran / 付款状态 (UNPAID | PARTIAL | PAID)
  invoiceNumber?: string;        // No. Faktur / Invoice / 发票号
  paymentDate?: string;          // Tanggal Bayar / 付款日期 (YYYY-MM-DD)
  paymentNotes?: string;         // Catatan Pembayaran / 付款备注

  createdAt: string;
  updatedAt: string;
}

/**
 * Multi-Tenant Scoping Entity: Tenant / Organization Workspace.
 */
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Storage Infrastructure: Log Receiving Yard (TPK).
 */
export interface StorageYard {
  id: string;
  tenantId: string;
  yardCode: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Operational status of storage lot / kavling.
 */
export type StorageLotStatus = 'ACTIVE' | 'FULL' | 'MAINTENANCE';

/**
 * Storage Infrastructure: Lot / Kavling inside a Yard.
 */
export interface StorageLot {
  id: string;
  tenantId: string;
  yardId: string;
  lotCode: string;
  status: StorageLotStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Relational join of lot with parent yard details for UI presentation.
 */
export interface StorageLotWithYard extends StorageLot {
  yardCode: string;
  yardName: string;
}

/**
 * Offline-first bundle for storage yards and lots master data.
 */
export interface StorageLocationsData {
  yards: StorageYard[];
  lots: StorageLot[];
}

/**
 * Relational Delivery Header: Inbound Timber Manifest.
 */
export interface ReceivingManifest {
  id: string;
  tenantId: string;
  manifestNumber: string;
  receiptDate: string;
  docDate?: string;
  truckPlateNumber: string;
  forestryDocNumber: string;
  receiptNumber: string;
  contractNumber: string;
  supplierId: string;
  freightRatePerM3: number;
  freightPphRate: number;
  brokerFee: number;
  paymentStatus: PaymentStatus;
  invoiceNumber?: string;
  paymentDate?: string;
  paymentNotes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Relational Delivery Line Item: Inbound Timber Tally Record.
 */
export interface ReceivingItem {
  id: string;
  manifestId: string;
  tenantId: string;
  itemSequence: number;
  speciesId: string;
  lotId?: string;
  woodLengthM: number;
  deliveredPieces: number;
  deliveredVolumeM3: number;
  tallyPieces: number;
  tallyVolumeM3: number;
  timberPricePerM3: number;
  timberPphRate: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Aggregate Manifest with Line Items, Joined Master Details, and Financial Summary.
 */
export interface ManifestWithItems extends ReceivingManifest {
  supplierName: string;
  items: Array<ReceivingItem & {
    speciesName: string;
    kavlingNumber?: string;
    storageYard?: string;
    timberGrossTotal: number;
    timberPphAmount: number;
    timberNetPayable: number;
    volumeDiscrepancyM3: number;
    pieceDiscrepancy: number;
  }>;
  summary: {
    totalDeliveredPieces: number;
    totalDeliveredVolumeM3: number;
    totalTallyPieces: number;
    totalTallyVolumeM3: number;
    totalTimberGross: number;
    totalTimberPph: number;
    totalTimberNet: number;
    freightGrossTotal: number;
    freightPphAmount: number;
    freightNetPayable: number;
    grandNetPayable: number;
  };
}

/**
 * Inbound Timber Line Item Form Input for Multi-Item Receiving Manifests.
 */
export interface ManifestItemInput {
  id: string;
  woodSpecies: string;
  woodLengthM: number;
  kavlingNumber: string;
  storageYard: string;
  deliveredPieces: number;
  deliveredVolumeM3: number;
  tallyPieces: number;
  tallyVolumeM3: number;
  timberPricePerM3: number;
  timberPphRate: number;
}

/**
 * Inbound Timber Manifest Header & Multi-Item Form Payload.
 */
export interface ManifestFormInput {
  id: string;
  receiptDate: string;
  docDate?: string;
  truckPlateNumber: string;
  forestryDocNumber: string;
  receiptNumber: string;
  contractNumber: string;
  supplierName: string;
  freightRatePerM3: number;
  freightPphAmount?: number;
  brokerFee: number;
  paymentStatus?: PaymentStatus;
  invoiceNumber?: string;
  paymentDate?: string;
  paymentNotes?: string;
  items: ManifestItemInput[];
}

/**
 * Pure Domain Calculation Output for Multi-Item Receiving Manifests.
 */
export interface ManifestCalculationOutput {
  totalDeliveredPieces: number;
  totalDeliveredVolumeM3: number;
  totalTallyPieces: number;
  totalTallyVolumeM3: number;
  volumeDiscrepancyM3: number;
  pieceDiscrepancy: number;
  totalTimberGross: number;
  totalTimberPph: number;
  totalTimberNet: number;
  freightGrossTotal: number;
  freightPphAmount: number;
  freightNetPayable: number;
  brokerFee: number;
  grandNetPayable: number;
  items: Array<ManifestItemInput & {
    timberGrossTotal: number;
    timberPphAmount: number;
    timberNetPayable: number;
    volumeDiscrepancyM3: number;
    pieceDiscrepancy: number;
  }>;
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
  paymentStatus?: PaymentStatus | 'ALL';
}

/**
 * Standard server-driven pagination metadata
 */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalCount?: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  hasPrevPage?: boolean;
}

/**
 * Generic paginated result envelope
 */
export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMeta;
  meta?: PaginationMeta;
}

/**
 * Query parameters for paginated and filtered wood receiving record queries
 */
export interface RecordQueryParams {
  page?: number;
  pageSize?: number;
  searchQuery?: string;
  species?: string;
  kavling?: string;
  yard?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  paymentStatus?: PaymentStatus | 'ALL';
  sortBy?: 'receiptDate' | 'truckPlateNumber' | 'supplierName' | 'tallyVolumeM3' | 'grandNetPayable' | 'createdAt';
  sortOrder?: 'ASC' | 'DESC' | 'asc' | 'desc';
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
  totalOutstandingPayable: number;
  unpaidRecordsCount: number;
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
 * Global Master Data: Timber Supplier / Vendor Profile
 */
export interface Supplier {
  id: string;
  code: string;               // e.g. "SPL-001"
  name: string;               // PT / CV / Koperasi name
  contactPerson?: string;     // PIC / Perwakilan
  phone?: string;             // WhatsApp / Phone
  address?: string;           // Base of operations / TPK Origin
  taxId?: string;             // NPWP
  notes?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

/**
 * Filter & Search Criteria for Supplier Directory
 */
export interface SupplierFilterCriteria {
  searchQuery?: string;
  status?: 'ALL' | 'ACTIVE' | 'INACTIVE';
}

/**
 * Supplier Profile merged with dynamic receiving ledger scorecard metrics
 */
export interface SupplierWithMetrics extends Supplier {
  supplierName: string; // Backward compatibility alias to name
  totalDeliveries: number;
  totalDeliveredVolumeM3: number;
  totalTallyVolumeM3: number;
  volumeDiscrepancyM3: number;
  discrepancyRatePercent: number;
  totalGrandNetPayable: number;
  primarySpecies: string[];
  lastDeliveryDate: string;
  ratingStatus: 'OPTIMAL' | 'ACCEPTABLE' | 'ATTENTION';
}

/**
 * Aggregated summary statistics for Supplier Directory KPIs
 */
export interface SupplierStats {
  totalVendors: number;
  optimalCount: number;
  attentionCount: number;
  totalVolumeM3: number;
  avgDiscrepancyPct?: number;
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
  | 'SETTINGS_UPDATED'
  | 'SUPPLIER_CREATED'
  | 'SUPPLIER_UPDATED'
  | 'SUPPLIER_DELETED'
  | 'SUPPLIER_RESTORED'
  | 'SALE_CREATED'
  | 'SALE_UPDATED'
  | 'SALE_DELETED'
  | 'STORAGE_UPDATED'
  | 'SPECIES_CREATED'
  | 'SPECIES_UPDATED'
  | 'CONTRACT_CREATED'
  | 'CONTRACT_UPDATED'
  | 'CONTRACT_DELETED'
  | 'CONTRACT_RESTORED'
  | 'RECEIPT_CREATED'
  | 'RECEIPT_DELETED';

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

/**
 * Confirmation dialog modal properties for destructive action safeguarding
 */
export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Printable timber receiving slip modal properties
 */
export interface PrintReceivingSlipModalProps {
  isOpen: boolean;
  record: WoodReceivingRecord | null;
  onClose: () => void;
}

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

/**
 * Sales Entry Modal component properties.
 */
export interface SalesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (sale: SalesFormInput) => Promise<void>;
  inboundRecords: WoodReceivingRecord[];
  existingSales: WoodSalesRecord[];
  customerHistory: string[];
  initialData?: WoodSalesRecord | null;
}

/**
 * Printable delivery order (Surat Jalan Keluar) modal properties.
 */
export interface PrintDeliveryOrderModalProps {
  isOpen: boolean;
  record: WoodSalesRecord | null;
  onClose: () => void;
}

/**
 * ==============================================================================
 * Perhutani Contract Tracking & Follow-up Domain Types
 * ==============================================================================
 */

export type ContractStatus = 'DRAFT' | 'ACTIVE' | 'FULFILLED' | 'EXPIRED' | 'CANCELLED';

/**
 * Perhutani Procurement Contract Header (tenant-scoped).
 * Flow: Contract -> Receipt (Kwitansi) -> SKSHHK (recorded as WoodReceivingRecord).
 */
export interface PerhutaniContract {
  id: string;
  tenantId: string;
  contractNumber: string;
  contractDate: string;
  effectiveStartDate: string;
  effectiveEndDate: string;
  kphOrigin: string;
  poNumber?: string;
  totalContractValueIDR: number;
  totalPurchasedVolumeM3: number;
  totalPurchasedPieces: number;
  status: ContractStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Contract Sortimen Line Item (1 contract -> N sortimen).
 */
export interface ContractSortimentItem {
  id: string;
  contractId: string;
  tenantId: string;
  itemSequence: number;
  woodSpecies: string;
  grade: string;
  woodLengthM?: number;
  volumeM3: number;
  pieces?: number;
  pricePerM3: number;
  subtotalIDR: number;
  notes?: string;
}

/**
 * Contract Receipt / Kwitansi Pembayaran (1 contract -> N receipts).
 */
export interface ContractReceipt {
  id: string;
  contractId: string;
  tenantId: string;
  receiptNumber: string;
  receiptDate: string;
  amountIDR: number;
  coveredVolumeM3: number;
  coveredPieces?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Live contract fulfillment metrics.
 */
export interface ContractFulfillmentSummary {
  contractId: string;
  contractNumber: string;
  purchasedVolumeM3: number;
  purchasedPieces: number;
  receivedVolumeM3: number;
  receivedPieces: number;
  remainingVolumeM3: number;
  remainingPieces: number;
  totalPaidIDR: number;
  totalContractValueIDR: number;
  outstandingIDR: number;
  fulfillmentPercent: number;
  daysUntilExpiry: number;
  isNearExpiry: boolean;
  isOverdue: boolean;
  status: ContractStatus;
}

export interface ContractWithDetails extends PerhutaniContract {
  items: ContractSortimentItem[];
  receipts: ContractReceipt[];
  summary: ContractFulfillmentSummary;
}

export interface ContractFilterCriteria {
  searchQuery?: string;
  status?: ContractStatus | 'ALL';
  nearExpiryOnly?: boolean;
  overdueOnly?: boolean;
}

export interface ContractSortimentInput {
  id: string;
  woodSpecies: string;
  grade: string;
  woodLengthM?: number;
  volumeM3: number;
  pieces?: number;
  pricePerM3: number;
  notes?: string;
}

export interface ContractFormInput {
  id?: string;
  contractNumber: string;
  contractDate: string;
  effectiveStartDate: string;
  effectiveEndDate: string;
  kphOrigin: string;
  poNumber?: string;
  status: ContractStatus;
  notes?: string;
  items: ContractSortimentInput[];
}

export interface ContractReceiptFormInput {
  id?: string;
  contractId: string;
  receiptNumber: string;
  receiptDate: string;
  amountIDR: number;
  coveredVolumeM3: number;
  coveredPieces?: number;
  notes?: string;
}


