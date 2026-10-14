import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/src/components/layout/Navbar';

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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(regs) {
                  for (var i = 0; i < regs.length; i++) {
                    regs[i].unregister();
                  }
                });
              }
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <Navbar />
        <main className="max-w-[1600px] mx-auto p-4 md:p-6 lg:p-8 flex flex-col gap-6">
          {children}
        </main>
      </body>
    </html>
  );
}
