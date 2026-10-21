import React from 'react';
import { PaymentFormListView } from '@/src/components/payment-forms/PaymentFormListView';

export const metadata = {
  title: 'Form Pembayaran Mingguan | TimberGuard',
  description: 'Konsolidasi AP operasional per Supplier x Jenis Kayu x Kontrak periode Sabtu-Jumat',
};

export default function PaymentFormsPage() {
  return <PaymentFormListView />;
}
