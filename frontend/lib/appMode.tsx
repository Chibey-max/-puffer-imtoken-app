'use client';

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

export type AppMode = 'live' | 'prototype';

type AppModeContextValue = {
  mode: AppMode;
  isPrototype: boolean;
  setMode: (mode: AppMode) => void;
  toggleMode: () => void;
};

const STORAGE_KEY = 'puffer_app_mode';
const AppModeContext = createContext<AppModeContextValue | null>(null);

export function AppModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<AppMode>('live');

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === 'live' || saved === 'prototype') setModeState(saved);
    } catch {
      // ignore
    }
  }, []);

  const setMode = (next: AppMode) => {
    setModeState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  };

  const toggleMode = () => setMode(mode === 'live' ? 'prototype' : 'live');

  const value = useMemo(() => ({
    mode,
    isPrototype: mode === 'prototype',
    setMode,
    toggleMode,
  }), [mode]);

  return <AppModeContext.Provider value={value}>{children}</AppModeContext.Provider>;
}

export function useAppMode() {
  const ctx = useContext(AppModeContext);
  if (!ctx) throw new Error('useAppMode must be used within AppModeProvider');
  return ctx;
}
