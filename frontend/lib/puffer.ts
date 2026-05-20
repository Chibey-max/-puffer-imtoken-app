import { PufferClientHelpers, PufferClient, Chain } from '@pufferfinance/puffer-sdk';
import { TARGET_CHAIN_ID } from '@/lib/network';

let pufferClientInstance: PufferClient | null = null;

function resolvePufferChain(): Chain {
  if (TARGET_CHAIN_ID.toLowerCase() === '0x1') return Chain.Mainnet;

  const maybeSepolia = (Chain as unknown as Record<string, Chain>).Sepolia;
  if (TARGET_CHAIN_ID.toLowerCase() === '0xaa36a7' && maybeSepolia) return maybeSepolia;

  return Chain.Holesky;
}

export function createPufferClient(rpcUrl: string): PufferClient {
  if (!window.ethereum) throw new Error('No injected wallet found');

  const chain = resolvePufferChain();

  const walletClient = PufferClientHelpers.createWalletClient({
    chain,
    provider: window.ethereum,
  });

  const publicClient = PufferClientHelpers.createPublicClient({
    chain,
    rpcUrls: [rpcUrl],
  });

  pufferClientInstance = new PufferClient(chain, walletClient, publicClient);
  return pufferClientInstance;
}

export function getPufferClient(): PufferClient | null {
  return pufferClientInstance;
}

export const ADDRESSES = {
  pufETH: '0xd9a442856c234a39a81a089c06451ebaa4306a72',
  WETH:   '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  stETH:  '0xae7ab96520de3a18e5e111b5eaab095312d7fe84',
  wstETH: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0',
};

export const VAULTS = [
  {
    id: 'unifiETH',
    name: 'unifiETH',
    description: 'ETH liquid restaking vault',
    vault: '0x196ead472583bc1e9af7a05f860d9857e1bd3dcc',
    teller: '0x08eb2eccdf6ebd7aba601791f23ec5b5f68a1d53',
    token: 'WETH',
    color: '#00d4ff',
  },
  {
    id: 'unifiUSD',
    name: 'unifiUSD',
    description: 'USD stablecoin yield vault',
    vault: '0x82c40e07277eBb92935f79cE92268F80dDc7caB4',
    teller: '0x5d3Fb47FE7f3F4Ce8fe55518f7E4F7D6061B54DD',
    token: 'USDC',
    color: '#00ff9d',
  },
  {
    id: 'unifiBTC',
    name: 'unifiBTC',
    description: 'BTC yield vault',
    vault: '0x170d847a8320f3b6a77ee15b0cae430e3ec933a0',
    teller: '0x0743647a607822781f9d0a639454e76289182f0b',
    token: 'WBTC',
    color: '#f7931a',
  },
  {
    id: 'pufETHs',
    name: 'pufETHs',
    description: 'Staked pufETH vault',
    vault: '0x62a4ce0722ee65635c0f8339dd814d549b6f6735',
    teller: '0xd049ebeaa59b75ba8ee38f9f6830db7293320236',
    token: 'pufETH',
    color: '#a855f7',
  },
];
