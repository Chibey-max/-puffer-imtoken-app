'use client';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { VAULTS } from '@/lib/puffer';
import { useVaultsData } from '@/hooks/usePufferApi';

export default function VaultDetail({ params }: { params: { id: string } }) {
  const { id } = params;
  const vault = VAULTS.find(v => v.id === id);
  if (!vault) notFound();

  const { apy, tvl } = useVaultsData();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/vaults" className="text-[#8892a4] hover:text-white">←</Link>
        <div>
          <h2 className="text-xl font-black text-white">{vault.name}</h2>
          <p className="text-sm text-[#8892a4]">{vault.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#0d1525] border border-[#1a2535] rounded-xl p-4">
          <p className="text-xs text-[#8892a4] mb-1">APY</p>
          <p className="text-2xl font-mono font-bold" style={{ color: vault.color }}>
            {apy?.[vault.id] != null ? `${apy[vault.id].toFixed(2)}%` : '—'}
          </p>
        </div>
        <div className="bg-[#0d1525] border border-[#1a2535] rounded-xl p-4">
          <p className="text-xs text-[#8892a4] mb-1">TVL</p>
          <p className="text-2xl font-mono font-bold text-white">
            {tvl?.[vault.id] ? `$${(parseFloat(tvl[vault.id]) / 1e6).toFixed(1)}M` : '—'}
          </p>
        </div>
      </div>

      <div className="bg-[#0d1525] border border-[#1a2535] rounded-xl p-4 space-y-2">
        <p className="text-xs text-[#8892a4] uppercase tracking-wider font-semibold">Vault Details</p>
        <div className="space-y-2 text-xs font-mono">
          <div className="flex justify-between">
            <span className="text-[#8892a4]">Vault</span>
            <span className="text-white truncate ml-4">{vault.vault.slice(0,10)}…</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#8892a4]">Teller</span>
            <span className="text-white truncate ml-4">{vault.teller.slice(0,10)}…</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#8892a4]">Deposit token</span>
            <span className="text-white">{vault.token}</span>
          </div>
        </div>
      </div>

      <div className="bg-[#001a2e] border border-[#00d4ff]/20 rounded-xl p-4 text-xs text-[#8892a4]">
        Vault deposits are currently available via the Puffer Finance dApp. Full in-app deposit support coming soon.
      </div>

      <a
        href={`https://app.puffer.fi/vaults`}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full py-4 rounded-xl text-center font-bold text-sm transition-all active:scale-[0.98]"
        style={{ background: vault.color, color: '#0a0f1a' }}
      >
        Open in Puffer App ↗
      </a>
    </div>
  );
}
