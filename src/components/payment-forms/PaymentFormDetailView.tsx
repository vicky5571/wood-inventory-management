'use client';

/**
 * src/components/payment-forms/PaymentFormDetailView.tsx
 *
 * Coordinator component for viewing, issuing, paying, voiding, and printing
 * an individual Weekly Payment Form. Kept strictly under 250 LOC.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { usePaymentForms } from '../../hooks/usePaymentForms.ts';
import { PaymentFormHeaderCard } from './PaymentFormHeaderCard.tsx';
import { PaymentFormLinesTable } from './PaymentFormLinesTable.tsx';
import { PaymentFormTotalsFooter } from './PaymentFormTotalsFooter.tsx';
import { PrintPaymentFormModal } from './PrintPaymentFormModal.tsx';
import { IssueFormModal } from './IssueFormModal.tsx';
import { MarkPaidModal } from './MarkPaidModal.tsx';
import { VoidFormModal } from './VoidFormModal.tsx';

interface PaymentFormDetailViewProps {
  formId: string;
}

export function PaymentFormDetailView({ formId }: PaymentFormDetailViewProps) {
  const { activeForm, loadFormById, updateStatus, voidForm, isLoading, error } = usePaymentForms();

  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [isIssueOpen, setIsIssueOpen] = useState(false);
  const [isMarkPaidOpen, setIsMarkPaidOpen] = useState(false);
  const [isVoidOpen, setIsVoidOpen] = useState(false);

  useEffect(() => {
    if (formId) {
      loadFormById(formId);
    }
  }, [formId, loadFormById]);

  if (isLoading && !activeForm) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin text-[#ffc908] mb-3" />
        <p className="text-xs font-medium">Memuat form pembayaran...</p>
      </div>
    );
  }

  if (error || !activeForm) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-gray-200/80 max-w-lg mx-auto my-12">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-gray-900 mb-1">Form Pembayaran Tidak Ditemukan</h3>
        <p className="text-xs text-gray-500 mb-5">
          {error || 'Form yang Anda cari tidak tersedia atau telah dihapus.'}
        </p>
        <Link
          href="/payment-forms"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar (返回列表)</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <PaymentFormHeaderCard
        form={activeForm}
        onOpenPrint={() => setIsPrintOpen(true)}
        onOpenIssue={() => setIsIssueOpen(true)}
        onOpenMarkPaid={() => setIsMarkPaidOpen(true)}
        onOpenVoid={() => setIsVoidOpen(true)}
      />

      <PaymentFormLinesTable lines={activeForm.lines || []} />

      <PaymentFormTotalsFooter form={activeForm} />

      {/* Modals */}
      <PrintPaymentFormModal
        isOpen={isPrintOpen}
        form={activeForm}
        onClose={() => setIsPrintOpen(false)}
      />

      <IssueFormModal
        isOpen={isIssueOpen}
        form={activeForm}
        onClose={() => setIsIssueOpen(false)}
        onConfirm={async (id) => {
          await updateStatus(id, 'ISSUED');
        }}
      />

      <MarkPaidModal
        isOpen={isMarkPaidOpen}
        form={activeForm}
        onClose={() => setIsMarkPaidOpen(false)}
        onConfirm={async (id, data) => {
          await updateStatus(id, 'PAID', data);
        }}
      />

      <VoidFormModal
        isOpen={isVoidOpen}
        form={activeForm}
        onClose={() => setIsVoidOpen(false)}
        onConfirm={async (id, reason) => {
          await voidForm(id, reason);
        }}
      />
    </div>
  );
}
