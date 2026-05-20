import { NextRequest, NextResponse } from 'next/server';
import { BASE, TTL_RATE } from '../../_lib/constants';
import { proxyGet } from '../../_lib/proxy';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const addresses = req.nextUrl.searchParams.get('addresses');
  if (!addresses) {
    return NextResponse.json({ error: 'addresses is required' }, { status: 400 });
  }

  const key = `tokens:prices:${addresses}`;
  return proxyGet(`${BASE}/tokens/prices?addresses=${encodeURIComponent(addresses)}`, key, TTL_RATE);
}
