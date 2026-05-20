'use client';
import { useEffect, useMemo, useState } from 'react';
import { useWallet } from '@/hooks/useWallet';

type StoredTx = {
  hash: string;
  token: 'ETH' | 'stETH' | 'wstETH';
  amount: string;
  status: 'submitted' | 'confirmed' | 'error';
  timestamp: number;
};

const TX_STORAGE_KEY = 'puffer_tx_history';
const API = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080/api';

export default function HistoryPage() {
  const { address, pufEthBalance } = useWallet();
  const [items, setItems] = useState<StoredTx[]>([]);

  useEffect(() => {
    const load = async () => {
      const local: StoredTx[] = (() => {
        if (typeof window === 'undefined') return [];
        const raw = window.localStorage.getItem(TX_STORAGE_KEY);
        if (!raw) return [];
        try {
          return JSON.parse(raw) as StoredTx[];
        } catch {
          return [];
        }
      })();

      if (!address) {
        setItems(local);
        return;
      }

      try {
        const res = await fetch(`${API}/tx-history/${address}`);
        const remote = res.ok ? ((await res.json()) as { items?: StoredTx[] }).items || [] : [];

        const byHash = new Map<string, StoredTx>();
        [...local, ...remote].forEach((tx) => byHash.set(tx.hash.toLowerCase(), tx));
        setItems(Array.from(byHash.values()));
      } catch {
        setItems(local);
      }
    };

    load();
  }, [address]);

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => b.timestamp - a.timestamp),
    [items],
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-white">History</h2>
        <p className="text-sm text-[#8892a4]">Your past staking transactions</p>
        {address && (
          <p className="text-xs text-[#00d4ff] mt-1">Current on-chain pufETH balance: {pufEthBalance ? parseFloat(pufEthBalance).toFixed(4) : '—'}</p>
        )}
      </div>

      {!address ? (
        <div className="text-center py-12 text-[#8892a4] text-sm">
          Connect your wallet to view transaction history
        </div>
      ) : sortedItems.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[#8892a4] text-sm mb-2">No transactions yet</p>
          <p className="text-xs text-[#2a3545]">
            Your staking activity will appear here after you submit a transaction.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedItems.map((tx) => (
            <div key={tx.hash} className="bg-[#0d1525] border border-[#1a2535] rounded-xl p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">Stake {tx.token}</p>
                  <p className="text-xs text-[#8892a4]">{parseFloat(tx.amount).toFixed(6)} {tx.token}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  tx.status === 'confirmed' ? 'bg-[#00ff9d]/15 text-[#00ff9d]' :
                  tx.status === 'submitted' ? 'bg-[#00d4ff]/15 text-[#00d4ff]' :
                  'bg-red-500/15 text-red-400'
                }`}>
                  {tx.status}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <p className="text-[11px] text-[#8892a4]">{new Date(tx.timestamp).toLocaleString()}</p>
                <a
                  href={`https://etherscan.io/tx/${tx.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#00d4ff] underline"
                >
                  View tx ↗
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {address && (
        <a
          href={`https://etherscan.io/address/${address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full py-3 border border-[#1a2535] rounded-xl text-center text-sm text-[#8892a4] hover:border-[#00d4ff]/30 hover:text-[#00d4ff] transition-colors"
        >
          View all on Etherscan ↗
        </a>
      )}
    </div>
  );
}
