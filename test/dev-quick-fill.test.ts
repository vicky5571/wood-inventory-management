import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getQuickReceivingDraft,
  getQuickSalesDraft,
  getQuickSupplierDraft,
} from '../src/utils/dev-quick-fill.ts';

test('Dev Quick Fill Utilities Suite', async (t) => {
  await t.test('getQuickReceivingDraft generates complete multi-item timber receiving manifest payload', () => {
    const draft = getQuickReceivingDraft(['Meranti', 'Keruing', 'Ulin']);
    assert.ok(draft.form.truckPlateNumber, 'Truck plate number should be populated');
    assert.ok(draft.form.forestryDocNumber, 'SKSHHK document number should be populated');
    assert.ok(draft.form.receiptNumber, 'Receipt number should be populated');
    assert.ok(draft.form.supplierName, 'Supplier name should be populated');
    assert.equal(draft.items.length >= 1, true, 'At least one manifest item must be generated');

    const item = draft.items[0];
    assert.ok(item.woodSpecies, 'Wood species must be set');
    assert.ok(item.deliveredPieces > 0, 'Delivered pieces must be positive');
    assert.ok(item.deliveredVolumeM3 > 0, 'Delivered volume must be positive');
    assert.ok(item.tallyPieces > 0, 'Tally pieces must be positive');
    assert.ok(item.tallyVolumeM3 > 0, 'Tally volume must be positive');
    assert.ok(item.timberPricePerM3 > 0, 'Timber price must be positive');
  });

  await t.test('getQuickSalesDraft generates valid timber sales form input', () => {
    const draft = getQuickSalesDraft(['PT Maju Mapan Furniture']);
    assert.ok(draft.saleDate, 'Sale date must be present');
    assert.ok(draft.deliveryOrderNumber, 'Delivery order number must be present');
    assert.ok(draft.truckPlateNumber, 'Truck plate number must be present');
    assert.ok(draft.customerName, 'Customer name must be present');
    assert.ok(draft.storageYard, 'Storage yard must be specified');
    assert.ok(draft.kavlingNumber, 'Kavling number must be specified');
    assert.ok(draft.woodSpecies, 'Wood species must be specified');
    assert.ok(draft.pieces > 0, 'Pieces must be positive');
    assert.ok(draft.volumeM3 > 0, 'Volume must be positive');
    assert.ok(draft.pricePerM3 > 0, 'Price per m3 must be positive');
  });

  await t.test('getQuickSupplierDraft generates valid supplier registration payload', () => {
    const draft = getQuickSupplierDraft();
    assert.ok(draft.name && draft.name.length >= 3, 'Supplier name must be >= 3 characters');
    assert.ok(draft.code, 'Supplier code must be present');
    assert.ok(draft.contactPerson, 'Contact person must be present');
    assert.ok(draft.phone, 'Phone number must be present');
    assert.ok(draft.address, 'Address must be present');
    assert.ok(draft.taxId, 'Tax ID (NPWP) must be present');
    assert.equal(draft.status, 'ACTIVE', 'Default status must be ACTIVE');
  });
});
