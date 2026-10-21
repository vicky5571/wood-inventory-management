import type { Metadata } from 'next';
import { PaymentFormDetailView } from '@/src/components/payment-forms/PaymentFormDetailView';

export const metadata: Metadata = {
  title: 'Rincian Form Pembayaran (付款单详情) | TimberGuard',
  description: 'Detailed view of Weekly Payment Form, lines breakdown, and financial summary.',
};

export default async function PaymentFormDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PaymentFormDetailView formId={id} />;
}
