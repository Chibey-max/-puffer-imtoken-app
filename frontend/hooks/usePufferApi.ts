'use client';
import { useState, useEffect } from 'react';
import { getApiBase } from '@/lib/apiBase';

const API = getApiBase();

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

type VaultApyApiResponse = {
  data?: Array<{
    token_address?: string;
    apy?: string | number;
  }>;
  timestamp?: string;
};

type VaultTvlApiResponse = {
  unifi_eth_vault?: string;
  unifi_usd_vault?: string;
  unifi_btc_vault?: string;
  pufeths_vault?: string;
};

function normalizeVaultApy(input: VaultApyApiResponse | VaultAPY): VaultAPY {
  if (input && typeof input === 'object' && !Array.isArray(input) && 'data' in input && Array.isArray(input.data)) {
    const mapByAddress: Record<string, string> = {
      '0x196ead472583bc1e9af7a05f860d9857e1bd3dcc': 'unifiETH',
      '0x82c40e07277ebb92935f79ce92268f80ddc7cab4': 'unifiUSD',
      '0x170d847a8320f3b6a77ee15b0cae430e3ec933a0': 'unifiBTC',
      '0x62a4ce0722ee65635c0f8339dd814d549b6f6735': 'pufETHs',
    };

    const next: VaultAPY = {};
    input.data.forEach((item) => {
      const addr = (item.token_address || '').toLowerCase();
      const id = mapByAddress[addr];
      if (!id) return;
      const apy = typeof item.apy === 'number' ? item.apy : Number(item.apy || 0);
      if (Number.isFinite(apy)) next[id] = apy;
    });
    return next;
  }
  return input as VaultAPY;
}

function normalizeVaultTvl(input: VaultTvlApiResponse | VaultTVL): VaultTVL {
  if (input && typeof input === 'object' && !Array.isArray(input) && ('unifi_eth_vault' in input || 'unifi_usd_vault' in input || 'unifi_btc_vault' in input)) {
    return {
      unifiETH: input.unifi_eth_vault || '0',
      unifiUSD: input.unifi_usd_vault || '0',
      unifiBTC: input.unifi_btc_vault || '0',
      pufETHs: input.pufeths_vault || '0',
    };
  }
  return input as VaultTVL;
}

export interface ProtocolTVL {
  tvl: string;
  stakingApy?: number;
}

type ProtocolTvlApiResponse = {
  tvl?: string;
  stakingApy?: number;
  tvl_puffer_staking?: string;
  apy?: string | number;
};

function normalizeProtocolTvl(input: ProtocolTvlApiResponse | ProtocolTVL): ProtocolTVL {
  if (input && typeof input === 'object' && ('tvl_puffer_staking' in input || 'apy' in input)) {
    const apy = typeof input.apy === 'number' ? input.apy : Number(input.apy || 0);
    return {
      tvl: input.tvl_puffer_staking || input.tvl || '0',
      stakingApy: Number.isFinite(apy) ? apy : 0,
    };
  }
  return input as ProtocolTVL;
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
        apiFetch<VaultApyApiResponse | VaultAPY>('/vaults/apy'),
        apiFetch<VaultTvlApiResponse | VaultTVL>('/vaults/tvl'),
        apiFetch<ProtocolTvlApiResponse | ProtocolTVL>('/protocol/tvl'),
      ]);

      if (!mounted) return;

      const now = Date.now();
      const errors: string[] = [];

      if (apyRes.status === 'fulfilled') {
        const normalized = normalizeVaultApy(apyRes.value);
        setApy(normalized);
        setCached('vaultApy', { data: normalized, ts: now });
      } else {
        errors.push(`APY: ${apyRes.reason instanceof Error ? apyRes.reason.message : 'failed'}`);
      }

      if (tvlRes.status === 'fulfilled') {
        const normalized = normalizeVaultTvl(tvlRes.value);
        setTvl(normalized);
        setCached('vaultTvl', { data: normalized, ts: now });
      } else {
        errors.push(`TVL: ${tvlRes.reason instanceof Error ? tvlRes.reason.message : 'failed'}`);
      }

      if (protocolRes.status === 'fulfilled') {
        const normalized = normalizeProtocolTvl(protocolRes.value);
        setProtocolTvl(normalized);
        setCached('protocolTvl', { data: normalized, ts: now });
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
