import { NextResponse } from 'next/server';
import { getCache, setCache } from './cache';

export async function proxyGet(url: string, cacheKey: string, ttl: number) {
  const cached = getCache(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) throw new Error(`Upstream ${r.status}`);
    const data = await r.json();
    setCache(cacheKey, data, ttl);
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function proxyGetWithFallback(url: string, cacheKey: string, ttl: number) {
  const cached = getCache(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) throw new Error(`Upstream ${r.status}`);
    const data = await r.json();
    setCache(cacheKey, data, ttl);
    return NextResponse.json(data);
  } catch (err: unknown) {
    if (cached) return NextResponse.json(cached);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
