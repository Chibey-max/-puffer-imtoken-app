import { CONTRACT_ADDRESSES, TOKENS_ADDRESSES, Token, VAULTS_ADDRESSES } from '@pufferfinance/puffer-sdk';
import { TARGET_CHAIN_ID } from '@/lib/network';

export type ChainCapabilities = {
  chainIdHex: string;
  chainIdDec: number;
  canStake: boolean;
  canStakeStEth: boolean;
  canStakeWstEth: boolean;
  canVaultDeposit: boolean;
  canAdvancedSwapAggregator: boolean;
  canOneClickAnyTokenToPufEth: boolean;
};

function hexToDec(chainIdHex: string): number {
  return parseInt(chainIdHex, 16);
}

function hasAddress(value: unknown): boolean {
  return typeof value === 'string' && /^0x[a-fA-F0-9]{40}$/.test(value) && value !== '0x0000000000000000000000000000000000000000';
}

export function getChainCapabilities(chainIdHex?: string | null): ChainCapabilities {
  const normalized = (chainIdHex || TARGET_CHAIN_ID || '0x1').toLowerCase();
  const chainIdDec = hexToDec(normalized);

  const contractsByChain = (CONTRACT_ADDRESSES as Record<number, Record<string, unknown>>)[chainIdDec] || {};
  const tokenMap = TOKENS_ADDRESSES as Record<string, Record<number, string>>;

  const pufEth = tokenMap[Token.pufETH]?.[chainIdDec];
  const stEth = tokenMap[Token.stETH]?.[chainIdDec];
  const wstEth = tokenMap[Token.wstETH]?.[chainIdDec];

  const hasPufferVault = hasAddress(contractsByChain.PufferVault);
  const hasDepositor = hasAddress(contractsByChain.PufferDepositor);

  const unifiEthVault = (VAULTS_ADDRESSES as Record<string, Record<number, unknown>>).unifiETH?.[chainIdDec];
  const unifiUsdVault = (VAULTS_ADDRESSES as Record<string, Record<number, unknown>>).unifiUSD?.[chainIdDec];
  const unifiBtcVault = (VAULTS_ADDRESSES as Record<string, Record<number, unknown>>).unifiBTC?.[chainIdDec];
  const pufEthsVault = (VAULTS_ADDRESSES as Record<string, Record<number, unknown>>).pufETHs?.[chainIdDec];

  const hasAnyUnifiVault = Boolean(unifiEthVault || unifiUsdVault || unifiBtcVault || pufEthsVault);

  const canStake = hasPufferVault && hasAddress(pufEth);
  const canStakeStEth = canStake && hasDepositor && hasAddress(stEth);
  const canStakeWstEth = canStake && hasDepositor && hasAddress(wstEth);

  // ParaSwap path in this app currently uses mainnet endpoint /transactions/1.
  const canAdvancedSwapAggregator = chainIdDec === 1;
  const canVaultDeposit = hasAnyUnifiVault && hasAddress(pufEth);

  return {
    chainIdHex: normalized,
    chainIdDec,
    canStake,
    canStakeStEth,
    canStakeWstEth,
    canVaultDeposit,
    canAdvancedSwapAggregator,
    canOneClickAnyTokenToPufEth: canAdvancedSwapAggregator && canStake,
  };
}
