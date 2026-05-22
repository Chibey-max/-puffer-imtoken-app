'use client';
import { useEffect, useMemo, useState } from 'react';
import { BrowserProvider, Eip1193Provider } from 'ethers';
import { useWallet } from '@/hooks/useWallet';
import { getApiBase } from '@/lib/apiBase';
import { useLocale } from '@/lib/locale';
import { txExplorerUrl, addressExplorerUrl } from '@/lib/explorer';

type StoredTx = {
  hash: string;
  token: 'ETH' | 'stETH' | 'wstETH';
  amount: string;
  status: 'submitted' | 'confirmed' | 'error';
  timestamp: number;
};

const TX_STORAGE_KEY = 'puffer_tx_history';
const API = getApiBase();

export default function HistoryPage() {
  const { address, pufEthBalance, chainId } = useWallet();
  const { t } = useLocale();
  const [items, setItems] = useState<StoredTx[]>([]);

  useEffect(() => {
    const reconcileSubmitted = async (txs: StoredTx[]) => {
      if (typeof window === 'undefined' || !window.ethereum) return txs;

      try {
        const provider = new BrowserProvider(window.ethereum as Eip1193Provider);
        let changed = false;
        const next = await Promise.all(txs.map(async (tx) => {
          if (tx.status !== 'submitted') return tx;
          try {
            const receipt = await provider.getTransactionReceipt(tx.hash);
            if (!receipt) return tx;
            changed = true;
            return { ...tx, status: receipt.status === 1 ? 'confirmed' as const : 'error' as const };
          } catch {
            return tx;
          }
        }));

        if (changed) {
          window.localStorage.setItem(TX_STORAGE_KEY, JSON.stringify(next));
        }

        return next;
      } catch {
        return txs;
      }
    };

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
        setItems(await reconcileSubmitted(local));
        return;
      }

      try {
        const res = await fetch(`${API}/tx-history/${address}`);
        const remote = res.ok ? ((await res.json()) as { items?: StoredTx[] }).items || [] : [];

        const byHash = new Map<string, StoredTx>();
        [...local, ...remote].forEach((tx) => byHash.set(tx.hash.toLowerCase(), tx));
        const merged = Array.from(byHash.values());
        setItems(await reconcileSubmitted(merged));
      } catch {
        setItems(await reconcileSubmitted(local));
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
        <h2 className="text-xl font-black text-white">{t('History', '历史记录')}</h2>
        <p className="text-sm text-[#8892a4]">{t('Your past staking transactions', '你的历史质押交易')}</p>
        {address && (
          <p className="text-xs text-[#00d4ff] mt-1">{t('Current on-chain pufETH balance:', '当前链上 pufETH 余额：')} {pufEthBalance ? parseFloat(pufEthBalance).toFixed(4) : '—'}</p>
        )}
      </div>

      {!address ? (
        <div className="text-center py-12 text-[#8892a4] text-sm">
          {t('Connect your wallet to view transaction history', '连接钱包以查看交易历史')}
        </div>
      ) : sortedItems.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[#8892a4] text-sm mb-2">{t('No transactions yet', '暂无交易')}</p>
          <p className="text-xs text-[#2a3545]">
            {t('Your staking activity will appear here after you submit a transaction.', '提交交易后，你的质押活动将显示在这里。')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedItems.map((tx) => (
            <div key={tx.hash} className="bg-[#0d1525] border border-[#1a2535] rounded-xl p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{t('Stake', '质押')} {tx.token}</p>
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
                  href={txExplorerUrl(tx.hash, chainId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#00d4ff] underline"
                >
                  {t('View tx ↗', '查看交易 ↗')}
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {address && (
        <a
          href={addressExplorerUrl(address, chainId)}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full py-3 border border-[#1a2535] rounded-xl text-center text-sm text-[#8892a4] hover:border-[#00d4ff]/30 hover:text-[#00d4ff] transition-colors"
        >
          {t('View all on explorer ↗', '在区块浏览器查看全部 ↗')}
        </a>
      )}
    </div>
  );
}
