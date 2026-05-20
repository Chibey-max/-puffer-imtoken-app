import type { Metadata, Viewport } from 'next';
import './globals.css';
import Link from 'next/link';
import WalletConnect from '@/components/WalletConnect';
import ServiceWorkerReset from '@/components/ServiceWorkerReset';
import ApiStatusBanner from '@/components/ApiStatusBanner';
import AppProviders from '@/components/AppProviders';


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
          <header className="sticky top-0 z-50 bg-[#0a0f1a]/90 backdrop-blur border-b border-[#1a2535] px-4 py-3">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#00d4ff] flex items-center justify-center text-[#0a0f1a] font-black text-sm">P</div>
                <span className="font-bold text-white">Puffer</span>
              </Link>
              <WalletConnect />
            </div>

          </header>

          {/* Main */}
          <main className="px-4 py-6 pb-24">
            <ApiStatusBanner />
            {children}
          </main>

          {/* Bottom nav */}
          <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-[#0a0f1a]/95 backdrop-blur border-t border-[#1a2535] px-4 py-3">
            <div className="flex justify-around">
              {[
                { href: '/', label: 'Home', icon: '⌂' },
                { href: '/stake', label: 'Stake', icon: '⬆' },
                { href: '/vaults', label: 'Vaults', icon: '◈' },
                { href: '/swap', label: 'Swap', icon: '⇄' },
                { href: '/security', label: 'Security', icon: '⛨' },
                { href: '/history', label: 'History', icon: '☰' },
              ].map(({ href, label, icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex flex-col items-center gap-0.5 text-[#8892a4] hover:text-[#00d4ff] transition-colors"
                >
                  <span className="text-lg">{icon}</span>
                  <span className="text-[10px]">{label}</span>
                </Link>
              ))}
            </div>
          </nav>
        </AppProviders>
      </body>
    </html>
  );
}
