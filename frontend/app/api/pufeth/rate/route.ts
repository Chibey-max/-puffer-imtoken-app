import { BASE, TTL_RATE } from '../../_lib/constants';
import { proxyGet } from '../../_lib/proxy';

export const runtime = 'nodejs';

export async function GET() {
  return proxyGet(`${BASE}/pufeth/rate`, 'pufeth:rate', TTL_RATE);
}
