'use client';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useWallet } from '@/hooks/useWallet';
import { useLocale } from '@/lib/locale';

function truncate(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function walletAccent(name: string) {
  const key = name.toLowerCase();
  if (key.includes('metamask')) return 'from-[#f6851b] to-[#e2761b]';
  if (key.includes('trust')) return 'from-[#3375bb] to-[#1f5ea0]';
  if (key.includes('coinbase')) return 'from-[#1652f0] to-[#0f3db5]';
  if (key.includes('imtoken')) return 'from-[#11c0a5] to-[#0ea692]';
  if (key.includes('rabby')) return 'from-[#7083ff] to-[#4e63f5]';
  if (key.includes('tokenpocket')) return 'from-[#4da3ff] to-[#2c7dd6]';
  return 'from-[#3a8bff] to-[#6ea2ff]';
}

function walletLogoSrc(name: string): string | null {
  const key = name.toLowerCase();
  if (key.includes('metamask')) return '/wallet-icons/metamask.svg';
  if (key.includes('trust')) return '/wallet-icons/trust-wallet.svg';
  if (key.includes('coinbase')) return '/wallet-icons/coinbase-wallet.svg';
  if (key.includes('imtoken')) return '/wallet-icons/imtoken.svg';
  if (key.includes('rabby')) return '/wallet-icons/rabby.svg';
  if (key.includes('tokenpocket')) return '/wallet-icons/tokenpocket.svg';
  return null;
}

function WalletIcon({ name }: { name: string }) {
  const src = walletLogoSrc(name);
  const text = name === 'Injected Wallet' ? 'IW' : name.slice(0, 2).toUpperCase();

  if (src) {
    return <img src={src} alt={`${name} logo`} className="h-6 w-6 shrink-0 rounded-md object-cover" />;
  }

  return (
    <span
      className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br ${walletAccent(name)} text-[10px] font-bold text-white`}
      aria-hidden
    >
      {text}
    </span>
  );
}

export default function WalletConnect() {
  const { address, ethBalance, isConnecting, error, walletConnectEnabled, connect, connectWalletConnect, disconnect, wallets } = useWallet();
  const { t } = useLocale();
  const [showWallets, setShowWallets] = useState(false);
  const [mounted, setMounted] = useState(false);


  const isMobile = useMemo(
    () => typeof navigator !== 'undefined' && /android|iphone|ipad|ipod/i.test(navigator.userAgent),
    [],
  );

  const dappUrl = typeof window !== 'undefined' ? window.location.href : '';
  const autoConnectUrl = useMemo(() => {
    if (!dappUrl) return '';
    try {
      const u = new URL(dappUrl);
      u.searchParams.set('autoconnect', '1');
      return u.toString();
    } catch {
      return dappUrl;
    }
  }, [dappUrl]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const openInWalletLinks = [
    {
      name: 'MetaMask',
      href: `https://metamask.app.link/dapp/${autoConnectUrl.replace(/^https?:\/\//, '')}`,
      install: 'https://metamask.io/download/',
    },
    {
      name: 'Trust Wallet',
      href: `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(autoConnectUrl)}`,
      install: 'https://trustwallet.com/download',
    },
    {
      name: 'Coinbase Wallet',
      href: `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(autoConnectUrl)}`,
      install: 'https://www.coinbase.com/wallet/downloads',
    },
    {
      name: 'imToken',
      href: `imtokenv2://navigate/DappView?url=${encodeURIComponent(autoConnectUrl)}`,
      install: 'https://token.im/download',
    },
  ];

  const openWalletApp = (href: string, install: string) => {
    if (typeof window === 'undefined') return;

    const isAndroid = /android/i.test(navigator.userAgent);
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    let didHide = false;

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') didHide = true;
    };

    document.addEventListener('visibilitychange', onVisibility, { once: true });
    window.location.assign(href);

    setTimeout(() => {
      document.removeEventListener('visibilitychange', onVisibility);
      if (!didHide && (isAndroid || isIOS)) {
        window.location.assign(install);
      }
    }, 1800);
  };



  if (address) {
    return (
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        <div className="hidden sm:block px-2.5 py-1.5 rounded-xl glass-pill leading-tight">
          <p className="text-[11px] font-mono text-[#8fe7ff]">{truncate(address)}</p>
          <p className="text-[10px] text-[#8ea0bc]">{ethBalance ? parseFloat(ethBalance).toFixed(4) : '0.0000'} ETH</p>
        </div>
        <div className="sm:hidden px-1.5 py-1 rounded-lg glass-pill leading-tight">
          <p className="text-[10px] font-mono text-[#8fe7ff] whitespace-nowrap">{truncate(address)}</p>
        </div>
        <button
          onClick={disconnect}
          className="h-[32px] px-2 sm:px-2.5 text-[10px] sm:text-[11px] whitespace-nowrap border border-[#2a3a52] text-[#8ea0bc] rounded-xl hover:border-red-500/60 hover:text-red-300 transition-colors glass-pill"
        >
          {t('Disconnect', '断开')}
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowWallets(true)}
        disabled={isConnecting}
        className="h-[36px] px-3 sm:px-4 bg-gradient-to-r from-[#39d3ff] to-[#6ea2ff] text-[#06101a] text-xs font-semibold rounded-xl cta-animate hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isConnecting ? t('Connecting…', '连接中…') : t('Connect', '连接')}
      </button>

      {mounted && showWallets && createPortal(
        <div className="fixed inset-0 z-[200]">
          <button
            aria-label={t('Close wallet selector', '关闭钱包选择器')}
            onClick={() => setShowWallets(false)}
            className="absolute inset-0 bg-[#020611]/78 backdrop-blur-[2px]"
          />

          <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[460px] rounded-t-2xl border border-[#244063] bg-[#0b1526] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl max-h-[78vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">{t('Connect Wallet', '连接钱包')}</h3>
              <button
                onClick={() => setShowWallets(false)}
                className="text-xs px-2 py-1 rounded-lg border border-[#2a3a52] text-[#8ea0bc]"
              >
                {t('Close', '关闭')}
              </button>
            </div>

            <button
              onClick={async () => {
                if (!walletConnectEnabled) return;
                setShowWallets(false);
                await connectWalletConnect({ mode: 'modal' });
              }}
              disabled={!walletConnectEnabled}
              className="w-full mb-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-[#06101a] bg-gradient-to-r from-[#39d3ff] to-[#6ea2ff] disabled:opacity-45 disabled:cursor-not-allowed"
            >
              {t('Connect with WalletConnect', '使用 WalletConnect 连接')}
            </button>
            {!walletConnectEnabled && (
              <p className="text-[11px] text-amber-300 -mt-1 mb-2">
                {t('WalletConnect is not configured in this deployment yet.', '当前部署尚未配置 WalletConnect。')}
              </p>
            )}



            <p className="text-[11px] uppercase tracking-wider text-[#8ea0bc] mb-2">{t('Detected in this browser', '当前浏览器检测到')}</p>
            <div className="space-y-1.5">
              {wallets.length > 0 ? wallets.map((w) => (
                <button
                  key={w.id}
                  onClick={() => {
                    setShowWallets(false);
                    connect(w.id);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-white bg-[#101d30] border border-[#223852] hover:bg-[#162742]"
                >
                  <span className="flex items-center gap-2">
                    <WalletIcon name={w.name} />
                    <span>{w.name === 'Injected Wallet' ? t('Injected Wallet', '注入钱包') : w.name}</span>
                  </span>
                  <span className="text-[#8ea0bc] text-xs">{t('Connect', '连接')}</span>
                </button>
              )) : (
                <button
                  onClick={() => {
                    setShowWallets(false);
                    connect();
                  }}
                  className="w-full px-3 py-2.5 rounded-lg text-sm text-white bg-[#101d30] border border-[#223852] hover:bg-[#162742]"
                >
                  {t('Connect injected wallet', '连接注入钱包')}
                </button>
              )}
            </div>

            {isMobile && (
              <>
                <p className="text-[11px] uppercase tracking-wider text-[#8ea0bc] mt-4 mb-2">{t('Open this dApp in wallet app', '在钱包应用中打开此 dApp')}</p>
                <div className="grid grid-cols-2 gap-2">
                  {openInWalletLinks.map((w) => (
                    <button
                      key={w.name}
                      onClick={() => openWalletApp(w.href, w.install)}
                      className="text-[12px] text-center px-2 py-2.5 rounded-lg border border-[#2a3a52] text-[#9fdfff] bg-[#101d30] hover:bg-[#162742]"
                    >
                      <span className="inline-flex items-center gap-2">
                        <WalletIcon name={w.name} />
                        <span>{w.name}</span>
                      </span>
                    </button>
                  ))}
                </div>

              </>
            )}

            <p className="text-[11px] text-[#8ea0bc] mt-3">{t('Tip: if you opened from Chrome/Safari, choose a wallet app above, then approve connection in-wallet.', '提示：如果你从 Chrome/Safari 打开，请先选择钱包应用，再在钱包内确认连接。')}</p>
            <p className="text-[10px] text-[#6f86a7] mt-2">build: wc-v2.4</p>
            {error && <p className="text-xs text-rose-300 mt-2">{error}</p>}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
