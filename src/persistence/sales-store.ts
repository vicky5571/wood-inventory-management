/**
 * src/persistence/sales-store.ts
 *
 * Persistence bridge and manager for outbound wood sales records.
 * Supports Supabase PostgREST primary cloud persistence when configured,
 * with resilient fallback to local SQLite.
 */

import { sqliteRecordStore } from './sqlite-record-store.ts';
import { SalesQueries, seedSalesIfEmpty } from './sqlite/sales-queries.ts';
import { isSupabaseConfigured } from './supabase/supabase-client.ts';
import { SupabaseSalesStore } from './supabase/supabase-sales-store.ts';
import type { WoodSalesRecord, SalesFormInput } from '../types/index.ts';

class SalesStore {
  private supabaseStore: SupabaseSalesStore | null = null;

  private getSupabaseStore(): SupabaseSalesStore {
    if (!this.supabaseStore) {
      this.supabaseStore = new SupabaseSalesStore();
    }
    return this.supabaseStore;
  }

  private isSupabaseMode(): boolean {
    return isSupabaseConfigured();
  }

  private getQueries(): SalesQueries {
    return new SalesQueries(sqliteRecordStore.getDatabase());
  }

  public getAll(): WoodSalesRecord[] | Promise<WoodSalesRecord[]> {
    if (this.isSupabaseMode()) {
      return this.getSupabaseStore().getAll().catch((err) => {
        console.warn('[SalesStore] Supabase getAll failed, falling back to SQLite:', err);
        return this.getQueries().getAll();
      });
    }
    return this.getQueries().getAll();
  }

  public getById(id: string): (WoodSalesRecord | null) | Promise<WoodSalesRecord | null> {
    if (this.isSupabaseMode()) {
      return this.getSupabaseStore().getById(id).catch((err) => {
        console.warn('[SalesStore] Supabase getById failed, falling back to SQLite:', err);
        return this.getQueries().getById(id);
      });
    }
    return this.getQueries().getById(id);
  }

  public save(sale: SalesFormInput): WoodSalesRecord | Promise<WoodSalesRecord> {
    if (this.isSupabaseMode()) {
      return this.getSupabaseStore().save(sale).catch((err) => {
        console.warn('[SalesStore] Supabase save failed, falling back to SQLite:', err);
        return this.saveToSqlite(sale);
      });
    }
    return this.saveToSqlite(sale);
  }

  private saveToSqlite(sale: SalesFormInput): WoodSalesRecord {
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

  public delete(id: string): void | Promise<void> {
    if (this.isSupabaseMode()) {
      return this.getSupabaseStore().delete(id).then(() => {}).catch((err) => {
        console.warn('[SalesStore] Supabase delete failed, falling back to SQLite:', err);
        this.getQueries().delete(id);
      });
    }
    this.getQueries().delete(id);
  }

  public deleteAll(): void {
    this.getQueries().deleteAll();
  }

  public seed(sales?: WoodSalesRecord[]): WoodSalesRecord[] {
    seedSalesIfEmpty(sqliteRecordStore.getDatabase(), sales);
    const result = this.getQueries().getAll();
    return result;
  }
}

export const salesStore = new SalesStore();
