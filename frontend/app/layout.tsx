import type { Metadata, Viewport } from 'next';
import './globals.css';
import Link from 'next/link';
import WalletConnect from '@/components/WalletConnect';
import ServiceWorkerReset from '@/components/ServiceWorkerReset';
import ApiStatusBanner from '@/components/ApiStatusBanner';
import AppProviders from '@/components/AppProviders';
import BottomNav from '@/components/BottomNav';
import PageTransition from '@/components/PageTransition';



export const metadata: Metadata = {
  title: 'Puffer Stake | imToken',
  description: 'Stake ETH and earn pufETH yield with Puffer Finance',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ServiceWorkerReset />
        <AppProviders>
          {/* Top nav */}
          <header className="sticky top-0 z-50 px-4 pt-3 pb-2 bg-[#070b14]/75 backdrop-blur-xl">
            <div className="dex-card px-3 py-2.5 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#36d1ff] to-[#7f9cff] flex items-center justify-center text-[#07111d] font-black text-sm">P</div>
                <div>
                  <span className="font-semibold text-white leading-none block">Puffer</span>
                  <span className="text-[10px] text-[#8ea0bc] leading-none">imToken Co-creation</span>
                </div>
              </Link>
              <WalletConnect />
            </div>
          </header>

          {/* Main */}
          <main className="px-4 py-5 pb-44">
            <PageTransition>
              <ApiStatusBanner />
              {children}
            </PageTransition>
          </main>

          <BottomNav />
        </AppProviders>
      </body>
    </html>
  );
}
