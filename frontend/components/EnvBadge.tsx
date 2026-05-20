'use client';

import { useWallet } from '@/hooks/useWallet';
import { CHAIN_ID_DECIMAL, TARGET_NETWORK_NAME, pufferSupportLabel } from '@/lib/network';

export default function EnvBadge() {
  const { activeWalletName, address, chainId } = useWallet();
  const support = pufferSupportLabel();

  const walletLabel = activeWalletName || (address ? 'Injected Wallet' : 'Not connected');
  const chainLabel = chainId ? parseInt(chainId, 16) : CHAIN_ID_DECIMAL;

  return (
    <div className="mt-1 flex items-center gap-2 text-[11px]">
      <span className="text-[#8892a4]">{walletLabel}</span>
      <span className="text-[#2a3545]">•</span>
      <span className="text-[#8892a4]">{TARGET_NETWORK_NAME} ({chainLabel})</span>
      <span className="text-[#2a3545]">•</span>
      <span className={support === 'Available' ? 'text-emerald-300' : 'text-amber-300'}>
        {support}
      </span>
    </div>
  );
}
