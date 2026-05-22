'use client';

import Link from 'next/link';
import WalletConnect from '@/components/WalletConnect';
import LanguageToggle from '@/components/LanguageToggle';
import ModeToggle from '@/components/ModeToggle';
export default function AppHeader() {
  return (
    <header className="sticky top-0 z-50 px-4 pt-3 pb-2 bg-[#070b14]/75 backdrop-blur-xl">
      <div className="dex-card px-2 sm:px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-2 sm:gap-2.5 min-w-0 shrink">
            <div className="w-8 h-8 shrink-0 rounded-xl bg-gradient-to-br from-[#36d1ff] to-[#7f9cff] flex items-center justify-center text-[#07111d] font-black text-sm">P</div>
            <div className="min-w-0 max-w-[120px] sm:max-w-none">
              <span className="font-semibold text-white leading-none block truncate">Puffer</span>
            </div>
          </Link>

          <div className="min-w-0 shrink-0">
            <WalletConnect />
          </div>
        </div>

        <div className="mt-2 pt-2 border-t border-[#1b2a40] flex items-center justify-end gap-2.5">
          <ModeToggle />
          <LanguageToggle />
        </div>
      </div>
    </header>
  );
}
