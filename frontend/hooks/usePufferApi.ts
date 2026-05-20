'use client';
import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080/api';

const RATE_TTL = 30_000;
const VAULT_TTL = 60_000;
const PERSIST_KEY = 'puffer_api_cache_v1';

type CacheEntry<T> = {
  data: T;
  ts: number;
};

type PersistShape = {
  rate?: CacheEntry<PufETHRate>;
  vaultApy?: CacheEntry<VaultAPY>;
  vaultTvl?: CacheEntry<VaultTVL>;
  protocolTvl?: CacheEntry<ProtocolTVL>;
};

const memoryCache: PersistShape = {};
const inflight = new Map<string, Promise<unknown>>();

function readPersist(): PersistShape {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(PERSIST_KEY);
    return raw ? (JSON.parse(raw) as PersistShape) : {};
  } catch {
    return {};
  }
}

function writePersist(next: PersistShape) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PERSIST_KEY, JSON.stringify(next));
  } catch {
    // ignore storage quota / parse errors
  }
}

function setCached<K extends keyof PersistShape>(key: K, value: NonNullable<PersistShape[K]>) {
  memoryCache[key] = value;
  const persisted = readPersist();
  persisted[key] = value;
  writePersist(persisted);
}

function getCached<K extends keyof PersistShape>(key: K): PersistShape[K] | undefined {
  return memoryCache[key];
}

async function apiFetch<T>(path: string): Promise<T> {
  const key = `${API}${path}`;
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;

  const req = fetch(key, { cache: 'no-store' })
    .then(async (res) => {
      if (!res.ok) throw new Error(`API error ${res.status} on ${path}`);
      return res.json() as Promise<T>;
    })
    .finally(() => inflight.delete(key));

  inflight.set(key, req);
  return req;
}

export interface PufETHRate {
  pufEthPerEth: string;
  ethPerPufEth: string;
  totalAssets: string;
  totalSupply: string;
}

export interface VaultAPY {
  [vault: string]: number;
}

export interface VaultTVL {
  [vault: string]: string;
}

export interface ProtocolTVL {
  tvl: string;
  stakingApy?: number;
}

export function usePufETHRate() {
  const [data, setData] = useState<PufETHRate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;

    const persisted = readPersist().rate;
    if (persisted && mounted) {
      setData(persisted.data);
      setUpdatedAt(persisted.ts);
      setLoading(false);
      memoryCache.rate = persisted;
    }

    const load = async () => {
      try {
        const d = await apiFetch<PufETHRate>('/pufeth/rate');
        if (!mounted) return;
        setData(d);
        const ts = Date.now();
        setCached('rate', { data: d, ts });
        setUpdatedAt(ts);
        setError(null);
      } catch (e: unknown) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : 'Failed to load rate');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    const interval = setInterval(load, RATE_TTL);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return { data, loading, error, updatedAt };
}

export function useVaultsData() {
  const [apy, setApy] = useState<VaultAPY | null>(null);
  const [tvl, setTvl] = useState<VaultTVL | null>(null);
  const [protocolTvl, setProtocolTvl] = useState<ProtocolTVL | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;

    const persisted = readPersist();
    if (persisted.vaultApy?.data && persisted.vaultTvl?.data && persisted.protocolTvl?.data && mounted) {
      setApy(persisted.vaultApy.data);
      setTvl(persisted.vaultTvl.data);
      setProtocolTvl(persisted.protocolTvl.data);
      setUpdatedAt(persisted.protocolTvl.ts || persisted.vaultTvl.ts || persisted.vaultApy.ts);
      setLoading(false);
      memoryCache.vaultApy = persisted.vaultApy;
      memoryCache.vaultTvl = persisted.vaultTvl;
      memoryCache.protocolTvl = persisted.protocolTvl;
    }

    const load = async () => {
      const [apyRes, tvlRes, protocolRes] = await Promise.allSettled([
        apiFetch<VaultAPY>('/vaults/apy'),
        apiFetch<VaultTVL>('/vaults/tvl'),
        apiFetch<ProtocolTVL>('/protocol/tvl'),
      ]);

      if (!mounted) return;

      const now = Date.now();
      const errors: string[] = [];

      if (apyRes.status === 'fulfilled') {
        setApy(apyRes.value);
        setCached('vaultApy', { data: apyRes.value, ts: now });
      } else {
        errors.push(`APY: ${apyRes.reason instanceof Error ? apyRes.reason.message : 'failed'}`);
      }

      if (tvlRes.status === 'fulfilled') {
        setTvl(tvlRes.value);
        setCached('vaultTvl', { data: tvlRes.value, ts: now });
      } else {
        errors.push(`TVL: ${tvlRes.reason instanceof Error ? tvlRes.reason.message : 'failed'}`);
      }

      if (protocolRes.status === 'fulfilled') {
        setProtocolTvl(protocolRes.value);
        setCached('protocolTvl', { data: protocolRes.value, ts: now });
      } else {
        errors.push(`Protocol: ${protocolRes.reason instanceof Error ? protocolRes.reason.message : 'failed'}`);
      }

      const hasAnySuccess = [apyRes, tvlRes, protocolRes].some((r) => r.status === 'fulfilled');
      if (hasAnySuccess) setUpdatedAt(now);

      if (errors.length > 0 && !hasAnySuccess) {
        setError(errors.join(' | '));
      } else {
        setError(null);
      }

      setLoading(false);
    };

    load();
    const interval = setInterval(load, VAULT_TTL);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return { apy, tvl, protocolTvl, loading, error, updatedAt };
}
