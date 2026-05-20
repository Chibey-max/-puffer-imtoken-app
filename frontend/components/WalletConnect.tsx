'use client';
import { useState } from 'react';
import { useWallet } from '@/hooks/useWallet';

function truncate(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function WalletConnect() {
  const { address, ethBalance, isConnecting, error, connect, disconnect, wallets } = useWallet();
  const [showWallets, setShowWallets] = useState(false);

  const isNoWalletError = Boolean(error?.toLowerCase().includes('no wallet'));
  const isTimeoutError = Boolean(error?.toLowerCase().includes('timed out'));

  if (address) {
    return (
      <div className="flex items-center gap-2">
        <div className="px-3 py-2 rounded-lg border border-[#1a2535] bg-[#0d1525] leading-tight">
          <p className="text-xs font-mono text-[#00d4ff]">{truncate(address)}</p>
          <p className="text-[10px] text-[#8892a4]">{ethBalance ? parseFloat(ethBalance).toFixed(4) : '0.0000'} ETH</p>
        </div>
        <button
          onClick={disconnect}
          className="h-[38px] px-3 text-xs border border-[#2a3545] text-[#8892a4] rounded-lg hover:border-red-500 hover:text-red-400 transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        onClick={() => {
          if (wallets.length > 1) setShowWallets(v => !v);
          else connect(wallets[0]?.id);
        }}
        disabled={isConnecting}
        className="h-[42px] px-4 bg-[#00d4ff] text-[#0a0f1a] text-sm font-bold rounded-lg cta-animate
                   hover:bg-[#00b8d9] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isConnecting ? 'Connecting…' : 'Connect Wallet'}
      </button>

      {showWallets && wallets.length > 0 && (
        <div className="w-[220px] bg-[#0d1525] border border-[#1a2535] rounded-xl p-2 space-y-1">
          {wallets.map((w) => (
            <button
              key={w.id}
              onClick={() => {
                setShowWallets(false);
                connect(w.id);
              }}
              className="w-full text-left px-2 py-2 rounded-lg text-xs text-white hover:bg-[#1a2535]"
            >
              {w.name}
            </button>
          ))}
        </div>
      )}
      {error && <p className="text-xs text-red-400 max-w-[240px] text-right">{error}</p>}

      {isTimeoutError && (
        <button
          onClick={() => connect(wallets[0]?.id)}
          className="text-[11px] text-[#00d4ff] underline"
        >
          Retry connection
        </button>
      )}

      {isNoWalletError && (
        <div className="flex flex-col items-end gap-1">
          <a
            href="https://metamask.io/download/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-[#00d4ff] underline"
          >
            Install MetaMask ↗
          </a>
          <a
            href="https://token.im/wallet?locale=en-us"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-[#00d4ff] underline"
          >
            Get imToken Wallet ↗
          </a>
        </div>
      )}
    </div>
  );
}
