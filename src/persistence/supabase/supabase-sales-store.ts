import { supabaseFetch } from './supabase-client.ts';
import type { WoodSalesRecord, SalesFormInput, PaymentStatus } from '../../types/index.ts';

interface SupabaseSaleRow {
  id: string;
  sale_date: string;
  delivery_order_number: string;
  truck_plate_number: string;
  driver_name: string | null;
  customer_name: string;
  storage_yard: string;
  kavling_number: string;
  wood_species: string;
  pieces: number;
  volume_m3: number;
  price_per_m3: number;
  total_price: number;
  payment_status: string;
  invoice_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function mapRowToRecord(row: SupabaseSaleRow): WoodSalesRecord {
  return {
    id: row.id,
    saleDate: row.sale_date,
    deliveryOrderNumber: row.delivery_order_number,
    truckPlateNumber: row.truck_plate_number,
    driverName: row.driver_name || undefined,
    customerName: row.customer_name,
    storageYard: row.storage_yard,
    kavlingNumber: row.kavling_number,
    woodSpecies: row.wood_species,
    pieces: Number(row.pieces),
    volumeM3: Number(row.volume_m3),
    pricePerM3: Number(row.price_per_m3),
    totalPrice: Number(row.total_price),
    paymentStatus: (row.payment_status as PaymentStatus) || 'UNPAID',
    invoiceNumber: row.invoice_number || undefined,
    notes: row.notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SupabaseSalesStore {
  async getAll(): Promise<WoodSalesRecord[]> {
    const rows = await supabaseFetch<SupabaseSaleRow[]>(
      '/sales_records?select=*&order=sale_date.desc,created_at.desc'
    );
    return rows.map(mapRowToRecord);
  }

  async getById(id: string): Promise<WoodSalesRecord | null> {
    const rows = await supabaseFetch<SupabaseSaleRow[]>(
      `/sales_records?id=eq.${encodeURIComponent(id)}&select=*`
    );
    return rows.length > 0 ? mapRowToRecord(rows[0]) : null;
  }

  async save(sale: SalesFormInput): Promise<WoodSalesRecord> {
    const id = sale.id || `SLS-${Date.now()}`;
    const vol = Number(sale.volumeM3) || 0;
    const price = Number(sale.pricePerM3) || 0;
    const totalPrice = Math.round(vol * price);
    const now = new Date().toISOString();

    const rowPayload = {
      id,
      sale_date: sale.saleDate,
      delivery_order_number: sale.deliveryOrderNumber,
      truck_plate_number: sale.truckPlateNumber,
      driver_name: sale.driverName || null,
      customer_name: sale.customerName,
      storage_yard: sale.storageYard,
      kavling_number: sale.kavlingNumber,
      wood_species: sale.woodSpecies,
      pieces: Number(sale.pieces) || 0,
      volume_m3: vol,
      price_per_m3: price,
      total_price: totalPrice,
      payment_status: sale.paymentStatus || 'UNPAID',
      invoice_number: sale.invoiceNumber || null,
      notes: sale.notes || null,
      updated_at: now,
    };

    const inserted = await supabaseFetch<SupabaseSaleRow[]>(
      '/sales_records',
      {
        method: 'POST',
        prefer: 'resolution=merge-duplicates,return=representation',
        body: JSON.stringify(rowPayload),
      }
    );

    return mapRowToRecord(inserted[0]);
  }

  async delete(id: string): Promise<boolean> {
    await supabaseFetch(
      `/sales_records?id=eq.${encodeURIComponent(id)}`,
      { method: 'DELETE' }
    );
    return true;
  }
}
