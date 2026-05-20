import { BASE, TTL_SLOW } from '../../_lib/constants';
import { proxyGet } from '../../_lib/proxy';

export const runtime = 'nodejs';

export async function GET() {
  return proxyGet(`${BASE}/pufeth/metrics`, 'pufeth:metrics', TTL_SLOW);
}
