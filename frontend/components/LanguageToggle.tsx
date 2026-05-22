'use client';

import { useLocale } from '@/lib/locale';

export default function LanguageToggle() {
  const { locale, setLocale } = useLocale();

  return (
    <div className="flex items-center gap-1 rounded-lg border border-[#2a3a52] bg-[#0e1a2d] p-0.5 shrink-0 h-[34px]">
      <button
        onClick={() => setLocale('en')}
        className={`px-2.5 py-1 rounded-md text-[11px] whitespace-nowrap ${locale === 'en' ? 'bg-[#1a2a42] text-white' : 'text-[#8ea0bc]'}`}
      >
        EN
      </button>
      <button
        onClick={() => setLocale('zh')}
        className={`px-2.5 py-1 rounded-md text-[11px] whitespace-nowrap ${locale === 'zh' ? 'bg-[#1a2a42] text-white' : 'text-[#8ea0bc]'}`}
      >
        <span className="sm:hidden">中</span>
        <span className="hidden sm:inline">中文</span>
      </button>
    </div>
  );
}
