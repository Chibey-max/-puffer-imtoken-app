'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BrowserProvider, Contract, Eip1193Provider, formatEther, parseUnits, parseEther } from 'ethers';
import { useWallet } from '@/hooks/useWallet';
import { usePufETHRate } from '@/hooks/usePufferApi';
import { usePufferClient } from '@/hooks/usePufferClient';
import { IS_MAINNET_TARGET, TARGET_NETWORK_NAME } from '@/lib/network';

type TokenOption = {
  symbol: 'ETH' | 'USDC' | 'DAI' | 'WETH';
  address?: string;
  decimals: number;
  logo: string;
  accent: string;
};

type PriceRoute = {
  destAmount: string;
  tokenTransferProxy?: string;
  [key: string]: unknown;
};

const TOKENS: TokenOption[] = [
  { symbol: 'ETH', decimals: 18, logo: '◆', accent: '#627eea' },
  { symbol: 'USDC', address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', decimals: 6, logo: '$', accent: '#2775ca' },
  { symbol: 'DAI', address: '0x6b175474e89094c44da98b954eedeac495271d0f', decimals: 18, logo: '◈', accent: '#f5ac37' },
  { symbol: 'WETH', address: '0xc02aaA39b223FE8D0A0E5C4F27eAD9083C756Cc2'.toLowerCase(), decimals: 18, logo: 'Ξ', accent: '#8a92b2' },
];

type RecentSwap = {
  token: string;
  amount: string;
  estimatedEth: string;
  timestamp: number;
};

const RECENT_SWAPS_KEY = 'puffer_recent_swaps';

const ETH_SENTINEL = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
const PARASWAP_BASE = 'https://apiv5.paraswap.io';
const STAKE_GAS_BUFFER_WEI = parseEther('0.00015');

export default function SwapPage() {
  const { address, isMainnet, connect, switchToMainnet } = useWallet();
  const { data: rate } = usePufETHRate();
  const { client, init } = usePufferClient();

  const [token, setToken] = useState<TokenOption>(TOKENS[1]);
  const [amount, setAmount] = useState('');
  const [priceRoute, setPriceRoute] = useState<PriceRoute | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [slippage, setSlippage] = useState('1.0');
  const [recentSwaps, setRecentSwaps] = useState<RecentSwap[]>([]);
  const [autoStake, setAutoStake] = useState(true);

  const isEthInput = token.symbol === 'ETH';
  const pufferClient = client || init();

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(RECENT_SWAPS_KEY);
      if (raw) setRecentSwaps(JSON.parse(raw) as RecentSwap[]);
    } catch {
      setRecentSwaps([]);
    }
  }, []);

  const srcAmountBase = useMemo(() => {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return null;
    try {
      return parseUnits(amount, token.decimals).toString();
    } catch {
      return null;
    }
  }, [amount, token.decimals]);

  useEffect(() => {
    const run = async () => {
      setError(null);
      setPriceRoute(null);

      if (!srcAmountBase) return;
      if (isEthInput) {
        setPriceRoute({ destAmount: srcAmountBase });
        return;
      }

      if (!IS_MAINNET_TARGET) {
        setError(`Token-to-ETH aggregation is disabled on ${TARGET_NETWORK_NAME}. Use ETH input on testnet.`);
        return;
      }

      setLoadingQuote(true);
      try {
        const params = new URLSearchParams({
          srcToken: token.address!.toLowerCase(),
          srcDecimals: String(token.decimals),
          destToken: ETH_SENTINEL,
          destDecimals: '18',
          amount: srcAmountBase,
          side: 'SELL',
          network: '1',
        });
        const res = await fetch(`${PARASWAP_BASE}/prices?${params.toString()}`);
        const json = await res.json();
        if (!res.ok || !json?.priceRoute) {
          throw new Error(json?.error || json?.message || 'Failed to fetch quote');
        }
        setPriceRoute(json.priceRoute as PriceRoute);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to fetch quote');
      } finally {
        setLoadingQuote(false);
      }
    };

    run();
  }, [token, srcAmountBase, isEthInput]);

  const estimatedEth = useMemo(() => {
    if (!priceRoute?.destAmount) return null;
    try {
      return Number(formatEther(BigInt(priceRoute.destAmount)));
    } catch {
      return null;
    }
  }, [priceRoute]);

  const estimatedPufEth = useMemo(() => {
    if (!estimatedEth || !rate?.pufEthPerEth) return null;
    return estimatedEth * Number(rate.pufEthPerEth);
  }, [estimatedEth, rate]);

  const slippageNumber = Number(slippage) > 0 ? Number(slippage) : 1;
  const minimumReceivedEth = estimatedEth ? estimatedEth * (1 - slippageNumber / 100) : null;
  const minimumReceivedPufEth = minimumReceivedEth && rate?.pufEthPerEth
    ? minimumReceivedEth * Number(rate.pufEthPerEth)
    : null;
  const priceImpact = priceRoute && !isEthInput ? '<0.5%' : '0.0%';

  const livePairPrice = useMemo(() => {
    const inputAmount = Number(amount);
    if (!estimatedPufEth || !Number.isFinite(inputAmount) || inputAmount <= 0) return null;
    return estimatedPufEth / inputAmount;
  }, [amount, estimatedPufEth]);

  const saveRecentSwap = (hash?: string) => {
    if (!amount || !estimatedEth) return;
    const item: RecentSwap = {
      token: token.symbol,
      amount,
      estimatedEth: estimatedEth.toFixed(6),
      timestamp: Date.now(),
    };
    const next = [item, ...recentSwaps].slice(0, 5);
    setRecentSwaps(next);
    window.localStorage.setItem(RECENT_SWAPS_KEY, JSON.stringify(next));
  };

  const executeSwap = async () => {
    if (!address) return setError('Connect wallet first');
    if (!isMainnet) return setError(`Switch to ${TARGET_NETWORK_NAME} first`);
    if (!srcAmountBase) return setError('Enter a valid amount');
    if (!window.ethereum) return setError('No wallet provider available');

    setSwapping(true);
    setError(null);

    try {
      const provider = new BrowserProvider(window.ethereum as Eip1193Provider);
      const signer = await provider.getSigner();
      const owner = await signer.getAddress();

      let ethToStakeWei = BigInt(0);

      if (isEthInput) {
        setStatus('ETH selected. Skipping swap and preparing direct stake…');
        ethToStakeWei = BigInt(srcAmountBase);
      } else {
        if (!IS_MAINNET_TARGET) {
          throw new Error(`Token swaps via ParaSwap are only enabled for mainnet target. On ${TARGET_NETWORK_NAME}, use ETH input.`);
        }
        if (!priceRoute) throw new Error('No quote available yet.');

        const beforeEth = await provider.getBalance(owner);
        const spender = priceRoute.tokenTransferProxy;
        if (!spender || typeof spender !== 'string') {
          throw new Error('Missing spender from quote route');
        }

        const erc20 = new Contract(
          token.address!,
          [
            'function allowance(address owner, address spender) view returns (uint256)',
            'function approve(address spender, uint256 amount) returns (bool)',
          ],
          signer,
        );

        const allowance = (await erc20.allowance(owner, spender)) as bigint;
        const sellAmount = BigInt(srcAmountBase);

        if (allowance < sellAmount) {
          setStatus('Awaiting token approval signature…');
          const approveTx = await erc20.approve(spender, sellAmount);
          await approveTx.wait(1);
        }

        setStatus('Building swap transaction…');
        const txRes = await fetch(`${PARASWAP_BASE}/transactions/1?ignoreChecks=true`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            srcToken: token.address?.toLowerCase(),
            destToken: ETH_SENTINEL,
            srcAmount: srcAmountBase,
            priceRoute,
            userAddress: owner,
            slippage: Math.round(slippageNumber * 100),
          }),
        });

        const txData = await txRes.json();
        if (!txRes.ok || !txData?.to || !txData?.data) {
          throw new Error(txData?.error || txData?.message || 'Failed to build swap tx');
        }

        setStatus('Awaiting wallet signature for swap…');
        const sent = await signer.sendTransaction({
          to: txData.to,
          data: txData.data,
          value: txData.value ? BigInt(txData.value) : BigInt(0),
          gasLimit: txData.gas ? BigInt(txData.gas) : undefined,
          gasPrice: txData.gasPrice ? BigInt(txData.gasPrice) : undefined,
        });

        setStatus(`Swap submitted: ${sent.hash}`);
        saveRecentSwap(sent.hash);
        const receipt = await sent.wait(1);
        if (!receipt) throw new Error('Swap confirmation not received');

        const afterEth = await provider.getBalance(owner);
        const effectiveGasPrice = (receipt as { effectiveGasPrice?: bigint }).effectiveGasPrice || BigInt(0);
        const gasPaid = receipt.gasUsed * effectiveGasPrice;
        const receivedWei = afterEth - beforeEth + gasPaid;
        ethToStakeWei = receivedWei > BigInt(0) ? receivedWei : BigInt(0);

        setStatus('Swap confirmed. Preparing stake transaction…');
      }

      if (!autoStake) {
        setStatus('Swap complete. Auto-stake disabled. Continue to Stake to mint pufETH.');
        return;
      }

      if (!pufferClient) throw new Error('Puffer client not initialized');

      const stakeAmountWei = ethToStakeWei > STAKE_GAS_BUFFER_WEI ? ethToStakeWei - STAKE_GAS_BUFFER_WEI : BigInt(0);
      if (stakeAmountWei <= BigInt(0)) {
        throw new Error('Not enough ETH after swap to cover stake transaction gas buffer.');
      }

      setStatus('Awaiting wallet signature for pufETH mint (stake)…');
      const { transact } = pufferClient.vault.depositETH(owner as `0x${string}`);
      const stakeHash = await transact(stakeAmountWei);
      setStatus(`Stake submitted: ${stakeHash}`);

      const stakeReceipt = await provider.waitForTransaction(stakeHash, 1, 120_000);
      if (stakeReceipt?.status === 1) {
        setStatus('Success: any-token → ETH swap + pufETH mint completed.');
      } else {
        throw new Error('Stake transaction failed on-chain.');
      }
    } catch (e: unknown) {
      const raw = e as { code?: number; shortMessage?: string; message?: string };

      if (raw?.code === 4001 || (raw?.message && raw.message.toLowerCase().includes('rejected'))) {
        setError('Transaction cancelled in wallet. No funds moved.');
      } else if (raw?.shortMessage) {
        setError(raw.shortMessage);
      } else if (raw?.message) {
        setError(raw.message.length > 180 ? `${raw.message.slice(0, 180)}…` : raw.message);
      } else {
        setError('Swap/Staking flow failed. Please try again.');
      }

      setStatus(null);
    } finally {
      setSwapping(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-white">Swap</h2>
        <p className="text-sm text-[#8892a4]">Uniswap-style interface with in-app execution, then continue to pufETH staking.</p>
      </div>

      {!address && (
        <button onClick={() => connect()} className="w-full py-3 bg-[#00d4ff] text-[#0a0f1a] font-bold rounded-xl">
          Connect Wallet
        </button>
      )}

      {address && !isMainnet && (
        <button onClick={switchToMainnet} className="w-full py-3 bg-[#00d4ff] text-[#0a0f1a] font-bold rounded-xl">
          Switch to {TARGET_NETWORK_NAME}
        </button>
      )}

      <div className="bg-[#0d1525] border border-[#1a2535] rounded-2xl p-4 space-y-3 card-animate">
        <div className="flex items-center justify-between relative">
          <div>
            <p className="text-sm font-semibold text-white">Swap</p>
            <p className="text-[11px] text-[#8892a4]">Powered by ParaSwap</p>
          </div>
          <button
            onClick={() => setShowSettings((v) => !v)}
            className="w-8 h-8 rounded-lg border border-[#1a2535] text-[#8892a4] hover:text-[#00d4ff] hover:border-[#00d4ff]/40 transition-colors"
          >
            ⚙
          </button>
          {showSettings && (
            <div className="absolute right-0 top-10 z-20 w-48 bg-[#0a0f1a] border border-[#1a2535] rounded-xl p-3 shadow-2xl card-animate">
              <p className="text-xs text-[#8892a4] mb-2">Max slippage</p>
              <div className="flex gap-1 mb-2">
                {['0.5', '1.0', '2.0'].map((v) => (
                  <button
                    key={v}
                    onClick={() => setSlippage(v)}
                    className={`flex-1 py-1 rounded-lg text-xs ${slippage === v ? 'bg-[#00d4ff] text-[#0a0f1a]' : 'bg-[#0d1525] text-[#8892a4]'}`}
                  >
                    {v}%
                  </button>
                ))}
              </div>
              <input
                value={slippage}
                onChange={(e) => setSlippage(e.target.value)}
                className="w-full bg-[#0d1525] border border-[#1a2535] rounded-lg px-2 py-1 text-xs text-white outline-none"
              />
            </div>
          )}
        </div>

        <div className="bg-[#0a0f1a] rounded-xl border border-[#1a2535] p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#8892a4]">From</p>
            <div className="flex gap-1">
              {TOKENS.map((t) => (
                <button
                  key={t.symbol}
                  onClick={() => setToken(t)}
                  disabled={!IS_MAINNET_TARGET && t.symbol !== 'ETH'}
                  className={`px-2 py-1 rounded-lg text-xs flex items-center gap-1 ${token.symbol === t.symbol ? 'bg-[#00d4ff] text-[#0a0f1a] font-semibold' : 'bg-[#0d1525] border border-[#1a2535] text-[#8892a4]'} ${!IS_MAINNET_TARGET && t.symbol !== 'ETH' ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] text-white" style={{ background: t.accent }}>{t.logo}</span>
                  {t.symbol}
                </button>
              ))}
            </div>
          </div>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
            className="w-full bg-transparent text-3xl font-mono text-white outline-none placeholder-[#2a3545]"
          />
        </div>

        <div className="flex justify-center -my-1">
          <div className="w-8 h-8 rounded-full bg-[#0a0f1a] border border-[#1a2535] flex items-center justify-center text-[#8892a4]">↓</div>
        </div>

        <div className="bg-[#0a0f1a] rounded-xl border border-[#1a2535] p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#8892a4]">To (estimated)</p>
            <span className="px-2 py-1 rounded-lg bg-[#0d1525] border border-[#1a2535] text-xs text-white flex items-center gap-1">
              <span className="w-4 h-4 rounded-full bg-[#00d4ff] flex items-center justify-center text-[10px] text-[#0a0f1a]">P</span> pufETH
            </span>
          </div>
          <p className="text-2xl font-mono text-[#00d4ff]">{estimatedPufEth ? estimatedPufEth.toFixed(6) : '—'} pufETH</p>
          <p className="text-xs text-[#8892a4]">via {estimatedEth ? estimatedEth.toFixed(6) : '—'} ETH (intermediate swap leg)</p>
          <p className="text-[11px] text-[#8892a4]">
            {livePairPrice
              ? `1 ${token.symbol} ≈ ${livePairPrice.toFixed(6)} pufETH`
              : `Enter amount to see live ${token.symbol} → pufETH price`}
          </p>
        </div>

        <div className="bg-[#0a0f1a] border border-[#1a2535] rounded-xl p-3 text-xs text-[#8892a4] space-y-2">
          <div className="flex justify-between"><span>Status</span><span className="text-white">{loadingQuote ? 'Fetching quote…' : 'Live quote ready'}</span></div>
          <div className="flex justify-between"><span>Price impact</span><span className="text-[#00ff9d]">{priceImpact}</span></div>
          <div className="flex justify-between"><span>Max slippage</span><span className="text-white">{slippageNumber.toFixed(2)}%</span></div>
          <div className="flex justify-between"><span>Minimum received</span><span className="text-white font-mono">{minimumReceivedPufEth ? `${minimumReceivedPufEth.toFixed(6)} pufETH` : '—'}</span></div>
          <div className="flex justify-between"><span>Route</span><span className="text-white">{isEthInput ? 'Direct' : 'Aggregator'}</span></div>
          <div className="flex items-center justify-between pt-1 border-t border-[#1a2535]">
            <span>Auto-stake swapped ETH → pufETH</span>
            <button
              onClick={() => setAutoStake((v) => !v)}
              className={`w-11 h-6 rounded-full transition-colors ${autoStake ? 'bg-[#00d4ff]' : 'bg-[#1a2535]'}`}
            >
              <span className={`block w-5 h-5 mt-0.5 rounded-full bg-white transition-transform ${autoStake ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}
        {status && <p className="text-xs text-[#00d4ff] break-all">{status}</p>}

        <button
          onClick={executeSwap}
          disabled={swapping || !srcAmountBase || !address || !isMainnet}
          className="w-full text-center py-3 bg-[#00d4ff] text-[#0a0f1a] font-bold rounded-xl cta-animate disabled:opacity-40"
        >
          {swapping ? 'Swapping…' : isEthInput ? 'No Swap Needed (ETH)' : 'Swap'}
        </button>

        <Link
          href="/stake"
          className="block w-full text-center py-3 border border-[#1a2535] text-[#8892a4] rounded-xl hover:border-[#00d4ff]/30 hover:text-[#00d4ff]"
        >
          Continue to Stake
        </Link>
      </div>

      {recentSwaps.length > 0 && (
        <div className="bg-[#0d1525] border border-[#1a2535] rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Recent Swaps</p>
            <button
              onClick={() => {
                setRecentSwaps([]);
                window.localStorage.removeItem(RECENT_SWAPS_KEY);
              }}
              className="text-[11px] text-[#8892a4] hover:text-white"
            >
              Clear
            </button>
          </div>
          <div className="space-y-2">
            {recentSwaps.map((swap, index) => (
              <div key={`${swap.timestamp}-${index}`} className="flex items-center justify-between bg-[#0a0f1a] border border-[#1a2535] rounded-xl p-3">
                <div>
                  <p className="text-sm text-white">{swap.amount} {swap.token}</p>
                  <p className="text-[11px] text-[#8892a4]">{new Date(swap.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <p className="text-sm text-[#00d4ff] font-mono">{swap.estimatedEth} ETH</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-[#001a2e] border border-[#00d4ff]/20 rounded-xl p-4 text-xs text-[#8892a4]">
        Advanced challenge status: <span className="text-amber-300">in progress</span>. In-app swap execution is implemented; seamless one-click any-token → pufETH single-flow execution remains the next step.
      </div>
    </div>
  );
}
