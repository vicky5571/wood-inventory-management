import type { Metadata } from 'next';
import { InventoryView } from '@/src/components/inventory/InventoryView';

export const metadata: Metadata = {
  title: 'Inventaris Stok Kayu (库存) | TimberGuard',
  description: 'Live lot stock balance dashboard and kavling inventory management for TPK wood yards.',
};

export default function InventoryPage() {
  return <InventoryView />;
}
