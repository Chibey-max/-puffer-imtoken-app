'use client';
import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { BrowserProvider, formatEther, Eip1193Provider, Contract } from 'ethers';
import { ADDRESSES } from '@/lib/puffer';
import { TARGET_CHAIN_ID, TARGET_NETWORK_NAME } from '@/lib/network';
import { useLocale } from '@/lib/locale';

type InjectedProvider = Eip1193Provider & {
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
  isMetaMask?: boolean;
  isRabby?: boolean;
  isCoinbaseWallet?: boolean;
  isTrust?: boolean;
  isImToken?: boolean;
  isTokenPocket?: boolean;
};

type WalletConnectProvider = InjectedProvider & {
  connect: (opts?: { chains?: number[]; optionalChains?: number[] }) => Promise<void>;
  enable: () => Promise<string[]>;
  disconnect?: () => Promise<void>;
  session?: unknown;
  accounts?: string[];
  chainId?: number;
};

type EthereumWithProviders = InjectedProvider & { providers?: InjectedProvider[] };

export interface WalletOption {
  id: string;
  name: string;
}

export interface WalletState {
  address: string | null;
  ethBalance: string | null;
  pufEthBalance: string | null;
  chainId: string | null;
  isConnecting: boolean;
  error: string | null;
}

type WalletConnectTarget = 'imtoken' | 'metamask' | 'trust' | 'coinbase';
type WalletConnectMode = 'modal' | 'deeplink';
type WalletConnectOptions = {
  mode?: WalletConnectMode;
  targetWallet?: WalletConnectTarget;
};

interface WalletContextValue extends WalletState {
  isMainnet: boolean;
  activeWalletName: string | null;
  walletConnectEnabled: boolean;
  connect: (walletId?: string) => Promise<void>;
  connectWalletConnect: (options?: WalletConnectOptions) => Promise<void>;
  disconnect: () => void;
  fetchBalance: (addr: string) => Promise<void>;
  switchToMainnet: () => Promise<void>;
  wallets: WalletOption[];
}

const MAINNET_CHAIN_ID = TARGET_CHAIN_ID;
const CONNECT_TIMEOUT_MS = 20000;
const WALLET_DISCONNECTED_KEY = 'puffer_wallet_disconnected';
const WC_PROJECT_ID_FALLBACK = '41e2bc351481c4efbc367571270bba50'; // Reown project id (hackathon deployment fallback)

const WalletContext = createContext<WalletContextValue | null>(null);

function toWalletConnectDeepLink(target: WalletConnectTarget, uri: string): string {
  if (target === 'metamask') return `https://metamask.app.link/wc?uri=${encodeURIComponent(uri)}`;
  if (target === 'trust') return `https://link.trustwallet.com/wc?uri=${encodeURIComponent(uri)}`;
  if (target === 'coinbase') return `https://go.cb-w.com/wc?uri=${encodeURIComponent(uri)}`;
  return `https://link.token.im/wc?uri=${encodeURIComponent(uri)}`;
}

function providerName(p: InjectedProvider): string {
  if (p.isImToken) return 'imToken';
  if (p.isRabby) return 'Rabby';
  if (p.isCoinbaseWallet) return 'Coinbase Wallet';
  if (p.isTrust) return 'Trust Wallet';
  if (p.isTokenPocket) return 'TokenPocket';
  if (p.isMetaMask) return 'MetaMask';
  return 'Injected Wallet';
}

function providerScore(p: InjectedProvider): number {
  if (p.isImToken) return 100;
  if (p.isTokenPocket) return 90;
  if (p.isTrust) return 80;
  if (p.isMetaMask) return 70;
  if (p.isCoinbaseWallet) return 60;
  if (p.isRabby) return 50;
  return 10;
}

function getInjectedProviders(): InjectedProvider[] {
  const eth = window.ethereum as EthereumWithProviders | undefined;
  if (!eth) return [];

  const providers = Array.isArray(eth.providers) && eth.providers.length ? eth.providers : [eth];
  const dedup = Array.from(new Set(providers));
  dedup.sort((a, b) => providerScore(b) - providerScore(a));
  return dedup;
}

async function waitForInjectedProvider(timeoutMs = 1800): Promise<void> {
  if (window.ethereum) return;

  await new Promise<void>((resolve) => {
    const done = () => resolve();
    const timer = setTimeout(done, timeoutMs);

    const onInit = () => {
      clearTimeout(timer);
      window.removeEventListener('ethereum#initialized', onInit as EventListener);
      resolve();
    };

    window.addEventListener('ethereum#initialized', onInit as EventListener, { once: true });
  });
}

