'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale } from '@/lib/locale';

const PRIMARY_MOBILE_ITEMS = [
  { href: '/', labelEn: 'Home', labelZh: '首页', icon: '⌂' },
  { href: '/stake', labelEn: 'Stake', labelZh: '质押', icon: '↑' },
  { href: '/vaults', labelEn: 'Vaults', labelZh: '金库', icon: '◈' },
  { href: '/swap', labelEn: 'Swap', labelZh: '兑换', icon: '⇄' },
];

const MORE_ITEMS = [
  { href: '/assistant', labelEn: 'Assistant', labelZh: '助手', icon: '✦' },
  { href: '/security', labelEn: 'Security', labelZh: '安全', icon: '⛨' },
  { href: '/tokencore', labelEn: 'TokenCore', labelZh: '核心', icon: '◉' },
  { href: '/history', labelEn: 'History', labelZh: '历史', icon: '☰' },
];

const DESKTOP_ITEMS = PRIMARY_MOBILE_ITEMS;

export default function BottomNav() {
  const pathname = usePathname();
  const tokenCoreEnabled = process.env.NEXT_PUBLIC_TOKENCORE_MODE !== 'false';
  const { t } = useLocale();
  const [openMore, setOpenMore] = useState(false);

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[460px] z-50 bg-[#070b14] border-t border-[#1f2b40] backdrop-blur-xl">
      <div className="px-3 pt-2 pb-[calc(0.6rem+env(safe-area-inset-bottom))]">
        <nav className="relative dex-card rounded-2xl px-2 py-2">
          <div className="flex justify-around items-center">
            {DESKTOP_ITEMS.map(({ href, labelEn, labelZh, icon }) => {
              const active = pathname === href || (href !== '/' && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex flex-col items-center gap-0.5 transition-all px-2 py-1 rounded-xl ${active ? 'text-[#79dfff] glass-pill' : 'text-[#8ea0bc] hover:text-[#61d9ff]'}`}
                >
                  <span className={`text-base leading-none ${active ? 'scale-110' : ''}`}>{icon}</span>
                  <span className="text-[10px]">{t(labelEn, labelZh)}</span>
                </Link>
              );
            })}

            <button
              onClick={() => setOpenMore((v) => !v)}
              className={`flex flex-col items-center gap-0.5 transition-all px-2 py-1 rounded-xl ${openMore ? 'text-[#79dfff] glass-pill' : 'text-[#8ea0bc] hover:text-[#61d9ff]'}`}
            >
              <span className="text-base leading-none">⋯</span>
              <span className="text-[10px]">{t('More', '更多')}</span>
            </button>
          </div>

          {openMore && (
            <>
              <button
                aria-label={t('Close more menu overlay', '关闭更多菜单遮罩')}
                onClick={() => setOpenMore(false)}
                className="fixed top-0 left-0 right-0 bottom-[calc(86px+env(safe-area-inset-bottom))] z-40 bg-[#020611]/75 backdrop-blur-[8px]"
              />
              <div className="absolute bottom-[calc(100%+8px)] right-2 w-40 rounded-xl p-2 space-y-1 shadow-2xl z-50 border border-[#32507a] bg-[#0b1526]/95">
                {MORE_ITEMS.filter((item) => tokenCoreEnabled || item.href !== '/tokencore').map(({ href, labelEn, labelZh, icon }) => {
                  const active = pathname === href || pathname.startsWith(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setOpenMore(false)}
                      className={`flex items-center gap-2 px-2 py-2 rounded-lg text-xs ${active ? 'text-[#79dfff] bg-[#132740]' : 'text-[#d0def0] hover:bg-[#1a2f4a]'}`}
                    >
                      <span>{icon}</span>
                      <span>{t(labelEn, labelZh)}</span>
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </nav>
      </div>
    </div>
  );
}
