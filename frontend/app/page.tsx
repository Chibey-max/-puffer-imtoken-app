'use client';
import Link from 'next/link';
import RateDisplay from '@/components/RateDisplay';
import { useWallet } from '@/hooks/useWallet';
import { useVaultsData } from '@/hooks/usePufferApi';
import { TARGET_NETWORK_NAME } from '@/lib/network';

export default function Dashboard() {
  const { address, ethBalance, pufEthBalance } = useWallet();
  const { protocolTvl, loading: tvlLoading, updatedAt: protocolUpdatedAt } = useVaultsData();
  const protocolUpdatedLabel = protocolUpdatedAt
    ? new Date(protocolUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0d1f35] to-[#0a0f1a] border border-[#1a2535] p-6 card-animate glow-soft">
        <div className="absolute top-0 right-0 w-40 h-40 bg-[#00d4ff]/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <p className="text-xs text-[#00d4ff] font-semibold tracking-widest uppercase mb-2">Puffer Finance</p>
          <h1 className="text-2xl font-black text-white mb-1">Stake ETH.</h1>
          <h1 className="text-2xl font-black text-[#00d4ff] mb-3">Earn pufETH.</h1>
          <p className="text-sm text-[#8892a4] mb-5">
            imToken-ready liquid staking on {TARGET_NETWORK_NAME}. Stake in a guided flow, track live protocol data, and receive pufETH with transparent on-chain verification.
          </p>
          <Link
            href="/stake"
            className="inline-block px-6 py-3 bg-[#00d4ff] text-[#0a0f1a] font-bold rounded-xl
                       hover:bg-[#00b8d9] active:scale-95 transition-all text-sm"
          >
            Stake Now →
          </Link>
        </div>
      </div>

      {/* Wallet snapshot */}
      {address && (
        <div className="bg-[#0d1525] border border-[#1a2535] rounded-2xl p-4">
          <p className="text-xs text-[#8892a4] mb-3 uppercase tracking-wider">Your Wallet</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <p className="text-xs text-[#8892a4]">ETH Balance</p>
              <p className="text-2xl font-mono font-bold text-white">
                {ethBalance ? parseFloat(ethBalance).toFixed(4) : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#8892a4]">pufETH Balance</p>
              <p className="text-2xl font-mono font-bold text-[#00d4ff]">
                {pufEthBalance ? parseFloat(pufEthBalance).toFixed(4) : '—'}
              </p>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-[11px] text-[#8892a4]">On-chain ERC-20 balance from {TARGET_NETWORK_NAME}</p>
            <Link
              href="/stake"
              className="px-4 py-2 border border-[#00d4ff]/40 text-[#00d4ff] text-sm rounded-xl hover:bg-[#00d4ff]/10 transition-colors"
            >
              Stake
            </Link>
          </div>
        </div>
      )}

      {/* Live rates */}
      <div>
        <p className="text-xs text-[#8892a4] mb-3 uppercase tracking-wider">Live Rates</p>
        <RateDisplay />
      </div>

      {/* Protocol stats */}
      <div>
        <p className="text-xs text-[#8892a4] mb-3 uppercase tracking-wider">Protocol Stats</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#0d1525] border border-[#1a2535] rounded-xl p-4">
            <p className="text-xs text-[#8892a4] mb-1">Protocol TVL</p>
            {protocolTvl ? (
              <p className="text-xl font-mono font-bold text-white">
                {`$${(parseFloat(protocolTvl.tvl) / 1e6).toFixed(1)}M`}
              </p>
            ) : tvlLoading ? (
              <div className="h-6 w-20 bg-[#1a2535] rounded animate-pulse" />
            ) : (
              <p className="text-xl font-mono font-bold text-white">—</p>
            )}
          </div>
          <div className="bg-[#0d1525] border border-[#1a2535] rounded-xl p-4">
            <p className="text-xs text-[#8892a4] mb-1">Staking APY</p>
            {protocolTvl && protocolTvl.stakingApy != null ? (
              <p className="text-xl font-mono font-bold text-[#00ff9d]">
                {`${Number(protocolTvl.stakingApy).toFixed(2)}%`}
              </p>
            ) : tvlLoading ? (
              <div className="h-6 w-16 bg-[#1a2535] rounded animate-pulse" />
            ) : (
              <p className="text-xl font-mono font-bold text-[#00ff9d]">—</p>
            )}
            {protocolUpdatedLabel && <p className="text-[10px] text-[#8892a4] mt-1">Updated {protocolUpdatedLabel}</p>}
          </div>
        </div>
      </div>

      <section className="bg-[#001a2e] border border-[#00d4ff]/20 rounded-2xl p-4">
        <p className="text-xs text-[#8892a4] uppercase tracking-wider">Submission status</p>
        <div className="mt-2 space-y-1 text-sm">
          <p className="text-[#00ff9d]"><span className="font-semibold">Base Challenge:</span> Complete ✅</p>
          <p className="text-amber-300"><span className="font-semibold">Advanced Challenge:</span> In progress 🚧 (DEX aggregator)</p>
        </div>
      </section>

      {/* Why this is secure */}
      <section className="bg-[#0d1525] border border-[#1a2535] rounded-2xl p-4 space-y-3 card-animate">
        <div>
          <p className="text-xs text-[#8892a4] uppercase tracking-wider">Trust & Safety</p>
          <h3 className="text-base font-bold text-white mt-1">Why this is secure</h3>
        </div>

        <ul className="space-y-2 text-xs text-[#8892a4]">
          <li>• Network guardrail prevents staking on unsupported networks.</li>
          <li>• Every stake shows transaction state and links directly to Etherscan.</li>
          <li>• Live rates and vault stats are fetched from the official Puffer hackathon API via backend proxy.</li>
          <li>• Contract references are visible in-app before staking.</li>
        </ul>
      </section>

      {/* CTA to vaults */}
      <Link
        href="/vaults"
        className="block bg-[#0d1525] border border-[#1a2535] rounded-2xl p-4 hover:border-[#00d4ff]/30 transition-colors cta-animate card-animate"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white">UniFi Vaults</p>
            <p className="text-xs text-[#8892a4]">Explore curated pufETH yield opportunities</p>
          </div>
          <span className="text-[#00d4ff]">→</span>
        </div>
      </Link>
    </div>
  );
}
