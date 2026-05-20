'use client';
import VaultCard from '@/components/VaultCard';
import { useVaultsData } from '@/hooks/usePufferApi';
import { VAULTS } from '@/lib/puffer';

export default function VaultsPage() {
  const { apy, tvl, loading } = useVaultsData();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-white">UniFi Vaults</h2>
        <p className="text-sm text-[#8892a4]">Explore pufETH-aligned vault strategies with transparent APY and TVL data.</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-44 bg-[#0d1525] border border-[#1a2535] rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {VAULTS.map(v => (
            <VaultCard
              key={v.id}
              {...v}
              apy={apy?.[v.id]}
              tvl={tvl?.[v.id]}
            />
          ))}
        </div>
      )}

      <div className="bg-[#0d1525] border border-[#1a2535] rounded-xl p-4">
        <p className="text-xs text-[#8892a4]">
          Vault metrics are sourced from the official Puffer hackathon API. APY is based on share-price performance and should be treated as indicative, not guaranteed.
        </p>
      </div>
    </div>
  );
}
