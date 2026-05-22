'use client';
import VaultCard from '@/components/VaultCard';
import { useVaultsData } from '@/hooks/usePufferApi';
import { VAULTS } from '@/lib/puffer';
import { useLocale } from '@/lib/locale';

export default function VaultsPage() {
  const { apy, tvl, loading } = useVaultsData();
  const { t } = useLocale();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-white">{t('UniFi Vaults', 'UniFi 金库')}</h2>
        <p className="text-sm text-[#8892a4]">{t('Explore pufETH-aligned vault strategies with transparent APY and TVL data.', '探索与 pufETH 对齐的金库策略，APY 与 TVL 数据透明可见。')}</p>
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
          {t('Vault metrics are sourced from the official Puffer hackathon API. APY is based on share-price performance and should be treated as indicative, not guaranteed.', '金库指标来自官方 Puffer 黑客松 API。APY 基于份额价格表现，仅供参考，不构成保证。')}
        </p>
      </div>
    </div>
  );
}
