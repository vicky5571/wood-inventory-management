import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Penerimaan Kayu & Stok Gudang | Timber Inventory',
  description: 'Factory-standard timber receiving, physical tally inspection, and material ledger.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <main className="max-w-[1600px] mx-auto p-4 md:p-6 lg:p-8 flex flex-col gap-6">
          {children}
        </main>
      </body>
    </html>
  );
}
