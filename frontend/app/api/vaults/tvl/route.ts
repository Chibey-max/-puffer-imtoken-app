import { BASE, TTL_SLOW } from '../../_lib/constants';
import { proxyGet } from '../../_lib/proxy';

export const runtime = 'nodejs';

export async function GET() {
  return proxyGet(`${BASE}/vaults/tvl`, 'vaults:tvl', TTL_SLOW);
}
