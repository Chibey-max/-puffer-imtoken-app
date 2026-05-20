'use client';
import { useEffect, useState } from 'react';
import { getApiBase } from '@/lib/apiBase';

const API_BASE = getApiBase();
const HEALTH_URL = `${API_BASE}/health`;
const POLL_INTERVAL_MS = 20_000;
const FAILURE_THRESHOLD = 2;

type HealthState = {
  consecutiveFailures: number;
  lastError: string | null;
  checking: boolean;
};

export default function ApiStatusBanner() {
  const [state, setState] = useState<HealthState>({
    consecutiveFailures: 0,
    lastError: null,
    checking: true,
  });

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const res = await fetch(HEALTH_URL, { cache: 'no-store' });
        if (!res.ok) throw new Error(`GET ${HEALTH_URL} -> ${res.status}`);
        if (cancelled) return;
        setState({ consecutiveFailures: 0, lastError: null, checking: false });
      } catch (e: unknown) {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : 'Unknown API error';
        setState((prev) => ({
          consecutiveFailures: prev.consecutiveFailures + 1,
          lastError: message,
          checking: false,
        }));
      }
    };

    check();
    const interval = setInterval(check, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const shouldShow = state.consecutiveFailures >= FAILURE_THRESHOLD;
  if (state.checking || !shouldShow) return null;

  return (
    <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
      <p className="text-sm font-semibold text-amber-300">Live data temporarily unavailable</p>
      <p className="text-xs text-[#c9b48a] mt-1">
        Backend API health checks failed {state.consecutiveFailures} times in a row. Wallet and staking UI are still available.
      </p>
      {state.lastError && (
        <p className="text-[11px] text-amber-200/90 mt-1 font-mono break-all">{state.lastError}</p>
      )}
      <button
        onClick={() => window.location.reload()}
        className="mt-2 text-xs text-amber-200 underline hover:text-amber-100"
      >
        Retry
      </button>
    </div>
  );
}
