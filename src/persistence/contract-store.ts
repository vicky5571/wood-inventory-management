/**
 * src/persistence/contract-store.ts
 *
 * Unified persistence facade for Perhutani Procurement Contracts.
 * Supports Supabase primary storage with fallback to local SQLite.
 */

import { sqliteRecordStore } from './sqlite-record-store.ts';
import { ContractQueries, seedContractsIfEmpty } from './sqlite/contract-queries.ts';
import { isSupabaseConfigured } from './supabase/supabase-client.ts';
import { SupabaseContractStore } from './supabase/supabase-contract-store.ts';
import { computeContractTotals } from '../utils/contract-calc.ts';
import type {
  PerhutaniContract,
  ContractSortimentItem,
  ContractReceipt,
  ContractFormInput,
  ContractReceiptFormInput,
} from '../types/index.ts';

class ContractStore {
  private supabaseStore: SupabaseContractStore | null = null;

  private getSupabaseStore(): SupabaseContractStore {
    if (!this.supabaseStore) {
      this.supabaseStore = new SupabaseContractStore();
    }
    return this.supabaseStore;
  }

  private isSupabaseMode(): boolean {
    return isSupabaseConfigured();
  }

  private getQueries(): ContractQueries {
    const db = sqliteRecordStore.getDatabase();
    seedContractsIfEmpty(db);
    return new ContractQueries(db);
  }

  public getAll(tenantId: string = 'default-tenant'): PerhutaniContract[] | Promise<PerhutaniContract[]> {
    if (this.isSupabaseMode()) {
      return this.getSupabaseStore().getAll(tenantId).catch((err) => {
        console.warn('[ContractStore] Supabase getAll failed, falling back to SQLite:', err);
        return this.getQueries().getAll(tenantId);
      });
    }
    return this.getQueries().getAll(tenantId);
  }

  public getById(id: string): (PerhutaniContract | null) | Promise<PerhutaniContract | null> {
    if (this.isSupabaseMode()) {
      return this.getSupabaseStore().getById(id).catch((err) => {
        console.warn('[ContractStore] Supabase getById failed, falling back to SQLite:', err);
        return this.getQueries().getById(id);
      });
    }
    return this.getQueries().getById(id);
  }

  public getItems(contractId: string): ContractSortimentItem[] | Promise<ContractSortimentItem[]> {
    if (this.isSupabaseMode()) {
      return this.getSupabaseStore().getItems(contractId).catch((err) => {
        console.warn('[ContractStore] Supabase getItems failed, falling back to SQLite:', err);
        return this.getQueries().getItemsByContractId(contractId);
      });
    }
    return this.getQueries().getItemsByContractId(contractId);
  }

  public getReceipts(contractId: string): ContractReceipt[] | Promise<ContractReceipt[]> {
    if (this.isSupabaseMode()) {
      return this.getSupabaseStore().getReceipts(contractId).catch((err) => {
        console.warn('[ContractStore] Supabase getReceipts failed, falling back to SQLite:', err);
        return this.getQueries().getReceiptsByContractId(contractId);
      });
    }
    return this.getQueries().getReceiptsByContractId(contractId);
  }

  public getAllReceipts(tenantId: string = 'default-tenant'): ContractReceipt[] | Promise<ContractReceipt[]> {
    if (this.isSupabaseMode()) {
      return this.getSupabaseStore().getAllReceipts(tenantId).catch((err) => {
        console.warn('[ContractStore] Supabase getAllReceipts failed, falling back to SQLite:', err);
        return this.getQueries().getAllReceipts(tenantId);
      });
    }
    return this.getQueries().getAllReceipts(tenantId);
  }

