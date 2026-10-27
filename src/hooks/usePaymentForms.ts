'use client';

/**
 * src/hooks/usePaymentForms.ts
 *
 * Client React hook managing Weekly Payment Forms (Lembar Tagihan) lifecycle,
 * filtering, optimistic updates, and editing workflows.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  PaymentForm,
  PaymentFormWithLines,
  PaymentFormStatus,
  PaymentFormFilterCriteria,
  PaymentFormGenerationResult,
} from '../types/index.ts';
import { getSaturdayOfWeek } from '../utils/week-window.ts';
import { toast } from '../utils/toast-store.ts';

export function usePaymentForms(initialFilter?: PaymentFormFilterCriteria) {
  const [forms, setForms] = useState<PaymentForm[]>([]);
  const [activeForm, setActiveForm] = useState<PaymentFormWithLines | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<string>(() =>
    initialFilter?.weekStartDate || getSaturdayOfWeek(new Date())
  );
  const [filterCriteria, setFilterCriteria] = useState<PaymentFormFilterCriteria>(() => ({
    weekStartDate: initialFilter?.weekStartDate,
    status: initialFilter?.status || 'ALL',
    supplierName: initialFilter?.supplierName,
    searchQuery: initialFilter?.searchQuery,
  }));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refreshForms = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedWeek) params.set('weekStartDate', selectedWeek);
      if (filterCriteria.status && filterCriteria.status !== 'ALL') params.set('status', filterCriteria.status);
      if (filterCriteria.supplierName) params.set('supplierName', filterCriteria.supplierName);
      if (filterCriteria.searchQuery) params.set('searchQuery', filterCriteria.searchQuery);

      const res = await fetch(`/api/payment-forms?${params.toString()}`);
      if (!res.ok) throw new Error('Gagal memuat daftar form pembayaran');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setForms(json.data);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [selectedWeek, filterCriteria]);

  useEffect(() => {
    refreshForms();
  }, [refreshForms]);

  const loadFormById = useCallback(async (id: string): Promise<PaymentFormWithLines | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/payment-forms/${id}`);
      if (!res.ok) throw new Error('Form pembayaran tidak ditemukan');
      const json = await res.json();
      if (json.success && json.data) {
        setActiveForm(json.data);
        return json.data;
      }
      return null;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat form';
      setError(msg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const generateWeeklyForms = useCallback(
    async (weekStart: string): Promise<PaymentFormGenerationResult> => {
      setIsGenerating(true);
      setError(null);
      try {
        const res = await fetch('/api/payment-forms/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ weekStartDate: weekStart }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Gagal generate form pembayaran');
        }

        const result: PaymentFormGenerationResult = json.data;
        setSelectedWeek(weekStart);
        await refreshForms();

        const toastMsg = `${result.createdCount} form baru, ${result.updatedCount} diperbarui${
          result.skippedCount > 0 ? `, ${result.skippedCount} dilewati` : ''
        }`;
        toast.success('Generate Form Pembayaran Selesai (付款单生成成功)', toastMsg);

        return result;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Gagal generate form';
        setError(msg);
        toast.error('Gagal Generate Form', msg);
        throw err;
      } finally {
        setIsGenerating(false);
      }
    },
    [refreshForms]
  );

  const updateForm = useCallback(
    async (id: string, updates: Partial<PaymentForm>): Promise<PaymentFormWithLines> => {
      try {
        const res = await fetch(`/api/payment-forms/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Gagal menyimpan perubahan form');
        }
        const updated: PaymentFormWithLines = json.data;
        setActiveForm(updated);
        await refreshForms();
        toast.success('Perubahan Disimpan (已保存)', 'Rincian form berhasil diperbarui');
        return updated;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Gagal menyimpan form';
        toast.error('Gagal Menyimpan Form', msg);
        throw err;
      }
    },
    [refreshForms]
  );

  const updateStatus = useCallback(
    async (
      id: string,
      status: PaymentFormStatus,
      data?: { invoiceNumber?: string; paymentDate?: string; paymentMethod?: string; notes?: string; issueDate?: string }
    ): Promise<PaymentFormWithLines> => {
      const previousForms = forms;
      setForms((prev) => prev.map((f) => (f.id === id ? { ...f, status, ...data, updatedAt: new Date().toISOString() } : f)));
      if (activeForm && activeForm.id === id) {
        setActiveForm({ ...activeForm, status, ...data, updatedAt: new Date().toISOString() });
      }

      try {
        const res = await fetch(`/api/payment-forms/${id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status, ...data }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Gagal mengubah status');
        }

        const updated: PaymentFormWithLines = json.data;
        setActiveForm(updated);
        await refreshForms();

        toast.success('Status Berhasil Diperbarui (状态已更新)', `Form ${updated.preprintedNumber || updated.id} -> ${status}`);
        return updated;
      } catch (err: unknown) {
        setForms(previousForms);
        const msg = err instanceof Error ? err.message : 'Gagal mengubah status';
        toast.error('Gagal Mengubah Status', msg);
        throw err;
      }
    },
    [forms, activeForm, refreshForms]
  );

  const voidForm = useCallback(
    async (id: string, notes?: string): Promise<PaymentFormWithLines> => {
      return updateStatus(id, 'VOID', { notes });
    },
    [updateStatus]
  );

  const setPreprintedNumber = useCallback(
    async (id: string, preprintedNumber: string): Promise<PaymentFormWithLines> => {
      return updateForm(id, { preprintedNumber });
    },
    [updateForm]
  );

  const setIssueDate = useCallback(
    async (id: string, issueDate: string): Promise<PaymentFormWithLines> => {
      return updateForm(id, { issueDate });
    },
    [updateForm]
  );

  const kpis = useMemo(() => {
    let draftCount = 0;
    let issuedCount = 0;
    let paidCount = 0;
    let voidCount = 0;
    let totalOutstandingAP = 0;
    let totalVolumeM3 = 0;

    for (const f of forms) {
      if (f.status === 'DRAFT') draftCount++;
      else if (f.status === 'ISSUED') {
        issuedCount++;
        totalOutstandingAP += f.totalAmountIDR || f.totalTimberNetIDR;
      } else if (f.status === 'PAID') paidCount++;
      else if (f.status === 'VOID') voidCount++;

      if (f.status !== 'VOID') {
        totalVolumeM3 += f.totalTallyVolumeM3;
      }
    }

    return {
      totalForms: forms.length,
      draftCount,
      issuedCount,
      paidCount,
      voidCount,
      totalOutstandingAP,
      totalVolumeM3: Number(totalVolumeM3.toFixed(2)),
    };
  }, [forms]);

  return {
    forms,
    activeForm,
    selectedWeek,
    setSelectedWeek,
    filterCriteria,
    setFilterCriteria,
    isLoading,
    isGenerating,
    error,
    refreshForms,
    loadFormById,
    generateWeeklyForms,
    updateForm,
    setPreprintedNumber,
    setIssueDate,
    updateStatus,
    voidForm,
    kpis,
  };
}
