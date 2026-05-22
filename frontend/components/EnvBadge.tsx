'use client';
import { useWallet } from '@/hooks/useWallet';
import { CHAIN_ID_DECIMAL, TARGET_NETWORK_NAME, pufferSupportLabel } from '@/lib/network';
import { useLocale } from '@/lib/locale';

export default function EnvBadge() {
  const { activeWalletName, address, chainId } = useWallet();
  const { t } = useLocale();
  const support = pufferSupportLabel();

  const activeWalletLabel = activeWalletName === 'Injected Wallet' ? t('Injected Wallet', '注入钱包') : activeWalletName;
  const walletLabel = activeWalletLabel || (address ? t('Injected Wallet', '注入钱包') : t('Not connected', '未连接'));
  const chainLabel = chainId ? parseInt(chainId, 16) : CHAIN_ID_DECIMAL;
  const supportLabel = support === 'Available' ? t('Available', '可用') : t('Experimental', '实验中');

  return (
    <div className="mt-1 flex items-center gap-2 text-[11px]">
      <span className="text-[#8892a4]">{walletLabel}</span>
      <span className="text-[#2a3545]">•</span>
      <span className="text-[#8892a4]">{TARGET_NETWORK_NAME} ({chainLabel})</span>
      <span className="text-[#2a3545]">•</span>
      <span className={support === 'Available' ? 'text-emerald-300' : 'text-amber-300'}>
        {supportLabel}
      </span>
    </div>
  );
}
