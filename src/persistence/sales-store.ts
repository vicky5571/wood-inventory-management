/**
 * src/persistence/sales-store.ts
 *
 * Persistence bridge and manager for outbound wood sales records.
 * Integrates SQLite SalesQueries with application domain logic.
 */

import { sqliteRecordStore } from './sqlite-record-store.ts';
import { SalesQueries } from './sqlite/sales-queries.ts';
import type { WoodSalesRecord, SalesFormInput } from '../types/index.ts';

class SalesStore {
  private getQueries(): SalesQueries {
    return new SalesQueries(sqliteRecordStore.getDatabase());
  }

  public getAll(): WoodSalesRecord[] {
    return this.getQueries().getAll();
  }

  public getById(id: string): WoodSalesRecord | null {
    return this.getQueries().getById(id);
  }

  public save(sale: SalesFormInput): WoodSalesRecord {
    const queries = this.getQueries();
    const id = sale.id || `SLS-${Date.now()}`;
    const vol = Number(sale.volumeM3) || 0;
    const price = Number(sale.pricePerM3) || 0;
    const totalPrice = Math.round(vol * price);

    const existing = sale.id ? queries.getById(sale.id) : null;
    if (existing) {
      return queries.update({
        id,
        saleDate: sale.saleDate,
        deliveryOrderNumber: sale.deliveryOrderNumber,
        truckPlateNumber: sale.truckPlateNumber,
        driverName: sale.driverName,
        customerName: sale.customerName,
        storageYard: sale.storageYard,
        kavlingNumber: sale.kavlingNumber,
        woodSpecies: sale.woodSpecies,
        pieces: Number(sale.pieces) || 0,
        volumeM3: vol,
        pricePerM3: price,
        totalPrice,
        paymentStatus: sale.paymentStatus || existing.paymentStatus,
        invoiceNumber: sale.invoiceNumber,
        notes: sale.notes,
      });
    }

    return queries.insert({
      id,
      saleDate: sale.saleDate,
      deliveryOrderNumber: sale.deliveryOrderNumber,
      truckPlateNumber: sale.truckPlateNumber,
      driverName: sale.driverName,
      customerName: sale.customerName,
      storageYard: sale.storageYard,
      kavlingNumber: sale.kavlingNumber,
      woodSpecies: sale.woodSpecies,
      pieces: Number(sale.pieces) || 0,
      volumeM3: vol,
      pricePerM3: price,
      totalPrice,
      paymentStatus: sale.paymentStatus || 'UNPAID',
      invoiceNumber: sale.invoiceNumber,
      notes: sale.notes,
    });
  }

  public delete(id: string): void {
    this.getQueries().delete(id);
  }
}

export const salesStore = new SalesStore();

