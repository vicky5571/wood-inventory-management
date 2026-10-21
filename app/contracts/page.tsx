import type { Metadata } from 'next';
import { ContractListView } from '@/src/components/contracts/ContractListView';

export const metadata: Metadata = {
  title: 'Kontrak Perhutani (合同) | TimberGuard',
  description: 'Perhutani procurement contract tracking, sortimen fulfillment, and payment kwitansi management.',
};

export default function ContractsPage() {
  return <ContractListView />;
}
