import type { Metadata } from 'next';
import { PendingPricingView } from '@/src/components/pricing/PendingPricingView';

export const metadata: Metadata = {
  title: 'Pending Harga (待定价木材) | Wood Receiving System',
  description: 'Kelola dan tetapkan harga kayu tertunda untuk penerimaan material kayu.',
};

export default function PendingPricingPage() {
  return <PendingPricingView />;
}
