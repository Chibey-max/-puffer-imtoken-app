import { Router, Request, Response } from 'express';
import { getCache, setCache } from '../middleware/cache';
import { appendTx, getTxsByWallet, PersistedTx } from '../storage/txStore';

const router = Router();
const BASE = 'https://api-v2.puffer.fi/imtoken-hackathon';

const TTL_RATE = 30_000;       // 30s for live rates
const TTL_SLOW = 5 * 60_000;  // 5min for APY/TVL

async function proxyGet(url: string, cacheKey: string, ttl: number, res: Response) {
  const cached = getCache(cacheKey);
  if (cached) return res.json(cached);

  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Upstream ${r.status}`);
    const data = await r.json();
    setCache(cacheKey, data, ttl);
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(502).json({ error: message });
  }
}

router.get('/pufeth/rate', (_req: Request, res: Response) =>
  proxyGet(`${BASE}/pufeth/rate`, 'pufeth:rate', TTL_RATE, res));

router.get('/pufeth/metrics', (_req: Request, res: Response) =>
  proxyGet(`${BASE}/pufeth/metrics`, 'pufeth:metrics', TTL_SLOW, res));

router.get('/vaults/apy', (_req: Request, res: Response) =>
  proxyGet(`${BASE}/vaults/apy`, 'vaults:apy', TTL_SLOW, res));

router.get('/vaults/tvl', (_req: Request, res: Response) =>
  proxyGet(`${BASE}/vaults/tvl`, 'vaults:tvl', TTL_SLOW, res));

router.get('/protocol/tvl', async (_req: Request, res: Response) => {
  const cached = getCache('protocol:tvl');
  if (cached) return res.json(cached);

  try {
    const r = await fetch(`${BASE}/protocol/tvl`);
    if (!r.ok) throw new Error(`Upstream ${r.status}`);
    const data = await r.json();
    setCache('protocol:tvl', data, TTL_SLOW);
    return res.json(data);
  } catch (err: unknown) {
    if (cached) return res.json(cached);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(502).json({ error: message });
  }
});

router.get('/tokens/prices', (req: Request, res: Response) => {
  const { addresses } = req.query;
  const key = `tokens:prices:${addresses}`;
  proxyGet(`${BASE}/tokens/prices?addresses=${addresses}`, key, TTL_RATE, res);
});

router.get('/gauges/apr', (req: Request, res: Response) => {
  const { identifier } = req.query;
  const key = `gauges:apr:${identifier}`;
  proxyGet(`${BASE}/gauges/apr?identifier=${identifier}`, key, TTL_SLOW, res);
});

router.get('/health', (_req: Request, res: Response) =>
  res.json({ status: 'ok', ts: new Date().toISOString() }));

router.get('/tx-history/:wallet', (req: Request, res: Response) => {
  const rawWallet = req.params.wallet;
  const wallet = Array.isArray(rawWallet) ? rawWallet[0] : rawWallet;
  if (!wallet) return res.status(400).json({ error: 'wallet is required' });
  return res.json({ items: getTxsByWallet(wallet) });
});

router.post('/tx-history', (req: Request, res: Response) => {
  const body = req.body as PersistedTx;
  if (!body?.wallet || !body?.hash || !body?.token || !body?.amount) {
    return res.status(400).json({ error: 'invalid tx payload' });
  }
  appendTx(body);
  return res.json({ ok: true });
});

export default router;
