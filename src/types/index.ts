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
