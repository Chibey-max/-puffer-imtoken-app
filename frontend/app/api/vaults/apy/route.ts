import { BASE, TTL_SLOW } from '../../_lib/constants';
import { proxyGet } from '../../_lib/proxy';

export const runtime = 'nodejs';

export async function GET() {
  return proxyGet(`${BASE}/vaults/apy`, 'vaults:apy', TTL_SLOW);
}
