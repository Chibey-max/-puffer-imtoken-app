'use client';
import { useState, useCallback } from 'react';
import { createPufferClient } from '@/lib/puffer';
import { TARGET_RPC_URL } from '@/lib/network';
import { PufferClient } from '@pufferfinance/puffer-sdk';

export function usePufferClient() {
  const [client, setClient] = useState<PufferClient | null>(null);

  const init = useCallback(() => {
    const rpcUrl = TARGET_RPC_URL;
    try {
      const c = createPufferClient(rpcUrl);
      setClient(c);
      return c;
    } catch {
      return null;
    }
  }, []);

  return { client, init };
}
