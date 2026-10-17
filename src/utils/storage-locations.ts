/**
 * src/utils/storage-locations.ts
 *
 * Single Source of Truth (SSOT) Storage Locations Utility
 * Manages Log Yards (TPK) and Kavling Lots with offline-first persistence and SSR resilience.
 */

import type { StorageLocationsData, StorageLot, StorageLotStatus, StorageYard } from '../types/index.ts';

export const STORAGE_LOCATIONS_KEY = 'wood_storage_locations_v1';

export const SEED_STORAGE_YARDS: StorageYard[] = [
  { id: 'yard-timur', tenantId: 'default-tenant', yardCode: 'TPK-T', name: 'TPK-Timur', description: 'Log yard facing eastern logistics dock', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'yard-utara', tenantId: 'default-tenant', yardCode: 'TPK-U', name: 'TPK-Utara', description: 'Northern kiln-dry staging yard', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'yard-barat', tenantId: 'default-tenant', yardCode: 'TPK-B', name: 'TPK-Barat', description: 'Western heavy hardwood depot', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'yard-selatan', tenantId: 'default-tenant', yardCode: 'TPK-S', name: 'TPK-Selatan', description: 'Southern incoming inspection yard', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
];

export const SEED_STORAGE_LOTS: StorageLot[] = [
  { id: 'lot-kav-01', tenantId: 'default-tenant', yardId: 'yard-timur', lotCode: 'KAV-01', status: 'ACTIVE', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'lot-kav-02', tenantId: 'default-tenant', yardId: 'yard-timur', lotCode: 'KAV-02', status: 'ACTIVE', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'lot-kav-03', tenantId: 'default-tenant', yardId: 'yard-utara', lotCode: 'KAV-03', status: 'ACTIVE', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'lot-kav-04', tenantId: 'default-tenant', yardId: 'yard-utara', lotCode: 'KAV-04', status: 'FULL', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'lot-kav-05', tenantId: 'default-tenant', yardId: 'yard-barat', lotCode: 'KAV-05', status: 'ACTIVE', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'lot-kav-06', tenantId: 'default-tenant', yardId: 'yard-barat', lotCode: 'KAV-06', status: 'MAINTENANCE', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'lot-kav-07', tenantId: 'default-tenant', yardId: 'yard-selatan', lotCode: 'KAV-07', status: 'ACTIVE', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'lot-kav-08', tenantId: 'default-tenant', yardId: 'yard-selatan', lotCode: 'KAV-08', status: 'ACTIVE', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
];

function getInitialSeedData(): StorageLocationsData {
  return {
    yards: JSON.parse(JSON.stringify(SEED_STORAGE_YARDS)),
    lots: JSON.parse(JSON.stringify(SEED_STORAGE_LOTS)),
  };
}

let memoryState: StorageLocationsData | null = null;

function isLocalStorageAvailable(): boolean {
  try {
    return (
      typeof window !== 'undefined' &&
      typeof window.localStorage !== 'undefined' &&
      window.localStorage !== null
    );
  } catch {
    return false;
  }
}

export function loadStorageLocations(): StorageLocationsData {
  if (isLocalStorageAvailable()) {
    try {
      const raw = window.localStorage.getItem(STORAGE_LOCATIONS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.yards) && Array.isArray(parsed.lots)) {
          memoryState = parsed;
          return parsed;
        }
      }
    } catch {
      // Fallback to in-memory store on storage access exception
    }
  }

  if (!memoryState) {
    memoryState = getInitialSeedData();
    if (isLocalStorageAvailable()) {
      try {
        window.localStorage.setItem(STORAGE_LOCATIONS_KEY, JSON.stringify(memoryState));
      } catch {
        // Ignore storage write error
      }
    }
  }
  return memoryState;
}

export function saveStorageLocations(data: StorageLocationsData): void {
  memoryState = data;
  if (isLocalStorageAvailable()) {
    try {
      window.localStorage.setItem(STORAGE_LOCATIONS_KEY, JSON.stringify(data));
    } catch {
      // Ignore storage write error
    }
  }
}

export function resetStorageLocations(): StorageLocationsData {
  const seed = getInitialSeedData();
  saveStorageLocations(seed);
  return seed;
}

export function getYards(): StorageYard[] {
  return loadStorageLocations().yards;
}

