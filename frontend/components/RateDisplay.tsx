'use client';
import { usePufETHRate } from '@/hooks/usePufferApi';

export default function RateDisplay() {
  const { data, loading, updatedAt } = usePufETHRate();

  const updatedLabel = updatedAt ? new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="bg-[#0d1525] border border-[#1a2535] rounded-xl p-4">
        <p className="text-xs text-[#8892a4] mb-1">pufETH / ETH</p>
        {data ? (
          <p className="text-xl font-mono font-bold text-[#00d4ff]">
            {parseFloat(data.pufEthPerEth).toFixed(4)}
          </p>
        ) : loading ? (
          <div className="h-6 w-24 bg-[#1a2535] rounded animate-pulse" />
        ) : (
          <p className="text-xl font-mono font-bold text-[#00d4ff]">—</p>
        )}
      </div>
      <div className="bg-[#0d1525] border border-[#1a2535] rounded-xl p-4">
        <p className="text-xs text-[#8892a4] mb-1">ETH / pufETH</p>
        {data ? (
          <p className="text-xl font-mono font-bold text-[#00ff9d]">
            {parseFloat(data.ethPerPufEth).toFixed(4)}
          </p>
        ) : loading ? (
          <div className="h-6 w-24 bg-[#1a2535] rounded animate-pulse" />
        ) : (
          <p className="text-xl font-mono font-bold text-[#00ff9d]">—</p>
        )}
      </div>
      <div className="bg-[#0d1525] border border-[#1a2535] rounded-xl p-4 col-span-2">
        <p className="text-xs text-[#8892a4] mb-1">Total Staked Assets</p>
        {data ? (
          <p className="text-xl font-mono font-bold text-white">
            {`${parseFloat(data.totalAssets).toLocaleString(undefined, { maximumFractionDigits: 0 })} ETH`}
          </p>
        ) : loading ? (
          <div className="h-6 w-32 bg-[#1a2535] rounded animate-pulse" />
        ) : (
          <p className="text-xl font-mono font-bold text-white">—</p>
        )}
        {updatedLabel && <p className="text-[10px] text-[#8892a4] mt-1">Updated {updatedLabel}</p>}
      </div>
    </div>
  );
}
