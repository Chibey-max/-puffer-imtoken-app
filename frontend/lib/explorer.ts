import { TARGET_CHAIN_ID } from '@/lib/network';

function normalizeChainId(chainIdHex?: string | null): string {
  return (chainIdHex || TARGET_CHAIN_ID || '0x1').toLowerCase();
}

export function explorerBaseUrl(chainIdHex?: string | null): string {
  const chain = normalizeChainId(chainIdHex);
  if (chain === '0x1') return 'https://etherscan.io';
  if (chain === '0x4268') return 'https://holesky.etherscan.io';
  if (chain === '0xaa36a7') return 'https://sepolia.etherscan.io';
  if (chain === '0x88b30') return 'https://hoodi.etherscan.io';
  return 'https://etherscan.io';
}

export function txExplorerUrl(hash: string, chainIdHex?: string | null): string {
  return `${explorerBaseUrl(chainIdHex)}/tx/${hash}`;
}

export function addressExplorerUrl(address: string, chainIdHex?: string | null): string {
  return `${explorerBaseUrl(chainIdHex)}/address/${address}`;
}
