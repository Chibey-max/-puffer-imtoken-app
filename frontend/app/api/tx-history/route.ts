import { NextRequest, NextResponse } from 'next/server';
import { appendTx, PersistedTx } from '../_lib/txStore';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = (await req.json()) as PersistedTx;
  if (!body?.wallet || !body?.hash || !body?.token || !body?.amount) {
    return NextResponse.json({ error: 'invalid tx payload' }, { status: 400 });
  }
  appendTx(body);
  return NextResponse.json({ ok: true });
}