function friendlyWalletError(err: unknown, t: (en: string, zh: string) => string): string {
  const raw = err as { code?: number; message?: string; shortMessage?: string };
  const msg = (raw?.shortMessage || raw?.message || '').toLowerCase();

  if (raw?.code === 4001 || msg.includes('rejected')) {
    return t('Request was rejected in wallet.', '钱包中已拒绝请求。');
  }
  if (msg.includes('please call connect() before request()')) {
    return t('WalletConnect session was not established. Please tap connect again and approve in wallet.', 'WalletConnect 会话尚未建立。请再次点击连接并在钱包中确认。');
  }
  if (msg.includes('http client error') || msg.includes('403') || msg.includes('rpc endpoint returned')) {
    return t('Wallet RPC provider is unavailable for this network right now. Please switch network again or change wallet RPC endpoint.', '当前网络的钱包 RPC 服务不可用。请重新切换网络或更换钱包 RPC 节点。');
  }
  if (msg.includes('failed to fetch') || msg.includes('network error')) {
    return t('Network error while contacting wallet RPC. Check internet and retry.', '连接钱包 RPC 时发生网络错误，请检查网络后重试。');
  }
  if (msg.includes('unknown error') || msg.includes('unknown rpc error')) {
    return t('Wallet returned an unknown RPC error. Please retry in a few seconds.', '钱包返回未知 RPC 错误，请稍后重试。');
  }

  return raw?.shortMessage || raw?.message || t('Wallet request failed', '钱包请求失败');
}

