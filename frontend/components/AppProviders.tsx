'use client';
import { ReactNode } from 'react';
import { WalletProvider } from '@/hooks/useWallet';

export default function AppProviders({ children }: { children: ReactNode }) {
  return <WalletProvider>{children}</WalletProvider>;
}
