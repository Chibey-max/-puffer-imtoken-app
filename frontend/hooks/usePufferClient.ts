'use client';
import { useState, useCallback } from 'react';
import { createPufferClient } from '@/lib/puffer';
import { TARGET_RPC_URLS } from '@/lib/network';
import { PufferClient } from '@pufferfinance/puffer-sdk';

export function usePufferClient() {
  const [client, setClient] = useState<PufferClient | null>(null);

  const init = useCallback(() => {
    const rpcUrls = TARGET_RPC_URLS;
    try {
      const c = createPufferClient(rpcUrls);
      setClient(c);
      return c;
    } catch {
      return null;
    }
  }, []);

  return { client, init };
}