function useWalletController(): WalletContextValue {
  const { t } = useLocale();
  const [state, setState] = useState<WalletState>({
    address: null,
    ethBalance: null,
    pufEthBalance: null,
    chainId: null,
    isConnecting: false,
    error: null,
  });

  const [activeProvider, setActiveProvider] = useState<InjectedProvider | null>(null);
  const [activeWalletName, setActiveWalletName] = useState<string | null>(null);
  const [wallets, setWallets] = useState<WalletOption[]>([]);
  const hasAutoConnectedRef = useRef(false);
  const wcProviderRef = useRef<WalletConnectProvider | null>(null);
  const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || WC_PROJECT_ID_FALLBACK;
  const walletConnectEnabled = Boolean(walletConnectProjectId?.trim());

  const fetchBalanceInternal = useCallback(async (addr: string, targetProvider?: InjectedProvider) => {
    const providerSource = targetProvider || activeProvider || (window.ethereum as InjectedProvider | undefined);
    if (!providerSource) return;
    const provider = new BrowserProvider(providerSource as Eip1193Provider);

    const bal = await provider.getBalance(addr);
    let pufBalance = '0';

    try {
      const puf = await new Contract(ADDRESSES.pufETH, ['function balanceOf(address) view returns (uint256)'], provider).balanceOf(addr);
      pufBalance = formatEther(puf);
    } catch {
      // keep puf balance as 0 if token read fails; ETH balance still updates
    }

    setState(s => ({ ...s, ethBalance: formatEther(bal), pufEthBalance: pufBalance }));
  }, [activeProvider]);

  const fetchBalance = useCallback(async (addr: string) => {
    await fetchBalanceInternal(addr);
  }, [fetchBalanceInternal]);

  const connect = useCallback(async (walletId?: string) => {
    try {
      window.localStorage.removeItem(WALLET_DISCONNECTED_KEY);
    } catch {
      // ignore storage errors
    }

    await waitForInjectedProvider();

    const available = getInjectedProviders();
    if (!available.length) {
      const isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent);
      setState(s => ({
        ...s,
        error: isMobile
          ? t('No wallet provider detected. Open this link inside the imToken (or other wallet) in-app browser.', '未检测到钱包提供器。请在 imToken（或其他钱包）内置浏览器中打开此链接。')
          : t('No wallet detected. Install or open any EVM wallet extension/app (Rabby, MetaMask, Coinbase, Trust, imToken).', '未检测到钱包。请安装或打开任意 EVM 钱包扩展/应用（Rabby、MetaMask、Coinbase、Trust、imToken）。'),
      }));
      return;
    }

    const selected = walletId
      ? available.find((p, idx) => `${providerName(p)}-${idx}` === walletId) || available[0]
      : available[0];

    const candidates = [selected, ...available.filter((p) => p !== selected)];

    setActiveProvider(selected);
    setActiveWalletName(providerName(selected));
    setState(s => ({ ...s, isConnecting: true, error: null }));

    let lastError: unknown = null;

    for (const candidate of candidates) {
      try {
        const requestPromise = candidate.request({ method: 'eth_requestAccounts' }) as Promise<string[]>;
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(t('Wallet approval timed out. Open your wallet extension/app, approve, then retry.', '钱包确认超时。请打开钱包扩展/应用确认后重试。'))), CONNECT_TIMEOUT_MS);
        });

        const accounts = await Promise.race([requestPromise, timeoutPromise]);
        const chainId = (await candidate.request({ method: 'eth_chainId' })) as string;
        const address = accounts[0];

        if (!address) throw new Error(t('No account returned by wallet. Please unlock wallet and retry.', '钱包未返回账户。请解锁钱包后重试。'));

        setActiveProvider(candidate);
        setActiveWalletName(providerName(candidate));
        setState(s => ({ ...s, address, chainId, isConnecting: false }));
        await fetchBalanceInternal(address, candidate);

        if (chainId !== MAINNET_CHAIN_ID) {
          setState(s => ({ ...s, error: t(`Please switch to ${TARGET_NETWORK_NAME}.`, `请切换到 ${TARGET_NETWORK_NAME}。`) }));
        }
        return;
      } catch (err: unknown) {
        const anyErr = err as { code?: number };
        if (anyErr?.code === 4001) {
          setState(s => ({ ...s, isConnecting: false, error: t('Connection request was rejected in wallet.', '钱包中已拒绝连接请求。') }));
          return;
        }
        lastError = err;
      }
    }

    setState(s => ({ ...s, isConnecting: false, error: friendlyWalletError(lastError, t) }));
  }, [fetchBalanceInternal, t]);

  const connectWalletConnect = useCallback(async (options?: WalletConnectOptions) => {
    const mode = options?.mode || 'modal';
    const targetWallet = options?.targetWallet || 'imtoken';

    setState(s => ({ ...s, isConnecting: true, error: null }));
    try {
      const projectId = walletConnectProjectId;
      if (!projectId) throw new Error('walletconnect is not configured by this app yet.');

      const targetChainDec = parseInt(MAINNET_CHAIN_ID, 16);
      const isMobile = typeof navigator !== 'undefined' && /android|iphone|ipad|ipod/i.test(navigator.userAgent);
      const useDirectDeepLink = mode === 'deeplink' && isMobile;
      const shouldShowQrModal = mode === 'modal';
      const { EthereumProvider } = await import('@walletconnect/ethereum-provider');
      const WC_TIMEOUT_MS = 25000;
      const withTimeout = async <T,>(p: Promise<T>, label: string): Promise<T> => Promise.race([
        p,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timed out`)), WC_TIMEOUT_MS)),
      ]);

      const initProvider = async (): Promise<WalletConnectProvider> => {
        // Always start a fresh WC provider so modal/deep-link mode is correct per click.
        wcProviderRef.current?.disconnect?.().catch(() => {
          // noop
        });
        wcProviderRef.current = null;

        const wc = await EthereumProvider.init({
          projectId,
          optionalChains: [targetChainDec],
          chains: [targetChainDec],
          showQrModal: shouldShowQrModal,
          metadata: {
            name: 'Puffer x imToken',
            description: 'Stake and mint pufETH',
            url: typeof window !== 'undefined' ? window.location.origin : 'https://app.puffer.fi',
            icons: ['https://app.puffer.fi/favicon.ico'],
          },
        }) as unknown as WalletConnectProvider;
        wcProviderRef.current = wc;
        return wc;
      };

      const ensureConnected = async (wc: WalletConnectProvider) => {
        let detached = false;
        const onDisplayUri = (uri: unknown) => {
          if (!useDirectDeepLink || detached) return;
          if (typeof uri !== 'string' || !uri) return;
          window.location.assign(toWalletConnectDeepLink(targetWallet as WalletConnectTarget, uri));
        };

        if (useDirectDeepLink) wc.on?.('display_uri', onDisplayUri as (...args: unknown[]) => void);

        try {
          await withTimeout(wc.connect({ optionalChains: [targetChainDec] }), 'WalletConnect connect');
        } catch (connectErr: unknown) {
          const msg = ((connectErr as { message?: string })?.message || '').toLowerCase();
          const ignorable = msg.includes('already connected') || msg.includes('session currently active') || msg.includes('user disconnected');
          if (!ignorable) throw connectErr;
        } finally {
          if (useDirectDeepLink) {
            detached = true;
            wc.removeListener?.('display_uri', onDisplayUri as (...args: unknown[]) => void);
          }
        }
      };

      const resolveSession = async () => {
        const wc = await initProvider();
        await ensureConnected(wc);
        let accounts = wc.accounts || [];
        if (!accounts.length) accounts = await withTimeout(wc.enable(), 'WalletConnect enable');
        if (!accounts.length) accounts = await withTimeout((wc.request({ method: 'eth_requestAccounts' }) as Promise<string[]>), 'WalletConnect accounts');
        const chainId = (await withTimeout((wc.request({ method: 'eth_chainId' }) as Promise<string>), 'WalletConnect chain')) as string;
        return { wc, accounts, chainId };
      };

      const resolved = await resolveSession();
      const firstAccount = resolved.accounts?.[0];
      if (!firstAccount) throw new Error(t('No account returned by WalletConnect session.', 'WalletConnect 会话未返回账户。'));

      setActiveProvider(resolved.wc);
      setActiveWalletName('WalletConnect');
      setState(s => ({ ...s, address: firstAccount, chainId: resolved.chainId, isConnecting: false, error: null }));
      await fetchBalanceInternal(firstAccount, resolved.wc);

      if (resolved.chainId !== MAINNET_CHAIN_ID) {
        setState(s => ({ ...s, error: t(`Please switch to ${TARGET_NETWORK_NAME}.`, `请切换到 ${TARGET_NETWORK_NAME}。`) }));
      }
    } catch (err: unknown) {
      const raw = err as { message?: string };
      const msg = (raw?.message || '').toLowerCase();

      if (msg.includes('please call connect() before request()')) {
        wcProviderRef.current?.disconnect?.().catch(() => {
          // noop
        });
        wcProviderRef.current = null;
        setState(s => ({ ...s, isConnecting: false, error: t('WalletConnect session reset. Please tap connect again.', 'WalletConnect 会话已重置，请再次点击连接。') }));
        return;
      }

      if (msg.includes('walletconnect is not configured')) {
        setState(s => ({ ...s, isConnecting: false, error: t('WalletConnect is temporarily unavailable in this deployment. Use injected wallet or open in wallet app.', '当前部署暂不可用 WalletConnect。请使用注入钱包或在钱包应用中打开。') }));
      } else {
        setState(s => ({ ...s, isConnecting: false, error: friendlyWalletError(err, t) }));
      }
    }
  }, [fetchBalanceInternal, t, walletConnectProjectId]);

  const disconnect = useCallback(() => {
    try {
      window.localStorage.setItem(WALLET_DISCONNECTED_KEY, '1');
    } catch {
      // ignore storage errors
    }

    wcProviderRef.current?.disconnect?.().catch(() => {
      // noop
    });

    setState({ address: null, ethBalance: null, pufEthBalance: null, chainId: null, isConnecting: false, error: null });
    setActiveProvider(null);
    setActiveWalletName(null);
  }, []);

  const switchToMainnet = useCallback(async () => {
    const provider = activeProvider || (window.ethereum as InjectedProvider | undefined);
    if (!provider) return;

    const targetChain = MAINNET_CHAIN_ID.toLowerCase();
    const isHolesky = targetChain === '0x4268';
    const isHoodi = targetChain === '0x88b30';

    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: MAINNET_CHAIN_ID }],
      });
      setState(s => ({ ...s, error: null, chainId: MAINNET_CHAIN_ID }));
      if (state.address) await fetchBalanceInternal(state.address, provider);
    } catch (err: unknown) {
      const raw = err as { code?: number };

      if (raw?.code === 4902) {
        try {
          const addParams = isHolesky
            ? {
                chainId: '0x4268',
                chainName: 'Holesky',
                nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
                rpcUrls: ['https://ethereum-holesky-rpc.publicnode.com'],
                blockExplorerUrls: ['https://holesky.etherscan.io'],
              }
            : isHoodi
              ? {
                  chainId: '0x88b30',
                  chainName: 'Hoodi',
                  nativeCurrency: { name: 'Hoodi Ether', symbol: 'ETH', decimals: 18 },
                  rpcUrls: ['https://ethereum-hoodi-rpc.publicnode.com'],
                  blockExplorerUrls: ['https://hoodi.etherscan.io'],
                }
              : {
                  chainId: '0xaa36a7',
                  chainName: 'Sepolia',
                  nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
                  rpcUrls: ['https://ethereum-sepolia-rpc.publicnode.com'],
                  blockExplorerUrls: ['https://sepolia.etherscan.io'],
                };

          await provider.request({ method: 'wallet_addEthereumChain', params: [addParams] });
          await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: MAINNET_CHAIN_ID }] });

          setState(s => ({ ...s, error: null, chainId: MAINNET_CHAIN_ID }));
          if (state.address) await fetchBalanceInternal(state.address, provider);
          return;
        } catch (addErr: unknown) {
          setState(s => ({ ...s, error: friendlyWalletError(addErr, t) }));
          return;
        }
      }

      setState(s => ({ ...s, error: friendlyWalletError(err, t) }));
    }
  }, [activeProvider, fetchBalanceInternal, state.address, t]);

  useEffect(() => {
    if (!window.ethereum) return;

    const discovered = getInjectedProviders();
    const seen = new Set<string>();
    const options: WalletOption[] = [];
    discovered.forEach((p, idx) => {
      const name = providerName(p);
      if (seen.has(name)) return;
      seen.add(name);
      options.push({ id: `${name}-${idx}`, name });
    });
    setWallets(options);

    const provider = activeProvider || discovered[0];
    if (!provider) return;

    const bootstrap = async () => {
      try {
        const manuallyDisconnected = window.localStorage.getItem(WALLET_DISCONNECTED_KEY) === '1';
        const chainId = (await provider.request({ method: 'eth_chainId' })) as string;

        if (manuallyDisconnected) {
          setState(s => ({ ...s, chainId }));
          return;
        }

        const accounts = (await provider.request({ method: 'eth_accounts' })) as string[];

        if (accounts?.length) {
          setActiveProvider(provider);
          setActiveWalletName(providerName(provider));
          setState(s => ({
            ...s,
            address: accounts[0],
            chainId,
            error: chainId !== MAINNET_CHAIN_ID ? t(`Please switch to ${TARGET_NETWORK_NAME}.`, `请切换到 ${TARGET_NETWORK_NAME}。`) : null,
          }));
          await fetchBalanceInternal(accounts[0], provider);
        } else {
          setState(s => ({ ...s, chainId }));
        }
      } catch {
        // ignore bootstrap errors from wallet provider
      }
    };

    bootstrap();

    const onAccounts = (accounts: unknown) => {
      const list = accounts as string[];
      if (list.length === 0) disconnect();
      else {
        const manuallyDisconnected = window.localStorage.getItem(WALLET_DISCONNECTED_KEY) === '1';
        if (manuallyDisconnected) return;
        setState(s => ({ ...s, address: list[0] }));
        fetchBalanceInternal(list[0], provider);
      }
    };

    const onChain = (chainId: unknown) => {
      const nextChain = chainId as string;
      setState(s => ({
        ...s,
        chainId: nextChain,
        error: nextChain !== MAINNET_CHAIN_ID ? t(`Please switch to ${TARGET_NETWORK_NAME}.`, `请切换到 ${TARGET_NETWORK_NAME}。`) : null,
      }));
    };

    provider.on?.('accountsChanged', onAccounts);
    provider.on?.('chainChanged', onChain);

    return () => {
      provider.removeListener?.('accountsChanged', onAccounts);
      provider.removeListener?.('chainChanged', onChain);
    };
  }, [activeProvider, disconnect, fetchBalanceInternal, t]);

  useEffect(() => {
    if (hasAutoConnectedRef.current) return;
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const shouldAutoConnect = params.get('autoconnect') === '1';
    if (!shouldAutoConnect) return;

    hasAutoConnectedRef.current = true;

    const run = async () => {
      try {
        const manuallyDisconnected = window.localStorage.getItem(WALLET_DISCONNECTED_KEY) === '1';
        if (manuallyDisconnected) return;

        await connect();
      } finally {
        params.delete('autoconnect');
        const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}${window.location.hash}`;
        window.history.replaceState({}, '', next);
      }
    };

    run();
  }, [connect]);

  const isMainnet = state.chainId === MAINNET_CHAIN_ID;

  return { ...state, walletConnectEnabled, connect, connectWalletConnect, disconnect, fetchBalance, switchToMainnet, isMainnet, wallets, activeWalletName };
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const wallet = useWalletController();
  return <WalletContext.Provider value={wallet}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) throw new Error('useWallet must be used within WalletProvider');
  return context;
}
