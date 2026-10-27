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
  contractId?: string;           // Optional FK to PerhutaniContract.id
  supplierName: string;          // Nama Pemilik Hasil Hutan / 供应商

  // Wood Specifications & Yard Location
  woodSpecies: string;           // Jenis Kayu / 树种 (e.g. Teak, Merbau, Mahoni, Sengon)
  speciesId?: string;            // Optional FK to WoodSpecies.id
  woodLengthM: number;           // Panjang Kayu (in meters)
  kavlingNumber: string;         // Nomer Kav / 进厂批号 (Yard Lot / Stack ID)
  storageYard: string;           // TPK / 木堆场地

  // Quantities & Measurements (Delivered vs Tally)
  deliveredPieces: number;       // Jumlah Batang / 送货根数
  deliveredVolumeM3: number;     // Volume Delivery / 送货立方 (m³)
  tallyPieces: number;           // Batang Tally / 检尺根数
  tallyVolumeM3: number;         // Volume Tally / 检尺立方 (m³)

  // Financials — Timber Material (Pembayaran Kayu)
  timberPricePerM3: number | null;      // Harga / m³ (null = PENDING)
  timberGrossTotal: number | null;      // Total Harga = tallyVolumeM3 * timberPricePerM3 (null when unpriced)
  timberPphRate: number;                // PPh rate % (e.g. 0.5% or 1.5%)
  timberPphAmount: number | null;       // PPh Tax Amount
  timberNetPayable: number | null;      // Net Timber = timberGrossTotal - timberPphAmount

  // Financials — Freight / Logistics (Pembayaran Ongkos Kirim)
  freightRatePerM3: number;      // Ongkir / m³
  freightGrossTotal: number;     // Total Ongkir = tallyVolumeM3 * freightRatePerM3
  freightPphAmount: number;      // PPh Tax Ongkir (PPh 23)
  freightNetPayable: number;     // Net Ongkir = freightGrossTotal - freightPphAmount

  // Broker & Overall Summary
  brokerId?: string;             // Optional FK to Broker.id
  brokerFee: number;             // Broker fee
  grandNetPayable: number | null;       // timberNetPayable + freightNetPayable + brokerFee (null when timber unpriced)

  // Payment Lifecycle & AP Tracking
  paymentStatus?: PaymentStatus; // Status Pembayaran / 付款状态 (UNPAID | PARTIAL | PAID)
  paymentFormId?: string;        // FK to PaymentForm (Form Pembayaran Mingguan)
  invoiceNumber?: string;        // No. Faktur / Invoice / 发票号
  paymentDate?: string;          // Tanggal Bayar / 付款日期 (YYYY-MM-DD)
  paymentNotes?: string;         // Catatan Pembayaran / 付款备注

  // Report Period linkage (set during period close)
  reportPeriodId?: string;       // FK to ReportPeriod.id
  priceEntryId?: string;         // FK to TimberPriceEntry.id used at close
  isLocked?: boolean;            // true after period close — prevents manual price edit

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
  contractId?: string;
  supplierId: string;
  brokerId?: string;
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
  timberPricePerM3: number | null;
  timberPphRate: number;
  paymentFormId?: string;        // FK to PaymentForm for multi-item manifests
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
    timberGrossTotal: number | null;
    timberPphAmount: number | null;
    timberNetPayable: number | null;
    volumeDiscrepancyM3: number;
    pieceDiscrepancy: number;
  }>;
  summary: {
    totalDeliveredPieces: number;
    totalDeliveredVolumeM3: number;
    totalTallyPieces: number;
    totalTallyVolumeM3: number;
    totalTimberGross: number | null;
    totalTimberPph: number | null;
    totalTimberNet: number | null;
    freightGrossTotal: number;
    freightPphAmount: number;
    freightNetPayable: number;
    grandNetPayable: number | null;
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
  timberPricePerM3?: number | null;
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
  contractId?: string;
  supplierName: string;
  brokerId?: string;
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
  totalTimberGross: number | null;
  totalTimberPph: number | null;
  totalTimberNet: number | null;
  freightGrossTotal: number;
  freightPphAmount: number;
  freightNetPayable: number;
  brokerFee: number;
  grandNetPayable: number | null;
  items: Array<ManifestItemInput & {
    timberGrossTotal: number | null;
    timberPphAmount: number | null;
    timberNetPayable: number | null;
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
  recordsWithAlarmCount: number;
  speciesVolumeBreakdown: Record<string, number>;
  pendingPricingCount: number;
  pendingPricingVolumeM3: number;
  pendingPricingValueExposureIDR: number;
}

/**
 * Financial calculation result for timber material or freight payments.
 */
export interface PaymentCalculationResult {
  gross: number | null;
  pphAmount: number | null;
  netPayable: number | null;
}

/**
 * Raw input parameters required to compute financial and discrepancy metrics for a receiving record.
 */
export interface RecordCalculationInput {
  tallyVolumeM3: number;
  deliveredVolumeM3: number;
  tallyPieces: number;
  deliveredPieces: number;
  timberPricePerM3?: number | null;
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
  timberGrossTotal: number | null;
  timberPphAmount: number | null;
  timberNetPayable: number | null;
  freightGrossTotal: number;
  freightNetPayable: number;
  grandNetPayable: number | null;
}

export type UserRoleLevel = 1 | 2 | 3;

export interface UserPermissions {
  tallyCreate?: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  roleLevel: UserRoleLevel;
  title: string;
  permissions?: UserPermissions;
}

export type AuthFailureReason =
  | 'NO_TOKEN'
  | 'TOKEN_MALFORMED'
  | 'TOKEN_INVALID'
  | 'TOKEN_EXPIRED'
  | 'USER_NOT_FOUND'
  | 'USER_INACTIVE';

export interface AuthResult {
  user: AuthUser | null;
  reason?: AuthFailureReason;
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
  reason?: AuthFailureReason;
}

export interface ManagedUser extends AuthUser {
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserPayload {
  email: string;
  name: string;
  title: string;
  roleLevel: UserRoleLevel;
  password: string;
  permissions?: UserPermissions;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  title?: string;
  roleLevel?: UserRoleLevel;
  permissions?: UserPermissions;
}

export interface ResetPasswordPayload {
  newPassword: string;
}

export interface DeactivateUserPayload {
  reason?: string;
}

export interface ReactivateUserPayload {
  reason?: string;
}

export interface UsersApiResponse {
  success: boolean;
  data?: ManagedUser[];
  error?: string;
}

export interface UserApiResponse {
  success: boolean;
  data?: ManagedUser;
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
 * Global Master Data: Broker / Perantara Profile.
 * Third-party commission-based intermediary (no wood ownership).
 */
export interface Broker {
  id: string;
  tenantId?: string;
  code: string;                       // e.g. "BRK-001"
  name: string;                       // Nama broker (person or entity)
  contactPerson?: string;
  phone?: string;                     // WhatsApp / Phone
  address?: string;
  taxId?: string;                     // NPWP (optional)
  defaultCommissionPerM3?: number;    // Hint for form prefill; actual stored per-record
  notes?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export interface BrokerFilterCriteria {
  searchQuery?: string;
  status?: 'ALL' | 'ACTIVE' | 'INACTIVE';
}

export interface BrokerWithMetrics extends Broker {
  totalDeals: number;
  totalCommissionIDR: number;
  totalVolumeM3Facilitated: number;
  averageCommissionPerM3: number;
  primarySuppliers: string[];
  lastDealDate: string;
}

export interface BrokerStats {
  totalBrokers: number;
  activeCount: number;
  totalCommissionYtdIDR: number;
  totalVolumeFacilitatedYtdM3: number;
}

export interface BrokerFormInput {
  id?: string;
  code?: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  defaultCommissionPerM3?: number;
  status?: 'ACTIVE' | 'INACTIVE';
  notes?: string;
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
  | 'BROKER_CREATED'
  | 'BROKER_UPDATED'
  | 'BROKER_DELETED'
  | 'BROKER_RESTORED'
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
  | 'RECEIPT_DELETED'
  | 'RECORD_PRICED'
  | 'PAYMENT_FORM_CREATED'
  | 'PAYMENT_FORM_UPDATED'
  | 'PAYMENT_FORM_ISSUED'
  | 'PAYMENT_FORM_PAID'
  | 'PAYMENT_FORM_VOIDED'
  | 'PRODUCTION_CREATED'
  | 'PRODUCTION_UPDATED'
  | 'PRODUCTION_DELETED'
  | 'PRODUCTION_RESTORED'
  | 'SORTING_CREATED'
  | 'SORTING_UPDATED'
  | 'SORTING_DELETED'
  | 'SORTING_RESTORED'
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_ROLE_CHANGED'
  | 'USER_PERMISSION_CHANGED'
  | 'USER_DEACTIVATED'
  | 'USER_REACTIVATED'
  | 'USER_PASSWORD_CHANGED'
  | 'RECORDS_IMPORTED'
  | 'CREATE_PRICE_ENTRY'
  | 'UPDATE_PRICE_ENTRY'
  | 'DELETE_PRICE_ENTRY'
  | 'CREATE_REPORT_PERIOD'
  | 'CLOSE_REPORT_PERIOD'
  | 'REOPEN_REPORT_PERIOD';

export type PricingStatus = 'PENDING' | 'PRICED';

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

export type AuditLogger = (entry: Omit<ActivityLogEntry, 'id' | 'timestamp'>) => Promise<void>;

/**
 * Metadata schemas for user lifecycle audit log events (Spec C)
 */
export interface UserCreatedMetadata {
  targetUserId: string;
  targetEmail: string;
  targetName: string;
  initialRoleLevel: UserRoleLevel;
  initialPermissions?: UserPermissions;
}

export interface UserUpdatedMetadata {
  targetUserId: string;
  targetEmail: string;
  changedFields: Array<{
    field: 'name' | 'email' | 'title';
    before: string;
    after: string;
  }>;
}

export interface UserRoleChangedMetadata {
  targetUserId: string;
  targetEmail: string;
  before: UserRoleLevel;
  after: UserRoleLevel;
  reason?: string;
}

export interface UserPermissionChangedMetadata {
  targetUserId: string;
  targetEmail: string;
  before: UserPermissions | undefined;
  after: UserPermissions | undefined;
  changes: string[];
  reason?: string;
}

export interface UserDeactivatedMetadata {
  targetUserId: string;
  targetEmail: string;
  previousRoleLevel: UserRoleLevel;
  reason?: string;
}

export interface UserReactivatedMetadata {
  targetUserId: string;
  targetEmail: string;
  roleLevel: UserRoleLevel;
  reason?: string;
}

export interface UserPasswordChangedMetadata {
  targetUserId: string;
  targetEmail: string;
  reason?: string;
}

export type UserAuditMetadata =
  | UserCreatedMetadata
  | UserUpdatedMetadata
  | UserRoleChangedMetadata
  | UserPermissionChangedMetadata
  | UserDeactivatedMetadata
  | UserReactivatedMetadata
  | UserPasswordChangedMetadata;

/**
 * 4-level discrepancy severity classification
 */
export type DiscrepancySeverity =
  | 'MATCH'              // |diff| < epsilon
  | 'SURPLUS'            // diff > 0 (neutral, informational)
  | 'WITHIN_TOLERANCE'   // diff < 0 but within both volume and percent thresholds
  | 'ALARM';             // diff < 0 AND (|volume| > vThresh OR |pct| > pThresh)

/**
 * Result of pure discrepancy evaluation
 */
export interface DiscrepancyEvaluation {
  severity: DiscrepancySeverity;
  volumeDiscrepancyM3: number;
  volumeDiscrepancyPct: number;        // (tally - delivered) / delivered * 100
  pieceDiscrepancy: number;
  pieceDiscrepancyPct: number;
  isAlarm: boolean;
  reason?: string;                     // Tooltip / human-readable reason
}

/**
 * @deprecated Use DiscrepancySeverity instead. Kept for backward compatibility.
 */
export type DiscrepancyStatus = 'match' | 'surplus' | 'shortage';

/**
 * Global warehouse configuration and tax rate settings
 */
export interface AppSettings {
  defaultTimberPphRate: number;
  defaultFreightPphRate: number;
  defaultBrokerFee: number;
  /**
   * @deprecated Use discrepancyAlarmPercent and discrepancyAlarmVolumeM3 instead.
   */
  acceptableDiscrepancyThresholdPct?: number;
  discrepancyAlarmVolumeM3: number;
  discrepancyAlarmPercent: number;
  yardName: string;
  yardCode: string;
  companyName: string;
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
  lotId?: string;                 // Optional FK to storage_lots.id
  woodSpecies: string;            // Jenis Kayu (e.g. Meranti)
  speciesId?: string;             // Optional FK to WoodSpecies.id
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
  consumedPieces: number;
  consumedVolumeM3: number;
  transferredInPieces: number;
  transferredInVolumeM3: number;
  transferredOutPieces: number;
  transferredOutVolumeM3: number;
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
  speciesId?: string;
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

/**
 * Weekly Payment Form (Sabtu-Jumat, Grouped per Supplier x Species x Contract)
 */
export type PaymentFormStatus = 'DRAFT' | 'ISSUED' | 'PAID' | 'VOID';

export interface PaymentForm {
  id: string;
  tenantId: string;
  preprintedNumber: string;           // User-input from physical carbon book (e.g. "018532")
  issueDate: string;                  // Single date printed on form (YYYY-MM-DD)
  weekStartDate: string;              // Saturday (YYYY-MM-DD)
  weekEndDate: string;                // Friday (YYYY-MM-DD)

  // Grouping key fields
  supplierName: string;
  supplierId?: string;
  woodSpecies: string;
  speciesId?: string;
  contractNumber: string;             // Empty string for non-contract

  // Content references
  lines: PaymentFormLineItem[];
  recordIds: string[];
  itemIds: string[];                  // For multi-item manifest items

  // Snapshot totals
  totalAmountIDR: number;             // Sum of line.totalIDR (print total)
  terbilang: string;                  // Amount in words (UPPERCASE Indonesian)
  totalTallyVolumeM3: number;
  totalTallyPieces: number;
  totalTimberGrossIDR: number;
  totalTimberPphIDR: number;
  totalTimberNetIDR: number;

  // Workflow
  status: PaymentFormStatus;
  issuedAt?: string;
  paidAt?: string;
  invoiceNumber?: string;
  paymentDate?: string;
  paymentMethod?: string;
  notes?: string;

  createdAt: string;
  updatedAt: string;
}

export type LineItemUnit = 'm³' | 'batang' | 'rit' | 'lain-lain';

export interface PaymentFormLineItem {
  id: string;                         // Stable client-side ID
  paymentFormId: string;              // FK to parent PaymentForm
  itemSequence: number;               // Ordering within form

  // Physical form columns (6 data columns)
  kategori: string;                   // Category (e.g. "Pembelian Kayu", "Biaya Ongkir")
  konten: string;                     // Content (e.g. SKSHHK number + wood species)
  tujuan: string;                     // Destination / Supplier name & address
  hargaSatuanIDR: number;             // Unit price
  jumlah: number;                     // Quantity
  unit: LineItemUnit;                 // Unit
  totalIDR: number;                   // hargaSatuanIDR * jumlah

  // Optional traceability references back to source log receiving record
  sourceRecordId?: string;
  sourceItemId?: string;

  // Backward-compatibility aliases for legacy tests and consumers
  recordId?: string;
  itemId?: string;
  tallyPieces?: number;
  tallyVolumeM3?: number;
  timberPricePerM3?: number;
  timberGrossIDR?: number;
  timberPphIDR?: number;
  timberNetIDR?: number;

  notes?: string;
}

export interface PaymentFormWithLines extends PaymentForm {}

export interface PaymentFormGroup {
  key: string;
  supplierName: string;
  supplierId?: string;
  woodSpecies: string;
  contractNumber: string;
  lines: PaymentFormLineItem[];
  recordIds: string[];
  itemIds: string[];
}

export interface PaymentFormFilterCriteria {
  weekStartDate?: string;
  status?: PaymentFormStatus | 'ALL';
  supplierName?: string;
  searchQuery?: string;
}

export interface PaymentFormGenerationResult {
  createdCount: number;
  updatedCount: number;               // Existing DRAFT forms merged into
  skippedCount: number;
  skippedReasons: Array<{
    recordId: string;
    itemId?: string;
    reason: 'PENDING_PRICE' | 'ALREADY_IN_LOCKED_FORM' | 'OUT_OF_WINDOW';
    lockedFormNumber?: string;
  }>;
  formIds: string[];                  // IDs of created/updated forms
}

/**
 * ==============================================================================
 * Sawmill Production & Stock Sorting Domain Types
 * ==============================================================================
 */

export type ProductionShift = 'PAGI' | 'SIANG' | 'MALAM';

export interface SawmillProductionRecord {
  id: string;
  tenantId: string;
  productionDate: string;              // YYYY-MM-DD
  shift?: ProductionShift;

  // Input (consumed from log stock)
  sourceStorageYard: string;
  sourceKavlingNumber: string;
  sourceLotId?: string;
  inputSpecies: string;
  speciesId?: string;
  inputVolumeM3: number;
  inputPieces: number;

  // Output (produced)
  outputProduct: string;               // Free-text + autocomplete
  outputVolumeM3: number;
  outputPieces: number;

  // Derived (computed server-side for API convenience)
  yieldPercent: number;                // output/input * 100
  wasteVolumeM3: number;               // input - output

  operatorName: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockSortingRecord {
  id: string;
  tenantId: string;
  sortingDate: string;                 // YYYY-MM-DD

  species: string;
  speciesId?: string;

  sourceStorageYard: string;
  sourceKavlingNumber: string;
  sourceLotId?: string;

  targetStorageYard: string;
  targetKavlingNumber: string;
  targetLotId?: string;

  volumeM3: number;
  pieces: number;

  reason: string;                      // Free-text + autocomplete
  operatorName: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SawmillProductionFormInput {
  id?: string;
  productionDate: string;
  shift?: ProductionShift;
  sourceStorageYard: string;
  sourceKavlingNumber: string;
  inputSpecies: string;
  inputVolumeM3: number;
  inputPieces: number;
  outputProduct: string;
  outputVolumeM3: number;
  outputPieces: number;
  operatorName: string;
  notes?: string;
}

export interface StockSortingFormInput {
  id?: string;
  sortingDate: string;
  species: string;
  sourceStorageYard: string;
  sourceKavlingNumber: string;
  targetStorageYard: string;
  targetKavlingNumber: string;
  volumeM3: number;
  pieces: number;
  reason: string;
  operatorName: string;
  notes?: string;
}

/**
 * ==============================================================================
 * Ledger Export & Import Domain Types
 * ==============================================================================
 */

export type DatePreset = 'this_month' | 'last_month' | 'this_week' | 'last_week' | 'custom' | 'all';

export interface PresetDateRange {
  startDate?: string;
  endDate?: string;
}

export interface ImportRow {
  record: WoodReceivingRecord;
  rowIndex: number;
}

export interface ImportError {
  rowIndex: number;
  reason: string;
}

export interface ImportParseResult {
  valid: ImportRow[];
  duplicates: ImportRow[];
  errors: ImportError[];
  totalRows: number;
}

export interface ExportImportModalProps {
  isOpen: boolean;
  allRecords: WoodReceivingRecord[];
  onClose: () => void;
  onImportConfirm: (rows: ImportRow[]) => void;
}

// ─── Timber Price Entries ────────────────────────────────────────────────────

/**
 * A dated price entry for a wood species (optionally scoped to a supplier).
 * Used for auto-applying prices during report period close.
 */
export interface TimberPriceEntry {
  id: string;
  tenantId: string;
  speciesId: string;            // FK -> WoodSpecies.id
  woodSpecies: string;          // denormalized display name
  supplierId?: string;          // FK -> Supplier.id, ON DELETE SET NULL
  supplierName?: string;        // denormalized display name
  effectiveFrom: string;        // YYYY-MM-DD inclusive
  effectiveTo?: string;         // YYYY-MM-DD inclusive, undefined = still active
  pricePerM3: number;
  timberPphRate: number;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Report Periods ──────────────────────────────────────────────────────────

export type ReportPeriodStatus = 'OPEN' | 'CLOSED' | 'REOPENED';

/**
 * A named reporting period. Records are assigned to a period and locked
 * when the period is closed. Not bound to a fixed calendar week/month.
 */
export interface ReportPeriod {
  id: string;
  tenantId: string;
  name: string;
  status: ReportPeriodStatus;
  startDate: string;            // YYYY-MM-DD — receiptDate range start
  endDate: string;              // YYYY-MM-DD — receiptDate range end
  closedAt?: string;
  closedBy?: string;
  totalRecords?: number;
  totalVolumeM3?: number;
  totalNetPayableIDR?: number;
  priceSnapshotIds?: string[];  // TimberPriceEntry IDs used at close
  reopenedAt?: string;
  reopenedBy?: string;
  reopenReason?: string;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Result of previewing a report period close — shows which records will
 * get a price applied and which will remain PENDING.
 */
export interface ReportPeriodClosePreview {
  periodId: string;
  readyRecords: Array<{
    recordId: string;
    truckPlateNumber: string;
    woodSpecies: string;
    supplierName: string;
    tallyVolumeM3: number;
    matchedPriceEntryId: string;
    matchedPricePerM3: number;
    estimatedNetPayableIDR: number;
  }>;
  pendingRecords: Array<{
    recordId: string;
    truckPlateNumber: string;
    woodSpecies: string;
    supplierName: string;
    reason: string;
  }>;
  totalReadyVolumeM3: number;
  totalEstimatedNetIDR: number;
}
