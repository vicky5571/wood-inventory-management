'use client';

/**
 * src/components/payment-forms/PaymentFormListView.tsx
 *
 * Coordinator view for the Weekly Payment Forms AP dashboard.
 * Enforces < 250 LOC limit by delegating UI to atomic subcomponents.
 */

import React, { useState } from 'react';
import { usePaymentForms } from '../../hooks/usePaymentForms.ts';
import { useAuth } from '../../hooks/useAuth.ts';
import { PaymentFormKpiStrip } from './PaymentFormKpiStrip.tsx';
import { PaymentFormToolbar } from './PaymentFormToolbar.tsx';
import { PaymentFormTable } from './PaymentFormTable.tsx';
import { PaymentFormEmptyState } from './PaymentFormEmptyState.tsx';
import { GenerateFormsModal } from './GenerateFormsModal.tsx';
import { PrintPaymentFormModal } from './PrintPaymentFormModal.tsx';
import type { PaymentForm, PaymentFormWithLines } from '../../types/index.ts';

export function PaymentFormListView() {
  const { user } = useAuth();
  const canWrite = (user?.roleLevel ?? 3) <= 2;

  const {
    forms,
    selectedWeek,
    setSelectedWeek,
    filterCriteria,
    setFilterCriteria,
    isLoading,
    generateWeeklyForms,
    loadFormById,
    kpis,
  } = usePaymentForms();

  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [printTargetForm, setPrintTargetForm] = useState<PaymentFormWithLines | null>(null);

  const handlePrint = async (form: PaymentForm) => {
    const fullForm = await loadFormById(form.id);
    if (fullForm) {
      setPrintTargetForm(fullForm);
    }
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-black text-gray-950 tracking-tight">
          Form Pembayaran Mingguan (木材周付款单)
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Konsolidasi AP operasional per Supplier x Jenis Kayu x Kontrak periode Sabtu s/d Jumat
        </p>
      </div>

      {/* KPI Strip */}
      <PaymentFormKpiStrip kpis={kpis} />

      {/* Filter Toolbar */}
      <PaymentFormToolbar
        selectedWeek={selectedWeek}
        onWeekChange={setSelectedWeek}
        filterCriteria={filterCriteria}
        onFilterChange={setFilterCriteria}
        onOpenGenerateModal={() => setIsGenerateOpen(true)}
        canWrite={canWrite}
      />

      {/* Main Content: Table or Empty State */}
      {isLoading ? (
        <div className="bg-white border border-gray-200/80 rounded-xl p-12 text-center text-xs text-gray-400">
          Memuat data form pembayaran...
        </div>
      ) : forms.length === 0 ? (
        <PaymentFormEmptyState
          onOpenGenerateModal={() => setIsGenerateOpen(true)}
          canWrite={canWrite}
        />
      ) : (
        <PaymentFormTable forms={forms} onPrint={handlePrint} />
      )}

      {/* Generate Modal */}
      <GenerateFormsModal
        isOpen={isGenerateOpen}
        onClose={() => setIsGenerateOpen(false)}
        onGenerate={generateWeeklyForms}
        defaultWeek={selectedWeek}
      />

      {/* Print Modal */}
      {printTargetForm && (
        <PrintPaymentFormModal
          isOpen={!!printTargetForm}
          form={printTargetForm}
          onClose={() => setPrintTargetForm(null)}
        />
      )}
    </div>
  );
}
