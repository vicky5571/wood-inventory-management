import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STORAGE_LOCATIONS_KEY,
  loadStorageLocations,
  saveStorageLocations,
  getYards,
  getLotsForYard,
  addYard,
  addLot,
  isLotFullOrMaintenance,
  filterLots,
  filterYards,
  resetStorageLocations,
} from '../src/utils/storage-locations.ts';
import type { StorageLocationsData, StorageLot, StorageYard, StorageLotStatus } from '../src/types/index.ts';

test('Storage Locations Utility Suite', async (t) => {
  // Ensure we start with clean seed state before running tests
  t.beforeEach(() => {
    resetStorageLocations();
  });

  await t.test('initializes default seed yards and lots correctly', () => {
    const data = loadStorageLocations();
    assert.strictEqual(data.yards.length, 4);
    assert.strictEqual(data.lots.length, 8);

    const yardCodes = data.yards.map((y) => y.yardCode);
    assert.deepStrictEqual(yardCodes, ['TPK-T', 'TPK-U', 'TPK-B', 'TPK-S']);

    const yardNames = data.yards.map((y) => y.name);
    assert.deepStrictEqual(yardNames, ['TPK-Timur', 'TPK-Utara', 'TPK-Barat', 'TPK-Selatan']);

    const lotCodes = data.lots.map((l) => l.lotCode);
    assert.deepStrictEqual(lotCodes, [
      'KAV-01',
      'KAV-02',
      'KAV-03',
      'KAV-04',
      'KAV-05',
      'KAV-06',
      'KAV-07',
      'KAV-08',
    ]);
  });

  await t.test('getYards returns all storage yards', () => {
    const yards = getYards();
    assert.strictEqual(yards.length, 4);
    assert.strictEqual(yards[0].name, 'TPK-Timur');
  });

  await t.test('getLotsForYard filters lots cascadingly by ID, Name, or Code', () => {
    // By ID
    const timurById = getLotsForYard('yard-timur');
    assert.strictEqual(timurById.length, 2);
    assert.deepStrictEqual(timurById.map((l) => l.lotCode), ['KAV-01', 'KAV-02']);

    // By Name
    const utaraByName = getLotsForYard('TPK-Utara');
    assert.strictEqual(utaraByName.length, 2);
    assert.deepStrictEqual(utaraByName.map((l) => l.lotCode), ['KAV-03', 'KAV-04']);

    // By Code
    const baratByCode = getLotsForYard('TPK-B');
    assert.strictEqual(baratByCode.length, 2);
    assert.deepStrictEqual(baratByCode.map((l) => l.lotCode), ['KAV-05', 'KAV-06']);

    // Empty or unknown yard
    assert.deepStrictEqual(getLotsForYard(''), []);
    assert.deepStrictEqual(getLotsForYard('nonexistent-yard'), []);
  });

  await t.test('isLotFullOrMaintenance detects warnings correctly', () => {
    const lots = loadStorageLocations().lots;
    const activeLot = lots.find((l) => l.lotCode === 'KAV-01');
    const fullLot = lots.find((l) => l.lotCode === 'KAV-04');
    const maintLot = lots.find((l) => l.lotCode === 'KAV-06');

    // Active
    const activeRes = isLotFullOrMaintenance(activeLot);
    assert.strictEqual(activeRes.isWarning, false);
    assert.strictEqual(activeRes.message, undefined);

    // Full
    const fullRes = isLotFullOrMaintenance(fullLot);
    assert.strictEqual(fullRes.isWarning, true);
    assert.ok(fullRes.message && fullRes.message.includes('FULL'));

    // Maintenance
    const maintRes = isLotFullOrMaintenance(maintLot);
    assert.strictEqual(maintRes.isWarning, true);
    assert.ok(maintRes.message && maintRes.message.includes('MAINTENANCE'));

    // Undefined lot
    const undefRes = isLotFullOrMaintenance(undefined);
    assert.strictEqual(undefRes.isWarning, false);
  });

  await t.test('addYard dynamically adds a new yard and prevents duplicate name', () => {
    const newYard = addYard('TPK-Pusat', 'Central Log Depot');
    assert.strictEqual(newYard.name, 'TPK-Pusat');
    assert.strictEqual(newYard.description, 'Central Log Depot');
    assert.ok(newYard.id.startsWith('yard-'));
    assert.ok(newYard.yardCode.length > 0);

    const allYards = getYards();
    assert.strictEqual(allYards.length, 5);
    assert.ok(allYards.some((y) => y.name === 'TPK-Pusat'));

    // Adding same yard name returns existing yard without duplicating
    const duplicate = addYard('TPK-Pusat');
    assert.strictEqual(duplicate.id, newYard.id);
    assert.strictEqual(getYards().length, 5);
  });

  await t.test('addLot dynamically adds a new lot to an existing or auto-provisioned yard', () => {
    // Add to existing yard by ID
    const lot1 = addLot('yard-timur', 'KAV-09', 'ACTIVE');
    assert.strictEqual(lot1.lotCode, 'KAV-09');
    assert.strictEqual(lot1.yardId, 'yard-timur');
    assert.strictEqual(lot1.status, 'ACTIVE');

    const timurLots = getLotsForYard('yard-timur');
    assert.strictEqual(timurLots.length, 3);
    assert.ok(timurLots.some((l) => l.lotCode === 'KAV-09'));

    // Add to existing yard by Name
    const lot2 = addLot('TPK-Utara', 'KAV-10', 'FULL');
    assert.strictEqual(lot2.lotCode, 'KAV-10');
    assert.strictEqual(lot2.status, 'FULL');
    assert.strictEqual(lot2.yardId, 'yard-utara');

    // Add to nonexistent yard auto-provisions the yard
    const lot3 = addLot('TPK-Dermaga', 'KAV-DERMAGA-1', 'ACTIVE');
    assert.strictEqual(lot3.lotCode, 'KAV-DERMAGA-1');
    const provisionedYard = getYards().find((y) => y.name === 'TPK-Dermaga');
    assert.ok(provisionedYard);
    assert.strictEqual(lot3.yardId, provisionedYard.id);
  });

  await t.test('filterLots and filterYards perform robust substring searches', () => {
    const data = loadStorageLocations();

    // Filter lots by code
    const kav01 = filterLots(data.lots, '01');
    assert.strictEqual(kav01.length, 1);
    assert.strictEqual(kav01[0].lotCode, 'KAV-01');

    // Filter lots by status
    const fullLots = filterLots(data.lots, 'full');
    assert.strictEqual(fullLots.length, 1);
    assert.strictEqual(fullLots[0].lotCode, 'KAV-04');

    // Filter lots with empty query
    assert.strictEqual(filterLots(data.lots, '').length, data.lots.length);

    // Filter yards by name
    const barat = filterYards(data.yards, 'barat');
    assert.strictEqual(barat.length, 1);
    assert.strictEqual(barat[0].name, 'TPK-Barat');

    // Filter yards by code
    const tpkS = filterYards(data.yards, 'TPK-S');
    assert.strictEqual(tpkS.length, 1);
    assert.strictEqual(tpkS[0].yardCode, 'TPK-S');

    // Filter yards with empty query
    assert.strictEqual(filterYards(data.yards, '').length, data.yards.length);
  });

  await t.test('saveStorageLocations and resetStorageLocations persist and reset state', () => {
    const customData: StorageLocationsData = {
      yards: [
        {
          id: 'yard-custom',
          tenantId: 'default-tenant',
          yardCode: 'TPK-C',
          name: 'TPK-Custom',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      lots: [
        {
          id: 'lot-custom',
          tenantId: 'default-tenant',
          yardId: 'yard-custom',
          lotCode: 'KAV-C1',
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    };

    saveStorageLocations(customData);
    const loaded = loadStorageLocations();
    assert.strictEqual(loaded.yards.length, 1);
    assert.strictEqual(loaded.yards[0].name, 'TPK-Custom');

    // Reset restores seed data
    const reset = resetStorageLocations();
    assert.strictEqual(reset.yards.length, 4);
    assert.strictEqual(reset.lots.length, 8);
    assert.strictEqual(loadStorageLocations().yards.length, 4);
  });

  await t.test('localStorage synchronization simulation', () => {
    const mockStore: Record<string, string> = {};
    const originalWindow = (globalThis as any).window;

    (globalThis as any).window = {
      localStorage: {
        getItem: (k: string) => mockStore[k] || null,
        setItem: (k: string, v: string) => {
          mockStore[k] = v;
        },
        removeItem: (k: string) => {
          delete mockStore[k];
        },
        clear: () => {
          for (const k in mockStore) delete mockStore[k];
        },
      },
    };

    try {
      resetStorageLocations();
      assert.ok(mockStore[STORAGE_LOCATIONS_KEY], 'Should write seed to mock localStorage');

      addYard('TPK-Mock', 'Testing window.localStorage sync');
      const parsed = JSON.parse(mockStore[STORAGE_LOCATIONS_KEY]);
      assert.ok(parsed.yards.some((y: StorageYard) => y.name === 'TPK-Mock'));
    } finally {
      if (originalWindow === undefined) {
        delete (globalThis as any).window;
      } else {
        (globalThis as any).window = originalWindow;
      }
    }
  });
});
