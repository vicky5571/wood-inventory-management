import type { Metadata } from 'next';
import { ContractDetailView } from '@/src/components/contracts/ContractDetailView';

export const metadata: Metadata = {
  title: 'Rincian Kontrak Perhutani (合同详情) | TimberGuard',
  description: 'Detailed view of Perhutani contract fulfillment, sortimen line items, kwitansi receipts, and matched SKSHHK deliveries.',
};

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ContractDetailView contractId={id} />;
}
