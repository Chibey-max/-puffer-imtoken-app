'use client';
import StakeForm from '@/components/StakeForm';
import RateDisplay from '@/components/RateDisplay';
import { ADDRESSES } from '@/lib/puffer';
import { TARGET_NETWORK_NAME } from '@/lib/network';

export default function StakePage() {
  return (
    <div className="space-y-6">
      <div className="card-animate dex-card p-4">
        <h2 className="text-xl font-black text-white">Stake</h2>
        <p className="text-sm text-[#8ea0bc]">Stake ETH, stETH, or wstETH in one guided flow and mint pufETH on supported networks.</p>
      </div>
      <StakeForm />
      <div className="card-animate dex-card p-4">
        <p className="text-xs text-[#8ea0bc] mb-3 uppercase tracking-wider">Current Rates</p>
        <RateDisplay />
      </div>
      <div className="dex-card rounded-xl p-4 space-y-2 card-animate">
        <p className="text-xs text-[#8ea0bc] font-semibold uppercase tracking-wider">How staking works</p>
        <ul className="text-xs text-[#8ea0bc] space-y-1.5">
          <li>→ Your deposit is routed to Puffer smart contracts on {TARGET_NETWORK_NAME}.</li>
          <li>→ You receive pufETH, a liquid staking token that appreciates over time.</li>
          <li>→ Rewards are reflected in exchange rate growth (auto-compounding).</li>
          <li>→ Final transaction confirmation is verifiable on Etherscan.</li>
        </ul>
      </div>

      <div className="dex-card rounded-xl p-4 space-y-2 card-animate">
        <p className="text-xs text-[#8ea0bc] font-semibold uppercase tracking-wider">Contract references ({TARGET_NETWORK_NAME})</p>
        <div className="space-y-1 text-[11px] font-mono text-[#8ea0bc]">
          <p>pufETH: <span className="text-white">{ADDRESSES.pufETH}</span></p>
          <p>stETH: <span className="text-white">{ADDRESSES.stETH}</span></p>
          <p>wstETH: <span className="text-white">{ADDRESSES.wstETH}</span></p>
        </div>
      </div>
    </div>
  );
}
