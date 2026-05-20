import { BASE, TTL_SLOW } from '../../_lib/constants';
import { proxyGetWithFallback } from '../../_lib/proxy';

export const runtime = 'nodejs';

export async function GET() {
  return proxyGetWithFallback(`${BASE}/protocol/tvl`, 'protocol:tvl', TTL_SLOW);
}
