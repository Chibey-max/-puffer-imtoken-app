'use client';
import { ReactNode } from 'react';
import { WalletProvider } from '@/hooks/useWallet';
import { LocaleProvider } from '@/lib/locale';
import { AppModeProvider } from '@/lib/appMode';

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <LocaleProvider>
      <AppModeProvider>
        <WalletProvider>{children}</WalletProvider>
      </AppModeProvider>
    </LocaleProvider>
  );
}
