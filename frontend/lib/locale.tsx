'use client';

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';

export type Locale = 'en' | 'zh';

type LocaleContextValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (en: string, zh: string) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('puffer_locale');
      if (saved === 'en' || saved === 'zh') {
        setLocaleState(saved);
      } else {
        const nav = (navigator.language || 'en').toLowerCase();
        if (nav.startsWith('zh')) setLocaleState('zh');
      }
    } catch {
      // ignore storage access errors
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem('puffer_locale', locale);
    } catch {
      // ignore storage access errors
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
    }
  }, [locale]);

  const setLocale = (l: Locale) => setLocaleState(l);

  const value = useMemo<LocaleContextValue>(() => ({
    locale,
    setLocale,
    t: (en, zh) => (locale === 'zh' ? zh : en),
  }), [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}
