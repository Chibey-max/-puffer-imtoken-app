'use client';
import StakeForm from '@/components/StakeForm';
import RateDisplay from '@/components/RateDisplay';
import DemoStepper from '@/components/DemoStepper';
import AwardEvidencePanel from '@/components/AwardEvidencePanel';
import { ADDRESSES } from '@/lib/puffer';
import { TARGET_NETWORK_NAME } from '@/lib/network';
import { useLocale } from '@/lib/locale';

export default function StakePage() {
  const { t } = useLocale();
  return (
    <div className="space-y-6">
      <div className="card-animate dex-card p-4">
        <h2 className="text-xl font-black text-white">{t('Stake', '质押')}</h2>
        <p className="text-sm text-[#8ea0bc]">{t('Stake ETH, stETH, or wstETH in one guided flow and mint pufETH on supported networks.', '在一个引导流程中质押 ETH、stETH 或 wstETH，并在支持的网络上铸造 pufETH。')}</p>
      </div>
      <DemoStepper />
      <StakeForm />
      <div className="card-animate dex-card p-4">
        <p className="text-xs text-[#8ea0bc] mb-3 uppercase tracking-wider">{t('Current Rates', '当前汇率')}</p>
        <RateDisplay />
      </div>
      <div className="dex-card rounded-xl p-4 space-y-2 card-animate">
        <p className="text-xs text-[#8ea0bc] font-semibold uppercase tracking-wider">{t('How staking works', '质押机制')}</p>
        <ul className="text-xs text-[#8ea0bc] space-y-1.5">
          <li>{t('→ Your deposit is routed to Puffer smart contracts on', '→ 你的存款会路由到')} {TARGET_NETWORK_NAME}{t('.', '。')}</li>
          <li>{t('→ You receive pufETH, a liquid staking token that appreciates over time.', '→ 你将收到 pufETH，这是一种会随时间增值的流动性质押代币。')}</li>
          <li>{t('→ Rewards are reflected in exchange rate growth (auto-compounding).', '→ 收益会体现在兑换汇率增长中（自动复利）。')}</li>
          <li>{t('→ Final transaction confirmation is verifiable on the active chain explorer.', '→ 最终交易确认可在当前链区块浏览器上验证。')}</li>
        </ul>
      </div>

      <div className="dex-card rounded-xl p-4 space-y-2 card-animate">
        <p className="text-xs text-[#8ea0bc] font-semibold uppercase tracking-wider">{t('Contract references', '合约地址')} ({TARGET_NETWORK_NAME})</p>
        <div className="space-y-1 text-[11px] font-mono text-[#8ea0bc]">
          <p>pufETH: <span className="text-white">{ADDRESSES.pufETH}</span></p>
          <p>stETH: <span className="text-white">{ADDRESSES.stETH}</span></p>
          <p>wstETH: <span className="text-white">{ADDRESSES.wstETH}</span></p>
        </div>
      </div>

      <AwardEvidencePanel />
    </div>
  );
}
