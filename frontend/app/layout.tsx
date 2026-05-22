import type { Metadata, Viewport } from 'next';
import './globals.css';
import ServiceWorkerReset from '@/components/ServiceWorkerReset';
import ApiStatusBanner from '@/components/ApiStatusBanner';
import AppProviders from '@/components/AppProviders';
import BottomNav from '@/components/BottomNav';
import PageTransition from '@/components/PageTransition';
import AppHeader from '@/components/AppHeader';

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
          <AppHeader />

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
