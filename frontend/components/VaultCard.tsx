'use client';
import Link from 'next/link';
import { useLocale } from '@/lib/locale';

interface Props {
  id: string;
  name: string;
  description: string;
  token: string;
  color: string;
  apy?: number;
  tvl?: string;
}

export default function VaultCard({ id, name, description, token, color, apy, tvl }: Props) {
  const { t } = useLocale();

  return (
    <div
      className="bg-[#0d1525] border border-[#1a2535] rounded-2xl p-5
                 hover:border-opacity-60 transition-all hover:-translate-y-0.5 active:translate-y-0"
      style={{ '--accent': color } as React.CSSProperties}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <div
            className="inline-block px-2 py-0.5 rounded text-xs font-bold mb-2"
            style={{ background: `${color}20`, color }}
          >
            {token}
          </div>
          <h3 className="text-lg font-bold text-white">{name}</h3>
          <p className="text-xs text-[#8892a4]">{description}</p>
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
          style={{ background: `${color}15`, border: `1px solid ${color}30` }}
        >
          {token === 'WETH' ? '⟠' : token === 'WBTC' ? '₿' : token === 'USDC' ? '$' : '🔷'}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <p className="text-xs text-[#8892a4] mb-0.5">APY</p>
          <p className="text-xl font-mono font-bold" style={{ color }}>
            {apy != null ? `${apy.toFixed(2)}%` : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-[#8892a4] mb-0.5">TVL</p>
          <p className="text-xl font-mono font-bold text-white">
            {tvl ? `$${parseFloat(tvl).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}
          </p>
        </div>
      </div>

      <Link
        href={`/vaults/${id}`}
        className="block w-full py-2.5 rounded-xl text-center text-sm font-bold transition-all
                   hover:opacity-90 active:scale-[0.98]"
        style={{ background: color, color: '#0a0f1a' }}
      >
        {t('Deposit →', '存入 →')}
      </Link>
    </div>
  );
}
