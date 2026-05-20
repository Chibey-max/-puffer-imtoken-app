import { NextRequest, NextResponse } from 'next/server';
import { getTxsByWallet } from '../../_lib/txStore';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, ctx: { params: { wallet: string } }) {
  const wallet = ctx.params.wallet;
  if (!wallet) return NextResponse.json({ error: 'wallet is required' }, { status: 400 });
  return NextResponse.json({ items: getTxsByWallet(wallet) });
}