  public saveContract(
    input: ContractFormInput,
    tenantId: string = 'default-tenant'
  ): PerhutaniContract | Promise<PerhutaniContract> {
    const id = input.id || `CTR-PHT-${Date.now()}`;
    const totals = computeContractTotals(input.items);
    const now = new Date().toISOString();

    const contract: PerhutaniContract = {
      id,
      tenantId,
      contractNumber: input.contractNumber.trim(),
      contractDate: input.contractDate,
      effectiveStartDate: input.effectiveStartDate,
      effectiveEndDate: input.effectiveEndDate,
      kphOrigin: input.kphOrigin.trim(),
      poNumber: input.poNumber?.trim() || undefined,
      totalContractValueIDR: totals.totalValueIDR,
      totalPurchasedVolumeM3: totals.totalVolumeM3,
      totalPurchasedPieces: totals.totalPieces,
      status: input.status,
      notes: input.notes?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };

    const sortimentItems: ContractSortimentItem[] = (input.items || []).map((item, idx) => ({
      id: item.id && !item.id.startsWith('temp-') ? item.id : `SORT-${id}-${idx + 1}`,
      contractId: id,
      tenantId,
      itemSequence: idx + 1,
      woodSpecies: item.woodSpecies.trim(),
      grade: item.grade.trim(),
      woodLengthM: item.woodLengthM ? Number(item.woodLengthM) : undefined,
      volumeM3: Number(item.volumeM3) || 0,
      pieces: item.pieces ? Number(item.pieces) : undefined,
      pricePerM3: Number(item.pricePerM3) || 0,
      subtotalIDR: Math.round((Number(item.volumeM3) || 0) * (Number(item.pricePerM3) || 0)),
      notes: item.notes?.trim() || undefined,
    }));

    if (this.isSupabaseMode()) {
      return this.getSupabaseStore().saveContract(contract, sortimentItems).catch((err) => {
        console.warn('[ContractStore] Supabase saveContract failed, falling back to SQLite:', err);
        return this.saveToSqlite(contract, sortimentItems, Boolean(input.id));
      });
    }

    return this.saveToSqlite(contract, sortimentItems, Boolean(input.id));
  }

  private saveToSqlite(
    contract: PerhutaniContract,
    items: ContractSortimentItem[],
    isUpdate: boolean
  ): PerhutaniContract {
    const queries = this.getQueries();
    if (isUpdate) {
      queries.updateContract(contract);
    } else {
      queries.insertContract(contract);
    }
    queries.replaceItems(contract.id, items);
    return contract;
  }

  public deleteContract(id: string): void | Promise<void> {
    if (this.isSupabaseMode()) {
      return this.getSupabaseStore().deleteContract(id).then(() => {}).catch((err) => {
        console.warn('[ContractStore] Supabase deleteContract failed, falling back to SQLite:', err);
        this.getQueries().deleteContract(id);
      });
    }
    this.getQueries().deleteContract(id);
  }

  public saveReceipt(
    input: ContractReceiptFormInput,
    tenantId: string = 'default-tenant'
  ): ContractReceipt | Promise<ContractReceipt> {
    const id = input.id || `RCPT-${Date.now()}`;
    const now = new Date().toISOString();

    const receipt: ContractReceipt = {
      id,
      contractId: input.contractId,
      tenantId,
      receiptNumber: input.receiptNumber.trim(),
      receiptDate: input.receiptDate,
      amountIDR: Number(input.amountIDR) || 0,
      coveredVolumeM3: Number(input.coveredVolumeM3) || 0,
      coveredPieces: input.coveredPieces ? Number(input.coveredPieces) : undefined,
      notes: input.notes?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };

    if (this.isSupabaseMode()) {
      return this.getSupabaseStore().saveReceipt(receipt).catch((err) => {
        console.warn('[ContractStore] Supabase saveReceipt failed, falling back to SQLite:', err);
        return this.getQueries().insertReceipt(receipt);
      });
    }

    return this.getQueries().insertReceipt(receipt);
  }

  public deleteReceipt(receiptId: string): void | Promise<void> {
    if (this.isSupabaseMode()) {
      return this.getSupabaseStore().deleteReceipt(receiptId).then(() => {}).catch((err) => {
        console.warn('[ContractStore] Supabase deleteReceipt failed, falling back to SQLite:', err);
        this.getQueries().deleteReceipt(receiptId);
      });
    }
    this.getQueries().deleteReceipt(receiptId);
  }
}

export const contractStore = new ContractStore();
