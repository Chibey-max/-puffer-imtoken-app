export const TARGET_CHAIN_ID = process.env.NEXT_PUBLIC_CHAIN_ID || '0x4268'; // Holesky default (submission-safe)
export const TARGET_NETWORK_NAME = process.env.NEXT_PUBLIC_NETWORK_NAME || 'Holesky';
const DEFAULT_HOLESKY_RPCS = [
  'https://ethereum-holesky-rpc.publicnode.com',
  'https://holesky.drpc.org',
  'https://rpc.holesky.ethpandaops.io',
];

const DEFAULT_SEPOLIA_RPCS = [
  'https://ethereum-sepolia-rpc.publicnode.com',
  'https://rpc.sepolia.org',
];

const envRpcList = (process.env.NEXT_PUBLIC_RPC_URLS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const defaultRpcs = TARGET_CHAIN_ID.toLowerCase() === '0x4268'
  ? DEFAULT_HOLESKY_RPCS
  : TARGET_CHAIN_ID.toLowerCase() === '0xaa36a7'
    ? DEFAULT_SEPOLIA_RPCS
    : ['https://cloudflare-eth.com'];

export const TARGET_RPC_URLS = envRpcList.length > 0
  ? envRpcList
  : process.env.NEXT_PUBLIC_RPC_URL
    ? [process.env.NEXT_PUBLIC_RPC_URL]
    : defaultRpcs;

export const TARGET_RPC_URL = TARGET_RPC_URLS[0];
export const SUBMISSION_MODE = process.env.NEXT_PUBLIC_SUBMISSION_MODE === 'true';
export const IS_MAINNET_TARGET = TARGET_CHAIN_ID.toLowerCase() === '0x1';
export const CHAIN_ID_DECIMAL = parseInt(TARGET_CHAIN_ID, 16);

export function isPufferStakingSupportedChain(chainIdHex: string | null | undefined): boolean {
  if (!chainIdHex) return false;
  const chain = chainIdHex.toLowerCase();
  return chain === '0x1' || chain === '0x4268';
}

export function pufferSupportLabel(): 'Available' | 'Experimental' {
  return isPufferStakingSupportedChain(TARGET_CHAIN_ID) ? 'Available' : 'Experimental';
}
