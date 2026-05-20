import { NextRequest, NextResponse } from 'next/server';
import { BASE, TTL_SLOW } from '../../_lib/constants';
import { proxyGet } from '../../_lib/proxy';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const identifier = req.nextUrl.searchParams.get('identifier');
  if (!identifier) {
    return NextResponse.json({ error: 'identifier is required' }, { status: 400 });
  }

  const key = `gauges:apr:${identifier}`;
  return proxyGet(`${BASE}/gauges/apr?identifier=${encodeURIComponent(identifier)}`, key, TTL_SLOW);
}
