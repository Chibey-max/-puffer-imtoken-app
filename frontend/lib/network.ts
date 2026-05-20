export const TARGET_CHAIN_ID = process.env.NEXT_PUBLIC_CHAIN_ID || '0xaa36a7'; // Sepolia default
export const TARGET_NETWORK_NAME = process.env.NEXT_PUBLIC_NETWORK_NAME || 'Sepolia';
export const TARGET_RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';
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