export function getLotsForYard(yardNameOrId: string): StorageLot[] {
  if (!yardNameOrId || !yardNameOrId.trim()) return [];
  const normalized = yardNameOrId.trim().toLowerCase();
  const data = loadStorageLocations();
  const matchedYard = data.yards.find(
    (y) =>
      y.id.toLowerCase() === normalized ||
      y.name.toLowerCase() === normalized ||
      y.yardCode.toLowerCase() === normalized
  );
  const targetYardId = matchedYard ? matchedYard.id : yardNameOrId.trim();
  return data.lots.filter((lot) => lot.yardId === targetYardId);
}

export function isLotFullOrMaintenance(lot?: StorageLot): { isWarning: boolean; message?: string } {
  if (!lot) return { isWarning: false };
  if (lot.status === 'FULL') {
    return {
      isWarning: true,
      message: `Kavling ${lot.lotCode} is marked as FULL. Verify capacity before allocation.`,
    };
  }
  if (lot.status === 'MAINTENANCE') {
    return {
      isWarning: true,
      message: `Kavling ${lot.lotCode} is currently under MAINTENANCE.`,
    };
  }
  return { isWarning: false };
}

function deriveYardCode(name: string, existingYards: StorageYard[]): string {
  const clean = name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const prefix = clean.startsWith('TPK')
    ? clean.slice(0, 5)
    : `TPK-${clean.slice(0, 3) || 'LOC'}`;
  let code = prefix;
  let counter = 1;
  while (existingYards.some((y) => y.yardCode.toLowerCase() === code.toLowerCase())) {
    code = `${prefix}-${counter++}`;
  }
  return code;
}

export function addYard(name: string, description?: string): StorageYard {
  const trimmedName = name.trim();
  const data = loadStorageLocations();
  const existing = data.yards.find((y) => y.name.toLowerCase() === trimmedName.toLowerCase());
  if (existing) {
    if (description && !existing.description) {
      existing.description = description.trim();
      existing.updatedAt = new Date().toISOString();
      saveStorageLocations(data);
    }
    return existing;
  }

  const now = new Date().toISOString();
  const newYard: StorageYard = {
    id: `yard-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    tenantId: 'default-tenant',
    yardCode: deriveYardCode(trimmedName, data.yards),
    name: trimmedName,
    description: description?.trim(),
    createdAt: now,
    updatedAt: now,
  };

  data.yards.push(newYard);
  saveStorageLocations(data);
  return newYard;
}

export function addLot(
  yardNameOrId: string,
  lotCode: string,
  status: StorageLotStatus = 'ACTIVE'
): StorageLot {
  const data = loadStorageLocations();
  const normalizedYard = yardNameOrId.trim().toLowerCase();
  let yard = data.yards.find(
    (y) =>
      y.id.toLowerCase() === normalizedYard ||
      y.name.toLowerCase() === normalizedYard ||
      y.yardCode.toLowerCase() === normalizedYard
  );

  if (!yard) {
    yard = addYard(yardNameOrId);
  }

  const trimmedLot = lotCode.trim();
  const existingLot = data.lots.find(
    (l) => l.yardId === yard!.id && l.lotCode.toLowerCase() === trimmedLot.toLowerCase()
  );
  if (existingLot) {
    return existingLot;
  }

  const now = new Date().toISOString();
  const newLot: StorageLot = {
    id: `lot-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    tenantId: yard.tenantId || 'default-tenant',
    yardId: yard.id,
    lotCode: trimmedLot,
    status,
    createdAt: now,
    updatedAt: now,
  };

  data.lots.push(newLot);
  saveStorageLocations(data);
  return newLot;
}

export function filterLots(lots: StorageLot[], query: string): StorageLot[] {
  if (!query || !query.trim()) return lots;
  const q = query.trim().toLowerCase();
  return lots.filter(
    (lot) => lot.lotCode.toLowerCase().includes(q) || lot.status.toLowerCase().includes(q)
  );
}

export function filterYards(yards: StorageYard[], query: string): StorageYard[] {
  if (!query || !query.trim()) return yards;
  const q = query.trim().toLowerCase();
  return yards.filter(
    (yard) =>
      yard.name.toLowerCase().includes(q) ||
      yard.yardCode.toLowerCase().includes(q) ||
      (yard.description && yard.description.toLowerCase().includes(q))
  );
}
