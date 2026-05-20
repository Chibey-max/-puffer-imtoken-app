'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/', label: 'Home', icon: '⌂' },
  { href: '/stake', label: 'Stake', icon: '↑' },
  { href: '/vaults', label: 'Vaults', icon: '◈' },
  { href: '/swap', label: 'Swap', icon: '⇄' },
  { href: '/security', label: 'Security', icon: '⛨' },
  { href: '/history', label: 'History', icon: '☰' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[460px] z-50 bg-[#070b14] border-t border-[#1f2b40] backdrop-blur-xl">
      <div className="px-3 pt-2 pb-[calc(0.6rem+env(safe-area-inset-bottom))]">
        <nav className="dex-card rounded-2xl px-2 py-2">
        <div className="flex justify-around">
          {ITEMS.map(({ href, label, icon }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-0.5 transition-all px-2.5 py-1 rounded-xl ${active ? 'text-[#79dfff] glass-pill' : 'text-[#8ea0bc] hover:text-[#61d9ff]'}`}
              >
                <span className={`text-base leading-none ${active ? 'scale-110' : ''}`}>{icon}</span>
                <span className="text-[10px]">{label}</span>
              </Link>
            );
          })}
        </div>
        </nav>
      </div>
    </div>
  );
}
