'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  PerhutaniContract,
  ContractSortimentItem,
  ContractReceipt,
  ContractFormInput,
  ContractReceiptFormInput,
  ContractWithDetails,
  WoodReceivingRecord,
} from '../types/index.ts';
import { defaultStorage } from '../persistence/storage.ts';
import { toast } from '../utils/toast-store.ts';
import { computeContractTotals, computeFulfillmentSummary } from '../utils/contract-calc.ts';

const C_KEY = 'wood_perhutani_contracts';
const I_KEY = 'wood_contract_sortiment_items';
const R_KEY = 'wood_contract_receipts';

let memContracts: PerhutaniContract[] | null = null;
let memItems: ContractSortimentItem[] | null = null;
let memReceipts: ContractReceipt[] | null = null;

export function useContracts(allReceivingRecords: WoodReceivingRecord[] = []) {
  const [contracts, setContracts] = useState<PerhutaniContract[]>(() => memContracts || []);
  const [items, setItems] = useState<ContractSortimentItem[]>(() => memItems || []);
  const [receipts, setReceipts] = useState<ContractReceipt[]>(() => memReceipts || []);
  const [isHydrated, setIsHydrated] = useState(() => memContracts !== null);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncCount = useRef(0);

  const syncWithServer = useCallback(async (action: () => Promise<void>) => {
    if (typeof fetch === 'undefined') return;
    syncCount.current += 1;
    setIsSyncing(true);
    try {
      await action();
    } catch {
      toast.warning('Sinkronisasi Server Gagal', 'Data tersimpan di perangkat lokal.');
    } finally {
      syncCount.current = Math.max(0, syncCount.current - 1);
      setIsSyncing(syncCount.current > 0);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (memContracts === null) {
        try {
          const [sc, si, sr] = await Promise.all([
            defaultStorage.getItem<PerhutaniContract[]>(C_KEY),
            defaultStorage.getItem<ContractSortimentItem[]>(I_KEY),
            defaultStorage.getItem<ContractReceipt[]>(R_KEY),
          ]);
          if (mounted) {
            if (Array.isArray(sc)) { memContracts = sc; setContracts(sc); }
            if (Array.isArray(si)) { memItems = si; setItems(si); }
            if (Array.isArray(sr)) { memReceipts = sr; setReceipts(sr); }
          }
        } finally {
          if (mounted) setIsHydrated(true);
        }
      }

      syncWithServer(async () => {
        const res = await fetch('/api/contracts?details=true');
        if (!res.ok) return;
        const json = await res.json();
        if (!mounted || !json?.success || !Array.isArray(json.data)) return;

        const sC: PerhutaniContract[] = [];
        const sI: ContractSortimentItem[] = [];
        const sR: ContractReceipt[] = [];
        for (const it of json.data) {
          const { items: subI = [], receipts: subR = [], ...hdr } = it;
          sC.push(hdr); sI.push(...subI); sR.push(...subR);
        }
        memContracts = sC; memItems = sI; memReceipts = sR;
        setContracts(sC); setItems(sI); setReceipts(sR);
        await Promise.all([
          defaultStorage.setItem(C_KEY, sC),
          defaultStorage.setItem(I_KEY, sI),
          defaultStorage.setItem(R_KEY, sR),
        ]);
      });
    })();
    return () => { mounted = false; };
  }, [syncWithServer]);

  const saveContract = useCallback(async (form: ContractFormInput): Promise<PerhutaniContract> => {
    const id = form.id || `CTR-PHT-${Date.now()}`;
    const totals = computeContractTotals(form.items);
    const now = new Date().toISOString();

    const header: PerhutaniContract = {
      id, tenantId: 'default-tenant', contractNumber: form.contractNumber.trim(),
      contractDate: form.contractDate, effectiveStartDate: form.effectiveStartDate,
      effectiveEndDate: form.effectiveEndDate, kphOrigin: form.kphOrigin.trim(),
      poNumber: form.poNumber?.trim() || undefined, totalContractValueIDR: totals.totalValueIDR,
      totalPurchasedVolumeM3: totals.totalVolumeM3, totalPurchasedPieces: totals.totalPieces,
      status: form.status, notes: form.notes?.trim() || undefined, createdAt: now, updatedAt: now,
    };

    const newItems: ContractSortimentItem[] = (form.items || []).map((it, idx) => ({
      id: it.id && !it.id.startsWith('temp-') ? it.id : `SORT-${id}-${idx + 1}`,
      contractId: id, tenantId: 'default-tenant', itemSequence: idx + 1,
      woodSpecies: it.woodSpecies.trim(), grade: it.grade.trim(),
      woodLengthM: it.woodLengthM ? Number(it.woodLengthM) : undefined,
      volumeM3: Number(it.volumeM3) || 0, pieces: it.pieces ? Number(it.pieces) : undefined,
      pricePerM3: Number(it.pricePerM3) || 0,
      subtotalIDR: Math.round((Number(it.volumeM3) || 0) * (Number(it.pricePerM3) || 0)),
      notes: it.notes?.trim() || undefined,
    }));

    setContracts((prev) => {
      const next = prev.some((c) => c.id === id) ? prev.map((c) => (c.id === id ? header : c)) : [header, ...prev];
      memContracts = next; defaultStorage.setItem(C_KEY, next); return next;
    });
    setItems((prev) => {
      const next = [...prev.filter((i) => i.contractId !== id), ...newItems];
      memItems = next; defaultStorage.setItem(I_KEY, next); return next;
    });

    syncWithServer(async () => {
      const res = await fetch('/api/contracts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, id }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    });
    return header;
  }, [syncWithServer]);

  const deleteContract = useCallback(async (id: string): Promise<void> => {
    setContracts((prev) => {
      const next = prev.filter((c) => c.id !== id);
      memContracts = next; defaultStorage.setItem(C_KEY, next); return next;
    });
    setItems((prev) => {
      const next = prev.filter((i) => i.contractId !== id);
      memItems = next; defaultStorage.setItem(I_KEY, next); return next;
    });
    syncWithServer(async () => {
      const res = await fetch(`/api/contracts?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    });
  }, [syncWithServer]);

  const saveReceipt = useCallback(async (form: ContractReceiptFormInput): Promise<ContractReceipt> => {
    const id = form.id || `RCPT-${Date.now()}`;
    const now = new Date().toISOString();
    const receipt: ContractReceipt = {
      id, contractId: form.contractId, tenantId: 'default-tenant',
      receiptNumber: form.receiptNumber.trim(), receiptDate: form.receiptDate,
      amountIDR: Number(form.amountIDR) || 0, coveredVolumeM3: Number(form.coveredVolumeM3) || 0,
      coveredPieces: form.coveredPieces ? Number(form.coveredPieces) : undefined,
      notes: form.notes?.trim() || undefined, createdAt: now, updatedAt: now,
    };

    setReceipts((prev) => {
      const next = prev.some((r) => r.id === id) ? prev.map((r) => (r.id === id ? receipt : r)) : [...prev, receipt];
      memReceipts = next; defaultStorage.setItem(R_KEY, next); return next;
    });
    syncWithServer(async () => {
      const res = await fetch(`/api/contracts/${encodeURIComponent(form.contractId)}/receipts`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    });
    return receipt;
  }, [syncWithServer]);

  const deleteReceipt = useCallback(async (contractId: string, receiptId: string): Promise<void> => {
    setReceipts((prev) => {
      const next = prev.filter((r) => r.id !== receiptId);
      memReceipts = next; defaultStorage.setItem(R_KEY, next); return next;
    });
    syncWithServer(async () => {
      const res = await fetch(`/api/contracts/${encodeURIComponent(contractId)}/receipts/${encodeURIComponent(receiptId)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    });
  }, [syncWithServer]);

  const getContractDetails = useCallback((contractId: string): ContractWithDetails | null => {
    const contract = contracts.find((c) => c.id === contractId);
    if (!contract) return null;
    const cItems = items.filter((i) => i.contractId === contractId);
    const cReceipts = receipts.filter((r) => r.contractId === contractId);
    const summary = computeFulfillmentSummary(contract, cItems, cReceipts, allReceivingRecords);
    return { ...contract, items: cItems, receipts: cReceipts, summary };
  }, [contracts, items, receipts, allReceivingRecords]);

  return {
    contracts, items, receipts, isSyncing, isHydrated,
    saveContract, deleteContract, saveReceipt, deleteReceipt, getContractDetails,
  };
}
