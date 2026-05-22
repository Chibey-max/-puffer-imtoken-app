'use client';

import { useAppMode } from '@/lib/appMode';
import { useLocale } from '@/lib/locale';

export default function ModeToggle() {
  const { mode, toggleMode } = useAppMode();
  const { t } = useLocale();
  const isPrototype = mode === 'prototype';

  return (
    <button
      type="button"
      onClick={toggleMode}
      className={`h-[34px] px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors whitespace-nowrap min-w-[70px] text-center ${isPrototype ? 'border-amber-400/40 text-amber-300 bg-amber-500/10' : 'border-emerald-400/40 text-emerald-300 bg-emerald-500/10'}`}
      title={t('Switch between real on-chain mode and safe prototype simulation mode.', '在真实链上模式和安全原型模拟模式之间切换。')}
    >
      {isPrototype ? t('Prototype', '原型') : t('Live', '实盘')}
    </button>
  );
}
