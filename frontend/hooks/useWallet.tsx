'use client';
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { BrowserProvider, formatEther, Eip1193Provider, Contract } from 'ethers';
import { ADDRESSES } from '@/lib/puffer';
import { TARGET_CHAIN_ID, TARGET_NETWORK_NAME } from '@/lib/network';

type InjectedProvider = Eip1193Provider & {
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
  isMetaMask?: boolean;
  isRabby?: boolean;
  isCoinbaseWallet?: boolean;
  isTrust?: boolean;
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

interface WalletContextValue extends WalletState {
  isMainnet: boolean;
  activeWalletName: string | null;
  connect: (walletId?: string) => Promise<void>;
  disconnect: () => void;
  fetchBalance: (addr: string) => Promise<void>;
  switchToMainnet: () => Promise<void>;
  wallets: WalletOption[];
}

const MAINNET_CHAIN_ID = TARGET_CHAIN_ID;
const CONNECT_TIMEOUT_MS = 20000;
const WALLET_DISCONNECTED_KEY = 'puffer_wallet_disconnected';

const WalletContext = createContext<WalletContextValue | null>(null);

function providerName(p: InjectedProvider): string {
  if (p.isRabby) return 'Rabby';
  if (p.isCoinbaseWallet) return 'Coinbase Wallet';
  if (p.isTrust) return 'Trust Wallet';
  if (p.isMetaMask) return 'MetaMask';
  return 'Injected Wallet';
}

function getInjectedProviders(): InjectedProvider[] {
  const eth = window.ethereum as EthereumWithProviders | undefined;
  if (!eth) return [];
  if (Array.isArray(eth.providers) && eth.providers.length) return eth.providers;
  return [eth];
}

function useWalletController(): WalletContextValue {
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
    const available = getInjectedProviders();
    if (!available.length) {
      setState(s => ({ ...s, error: 'No wallet detected. Install or open any EVM wallet extension/app (Rabby, MetaMask, Coinbase, Trust, imToken).' }));
      return;
    }

    const selected = walletId
      ? available.find((p, idx) => `${providerName(p)}-${idx}` === walletId) || available[0]
      : available[0];

    setActiveProvider(selected);
    setActiveWalletName(providerName(selected));
    setState(s => ({ ...s, isConnecting: true, error: null }));

    try {
      const requestPromise = selected.request({ method: 'eth_requestAccounts' }) as Promise<string[]>;
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Wallet approval timed out. Open your wallet extension/app, approve, then retry.')), CONNECT_TIMEOUT_MS);
      });

      const accounts = await Promise.race([requestPromise, timeoutPromise]);
      const chainId = (await selected.request({ method: 'eth_chainId' })) as string;
      const address = accounts[0];

      if (!address) {
        throw new Error('No account returned by wallet. Please unlock wallet and retry.');
      }

      setState(s => ({ ...s, address, chainId, isConnecting: false }));
      await fetchBalanceInternal(address, selected);

      if (chainId !== MAINNET_CHAIN_ID) {
        setState(s => ({ ...s, error: `Please switch to ${TARGET_NETWORK_NAME}.` }));
      }
    } catch (err: unknown) {
      const anyErr = err as { code?: number; message?: string };
      if (anyErr?.code === 4001) {
        setState(s => ({ ...s, isConnecting: false, error: 'Connection request was rejected in wallet.' }));
        return;
      }

      const message = err instanceof Error ? err.message : 'Connection failed';
      setState(s => ({ ...s, isConnecting: false, error: message }));
    }
  }, [fetchBalanceInternal]);

  const disconnect = useCallback(() => {
    try {
      window.localStorage.setItem(WALLET_DISCONNECTED_KEY, '1');
    } catch {
      // ignore storage errors
    }
    setState({ address: null, ethBalance: null, pufEthBalance: null, chainId: null, isConnecting: false, error: null });
    setActiveProvider(null);
    setActiveWalletName(null);
  }, []);

  const switchToMainnet = useCallback(async () => {
    const provider = activeProvider || (window.ethereum as InjectedProvider | undefined);
    if (!provider) return;
    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: MAINNET_CHAIN_ID }],
      });
      setState(s => ({ ...s, error: null, chainId: MAINNET_CHAIN_ID }));
      if (state.address) await fetchBalanceInternal(state.address, provider);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to switch network';
      setState(s => ({ ...s, error: message }));
    }
  }, [activeProvider, fetchBalanceInternal, state.address]);

  useEffect(() => {
    if (!window.ethereum) return;

    const discovered = getInjectedProviders();
    const options = discovered.map((p, idx) => ({ id: `${providerName(p)}-${idx}`, name: providerName(p) }));
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
            error: chainId !== MAINNET_CHAIN_ID ? `Please switch to ${TARGET_NETWORK_NAME}.` : null,
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
        error: nextChain !== MAINNET_CHAIN_ID ? `Please switch to ${TARGET_NETWORK_NAME}.` : null,
      }));
    };

    provider.on?.('accountsChanged', onAccounts);
    provider.on?.('chainChanged', onChain);

    return () => {
      provider.removeListener?.('accountsChanged', onAccounts);
      provider.removeListener?.('chainChanged', onChain);
    };
  }, [activeProvider, disconnect, fetchBalanceInternal]);

  const isMainnet = state.chainId === MAINNET_CHAIN_ID;

  return { ...state, connect, disconnect, fetchBalance, switchToMainnet, isMainnet, wallets, activeWalletName };
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
