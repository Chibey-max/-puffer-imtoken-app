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
      <div className="flex items-center gap-1.5">
        <div className="px-2.5 py-1.5 rounded-xl glass-pill leading-tight">
          <p className="text-[11px] font-mono text-[#8fe7ff]">{truncate(address)}</p>
          <p className="text-[10px] text-[#8ea0bc]">{ethBalance ? parseFloat(ethBalance).toFixed(4) : '0.0000'} ETH</p>
        </div>
        <button
          onClick={disconnect}
          className="h-[34px] px-2.5 text-[11px] border border-[#2a3a52] text-[#8ea0bc] rounded-xl hover:border-red-500/60 hover:text-red-300 transition-colors glass-pill"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1.5 relative">
      <button
        onClick={() => {
          if (wallets.length > 1) setShowWallets(v => !v);
          else connect(wallets[0]?.id);
        }}
        disabled={isConnecting}
        className="h-[36px] px-4 bg-gradient-to-r from-[#39d3ff] to-[#6ea2ff] text-[#06101a] text-xs font-semibold rounded-xl cta-animate
                   hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isConnecting ? 'Connecting…' : 'Connect Wallet'}
      </button>

      {showWallets && wallets.length > 0 && (
        <div className="absolute top-10 right-0 w-[210px] rounded-xl p-2 space-y-1 shadow-2xl z-40 glass-pill">
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
