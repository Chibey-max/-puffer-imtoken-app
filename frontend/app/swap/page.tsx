'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BrowserProvider, Contract, Eip1193Provider, formatEther, parseUnits, parseEther } from 'ethers';
import { useWallet } from '@/hooks/useWallet';
import { usePufETHRate } from '@/hooks/usePufferApi';
import { usePufferClient } from '@/hooks/usePufferClient';
import { TARGET_NETWORK_NAME } from '@/lib/network';
import { useLocale } from '@/lib/locale';
import { getChainCapabilities } from '@/lib/capabilities';
import { txExplorerUrl } from '@/lib/explorer';

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
const STAKE_GAS_BUFFER_ETH_LABEL = formatEther(STAKE_GAS_BUFFER_WEI);

export default function SwapPage() {
  const { address, isMainnet, connect, switchToMainnet, chainId } = useWallet();
  const { t } = useLocale();
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
  const [stakeMinRequiredWei, setStakeMinRequiredWei] = useState<bigint | null>(null);
  const [swapTxHash, setSwapTxHash] = useState<string | null>(null);
  const [stakeTxHash, setStakeTxHash] = useState<string | null>(null);

  const isEthInput = token.symbol === 'ETH';
  const pufferClient = client || init();
  const capabilities = getChainCapabilities(chainId);

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

  const normalizeSwapError = (rawMessage: string): string => {
    const msg = rawMessage.toLowerCase();
    if (msg.includes('insufficient liquidity') || msg.includes('no route') || msg.includes('price route')) {
      return t('No swap route found for this pair/size right now. Try a smaller amount or another token.', '当前交易对/金额暂无可用兑换路径。请尝试更小金额或其他代币。');
    }
    if (msg.includes('429') || msg.includes('rate limit')) {
      return t('Quote service is rate-limited. Please retry in a few seconds.', '报价服务触发频率限制，请稍后重试。');
    }
    if (msg.includes('network') || msg.includes('rpc') || msg.includes('failed to fetch')) {
      return t('Network/RPC issue while fetching quote. Please retry.', '获取报价时网络/RPC 异常，请重试。');
    }
    return rawMessage;
  };

  useEffect(() => {
    const run = async () => {
      setError(null);
      setPriceRoute(null);

      if (!srcAmountBase) return;
      if (isEthInput) {
        setPriceRoute({ destAmount: srcAmountBase });
        return;
      }

      if (!capabilities.canAdvancedSwapAggregator) {
        setError(t(`Token-to-ETH aggregation is currently unavailable on ${TARGET_NETWORK_NAME}. Use ETH input for live staking.`, `${TARGET_NETWORK_NAME} 当前暂不可用代币聚合兑换。请使用 ETH 进行实时质押。`));
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
        const message = e instanceof Error ? e.message : 'Failed to fetch quote';
        setError(normalizeSwapError(message));
      } finally {
        setLoadingQuote(false);
      }
    };

    run();
  }, [token, srcAmountBase, isEthInput, capabilities.canAdvancedSwapAggregator, t]);

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

  const inputAmountWei = srcAmountBase ? BigInt(srcAmountBase) : null;

  const insufficientEthForAutoStake = autoStake
    && isEthInput
    && !!inputAmountWei
    && !!stakeMinRequiredWei
    && inputAmountWei < stakeMinRequiredWei;

  const autoStakeUnsupported = autoStake && !capabilities.canStake;

  const stakeMinRequiredEthLabel = stakeMinRequiredWei ? formatEther(stakeMinRequiredWei) : null;

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

  useEffect(() => {
    let cancelled = false;

    const estimateStakeMinimum = async () => {
      if (!autoStake || !isEthInput || !address || !window.ethereum || !pufferClient) {
        if (!cancelled) setStakeMinRequiredWei(null);
        return;
      }

      try {
        const provider = new BrowserProvider(window.ethereum as Eip1193Provider);
        const signer = await provider.getSigner();
        const owner = await signer.getAddress();

        const feeData = await provider.getFeeData();
        const gasPrice = feeData.maxFeePerGas || feeData.gasPrice;
        if (!gasPrice || gasPrice <= BigInt(0)) {
          if (!cancelled) setStakeMinRequiredWei(STAKE_GAS_BUFFER_WEI);
          return;
        }

        const { estimate } = pufferClient.vault.depositETH(owner as `0x${string}`);
        const estimatedGasUnits = await estimate();
        const gasCostWei = estimatedGasUnits * gasPrice;

        // Reserve base gas buffer + one full stake tx gas cost.
        const required = STAKE_GAS_BUFFER_WEI + gasCostWei;
        if (!cancelled) setStakeMinRequiredWei(required);
      } catch {
        if (!cancelled) setStakeMinRequiredWei(STAKE_GAS_BUFFER_WEI);
      }
    };

    estimateStakeMinimum();

    return () => {
      cancelled = true;
    };
  }, [autoStake, isEthInput, address, pufferClient]);

  const executeSwap = async () => {
    if (!address) return setError(t('Connect wallet first', '请先连接钱包'));
    if (!isMainnet) return setError(t(`Switch to ${TARGET_NETWORK_NAME} first`, `请先切换到 ${TARGET_NETWORK_NAME}`));
    if (!srcAmountBase) return setError(t('Enter a valid amount', '请输入有效数量'));
    if (!window.ethereum) return setError(t('No wallet provider available', '未检测到钱包提供器'));

    // Guard unsupported chains/routes before any wallet tx prompt.
    if (autoStake && !capabilities.canStake) {
      return setError(t(
        `Auto-stake to pufETH is not available on ${TARGET_NETWORK_NAME}. Please switch to a supported network (e.g. Holesky/mainnet) or disable auto-stake.`,
        `${TARGET_NETWORK_NAME} 当前不支持自动质押为 pufETH。请切换到支持网络（如 Holesky/主网）或关闭自动质押。`,
      ));
    }

    setSwapping(true);
    setError(null);
    setSwapTxHash(null);
    setStakeTxHash(null);

    try {
      const provider = new BrowserProvider(window.ethereum as Eip1193Provider);
      const signer = await provider.getSigner();
      const owner = await signer.getAddress();

      let ethToStakeWei = BigInt(0);

      if (isEthInput) {
        setStatus(t('ETH selected. Skipping swap and preparing direct stake…', '已选择 ETH。跳过兑换并准备直接质押…'));
        ethToStakeWei = BigInt(srcAmountBase);
      } else {
        if (!capabilities.canAdvancedSwapAggregator) {
          throw new Error(t(`Token swaps via ParaSwap are only enabled for mainnet target. On ${TARGET_NETWORK_NAME} use ETH input.`, `ParaSwap 代币兑换当前仅支持主网目标。${TARGET_NETWORK_NAME} 请使用 ETH 输入。`));
        }
        if (!priceRoute) throw new Error(t('No quote available yet.', '暂无可用报价。'));

        const beforeEth = await provider.getBalance(owner);
        const spender = priceRoute.tokenTransferProxy;
        if (!spender || typeof spender !== 'string') {
          throw new Error(t('Missing spender from quote route', '报价路径缺少授权目标地址'));
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
          setStatus(t('Awaiting token approval signature…', '等待代币授权签名…'));
          const approveTx = await erc20.approve(spender, sellAmount);
          await approveTx.wait(1);
        }

        setStatus(t('Building swap transaction…', '正在构建兑换交易…'));
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
          throw new Error(txData?.error || txData?.message || t('Failed to build swap transaction', '构建兑换交易失败'));
        }

        setStatus(t('Awaiting wallet signature for swap…', '等待钱包签名兑换交易…'));
        const sent = await signer.sendTransaction({
          to: txData.to,
          data: txData.data,
          value: txData.value ? BigInt(txData.value) : BigInt(0),
          gasLimit: txData.gas ? BigInt(txData.gas) : undefined,
          gasPrice: txData.gasPrice ? BigInt(txData.gasPrice) : undefined,
        });

        setStatus(t(`Swap submitted: ${sent.hash}`, `兑换已提交：${sent.hash}`));
        setSwapTxHash(sent.hash);
        saveRecentSwap(sent.hash);
        const receipt = await sent.wait(1);
        if (!receipt) throw new Error(t('Swap confirmation not received', '未收到兑换确认'));

        const afterEth = await provider.getBalance(owner);
        const effectiveGasPrice = (receipt as { effectiveGasPrice?: bigint }).effectiveGasPrice || BigInt(0);
        const gasPaid = receipt.gasUsed * effectiveGasPrice;
        const receivedWei = afterEth - beforeEth + gasPaid;
        ethToStakeWei = receivedWei > BigInt(0) ? receivedWei : BigInt(0);

        setStatus(t('Swap confirmed. Preparing stake transaction…', '兑换已确认。正在准备质押交易…'));
      }

      if (!autoStake) {
        setStatus(t('Swap complete. Auto-stake disabled. Continue to Stake to mint pufETH.', '兑换完成。自动质押已关闭。请前往 Stake 铸造 pufETH。'));
        return;
      }

      if (!pufferClient) throw new Error(t('Puffer client not initialized', 'Puffer 客户端未初始化'));

      const stakeAmountWei = ethToStakeWei > STAKE_GAS_BUFFER_WEI ? ethToStakeWei - STAKE_GAS_BUFFER_WEI : BigInt(0);
      if (stakeAmountWei <= BigInt(0)) {
        if (isEthInput) {
          const minLabel = stakeMinRequiredEthLabel || STAKE_GAS_BUFFER_ETH_LABEL;
          throw new Error(t(`ETH amount too small for auto-stake. Enter at least ${minLabel} ETH to cover gas + buffer.`, `ETH 数量过小，无法自动质押。请至少输入 ${minLabel} ETH 以覆盖 Gas 与预留。`));
        }
        throw new Error(t('Not enough ETH after swap to cover stake transaction gas buffer.', '兑换后 ETH 不足，无法覆盖质押交易 Gas 预留。'));
      }

      setStatus(t('Awaiting wallet signature for pufETH mint (stake)…', '等待钱包签名铸造 pufETH（质押）…'));
      const { transact } = pufferClient.vault.depositETH(owner as `0x${string}`);
      const stakeHash = await transact(stakeAmountWei);
      setStakeTxHash(stakeHash);
      setStatus(t(`Stake submitted: ${stakeHash}`, `质押已提交：${stakeHash}`));

      const stakeReceipt = await provider.waitForTransaction(stakeHash, 1, 120_000);
      if (stakeReceipt?.status === 1) {
        setStatus(t('Success: any-token → ETH swap + pufETH mint completed.', '成功：任意代币 → ETH 兑换 + pufETH 铸造已完成。'));
      } else {
        throw new Error(t('Stake transaction failed on-chain.', '质押交易在链上执行失败。'));
      }
    } catch (e: unknown) {
      const raw = e as { code?: number; shortMessage?: string; message?: string };

      const lowMsg = (raw?.shortMessage || raw?.message || '').toLowerCase();
      if (raw?.code === 4001 || (raw?.message && raw.message.toLowerCase().includes('rejected'))) {
        setError(t('Transaction cancelled in wallet. No funds moved.', '交易已在钱包中取消，资金未发生变动。'));
      } else if (lowMsg.includes('insufficient funds') || lowMsg.includes('gas * price + value') || lowMsg.includes('intrinsic gas too low')) {
        const minLabel = stakeMinRequiredEthLabel || STAKE_GAS_BUFFER_ETH_LABEL;
        setError(t(`Insufficient ETH for stake value + network gas. Increase input amount (about ${minLabel} ETH minimum in current conditions).`, `ETH 不足以支付质押金额与网络 Gas。请增加输入数量（当前条件下建议至少 ${minLabel} ETH）。`));
      } else if (raw?.shortMessage) {
        setError(normalizeSwapError(raw.shortMessage));
      } else if (raw?.message) {
        const trimmed = raw.message.length > 180 ? `${raw.message.slice(0, 180)}…` : raw.message;
        setError(normalizeSwapError(trimmed));
      } else {
        setError(t('Swap/Staking flow failed. Please try again.', '兑换/质押流程失败，请重试。'));
      }

      setStatus(null);
    } finally {
      setSwapping(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="dex-card rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#7f98ba]">DEX Router</p>
            <h2 className="text-[22px] leading-none font-black text-white mt-1">{t('Swap → Stake', '兑换 → 质押')}</h2>
          </div>
          <span className="text-[10px] px-2.5 py-1 rounded-full border border-[#2a3f5d] text-[#9eb4cf] bg-[#0f1a2b]">
            {isEthInput ? t('Direct', '直接') : t('Aggregator', '聚合器')}
          </span>
        </div>

        <p className="text-[13px] leading-relaxed text-[#90a8c6]">
          {t('Route token to ETH, then mint ', '将代币路由到 ETH，然后在一体化流程中铸造 ')}<span className="text-[#6fd7ff] font-semibold">pufETH</span>{t(' in one guided flow.', '。')}
        </p>
      </section>

      {!address && (
        <button onClick={() => connect()} className="w-full py-3 bg-[#00d4ff] text-[#0a0f1a] font-bold rounded-xl">
          {t('Connect Wallet', '连接钱包')}
        </button>
      )}

      {address && !isMainnet && (
        <button onClick={switchToMainnet} className="w-full py-3 bg-[#00d4ff] text-[#0a0f1a] font-bold rounded-xl">
          {t(`Switch to ${TARGET_NETWORK_NAME}`, `切换到 ${TARGET_NETWORK_NAME}`)}
        </button>
      )}

      <div className="dex-card p-4 space-y-3 card-animate">
        <div className="flex items-center justify-between relative">
          <div>
            <p className="text-sm font-semibold text-white">{t('Swap', '兑换')}</p>
            <p className="text-[11px] text-[#8892a4]">{t('Powered by ParaSwap', '由 ParaSwap 提供')}</p>
          </div>
          <button
            onClick={() => setShowSettings((v) => !v)}
            className="w-8 h-8 rounded-lg border border-[#1a2535] text-[#8892a4] hover:text-[#00d4ff] hover:border-[#00d4ff]/40 transition-colors"
          >
            ⚙
          </button>
          {showSettings && (
            <div className="absolute right-0 top-10 z-20 w-48 bg-[#0f1726] border border-[#2a3a52] rounded-xl p-3 shadow-2xl card-animate">
              <p className="text-xs text-[#8892a4] mb-2">{t('Max slippage', '最大滑点')}</p>
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

        <div className="bg-[#0c1424]/90 rounded-xl border border-[#2a3a52] p-3 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className="text-xs text-[#8ea0bc]">{t('From', '从')}</p>
            <div className="flex flex-wrap gap-1">
              {TOKENS.map((t) => (
                <button
                  key={t.symbol}
                  onClick={() => setToken(t)}
                  disabled={!capabilities.canAdvancedSwapAggregator && t.symbol !== 'ETH'}
                  className={`px-2 py-1 rounded-lg text-xs flex items-center gap-1 whitespace-nowrap ${token.symbol === t.symbol ? 'bg-[#00d4ff] text-[#0a0f1a] font-semibold' : 'bg-[#0d1525] border border-[#1a2535] text-[#8892a4]'} ${!capabilities.canAdvancedSwapAggregator && t.symbol !== 'ETH' ? 'opacity-40 cursor-not-allowed' : ''}`}
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
            className="w-full bg-transparent text-2xl sm:text-3xl font-mono text-white outline-none placeholder-[#2a3545]"
          />
        </div>

        <div className="flex justify-center -my-1">
          <div className="w-8 h-8 rounded-full bg-[#0a0f1a] border border-[#1a2535] flex items-center justify-center text-[#8892a4]">↓</div>
        </div>

        <div className="bg-[#0c1424]/90 rounded-xl border border-[#2a3a52] p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#8ea0bc]">{t('To (estimated)', '到（预估）')}</p>
            <span className="px-2 py-1 rounded-lg bg-[#0d1525] border border-[#1a2535] text-xs text-white flex items-center gap-1">
              <span className="w-4 h-4 rounded-full bg-[#00d4ff] flex items-center justify-center text-[10px] text-[#0a0f1a]">P</span> pufETH
            </span>
          </div>
          <p className="text-2xl font-mono text-[#00d4ff]">{estimatedPufEth ? estimatedPufEth.toFixed(6) : '—'} pufETH</p>
          <p className="text-xs text-[#8892a4]">{t('via', '经由')} {estimatedEth ? estimatedEth.toFixed(6) : '—'} ETH {t('(intermediate swap leg)', '（中间兑换路径）')}</p>
          <p className="text-[11px] text-[#8892a4]">
            {livePairPrice
              ? `1 ${token.symbol} ≈ ${livePairPrice.toFixed(6)} pufETH`
              : t(`Enter amount to see live ${token.symbol} → pufETH price`, `输入数量以查看实时 ${token.symbol} → pufETH 价格`)}
          </p>
        </div>

        <div className="bg-[#0c1424]/90 border border-[#2a3a52] rounded-xl p-3 text-xs text-[#8ea0bc] space-y-2">
          <div className="flex justify-between"><span>{t('Status', '状态')}</span><span className="text-white">{loadingQuote ? t('Fetching quote…', '获取报价中…') : t('Live quote ready', '实时报价已就绪')}</span></div>
          <div className="flex justify-between"><span>{t('Price impact', '价格影响')}</span><span className="text-[#00ff9d]">{priceImpact}</span></div>
          <div className="flex justify-between"><span>{t('Max slippage', '最大滑点')}</span><span className="text-white">{slippageNumber.toFixed(2)}%</span></div>
          <div className="flex justify-between"><span>{t('Minimum received', '最少收到')}</span><span className="text-white font-mono">{minimumReceivedPufEth ? `${minimumReceivedPufEth.toFixed(6)} pufETH` : '—'}</span></div>
          <div className="flex justify-between"><span>{t('Route', '路径')}</span><span className="text-white">{isEthInput ? t('Direct', '直接') : t('Aggregator', '聚合器')}</span></div>
          <div className="flex items-center justify-between pt-1 border-t border-[#1a2535]">
            <span>{t('Auto-stake swapped ETH → pufETH', '自动将兑换后的 ETH 质押为 pufETH')}</span>
            <button
              onClick={() => setAutoStake((v) => !v)}
              className={`w-11 h-6 rounded-full transition-colors ${autoStake ? 'bg-[#00d4ff]' : 'bg-[#1a2535]'}`}
            >
              <span className={`block w-5 h-5 mt-0.5 rounded-full bg-white transition-transform ${autoStake ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>

        <div className="bg-[#0c1424]/90 border border-[#2a3a52] rounded-xl p-3 text-xs text-[#8ea0bc] space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-[#8ea0bc]">{t('Execution Path', '执行路径')}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded-md bg-[#0f1a2b] border border-[#1f324b] text-[#c7d6ea]">{token.symbol}</span>
            <span>→</span>
            <span className="px-2 py-0.5 rounded-md bg-[#0f1a2b] border border-[#1f324b] text-[#c7d6ea]">ETH</span>
            <span>→</span>
            <span className="px-2 py-0.5 rounded-md bg-[#0f1a2b] border border-[#1f324b] text-[#6fd7ff]">pufETH</span>
          </div>
          {swapTxHash && (
            <a href={txExplorerUrl(swapTxHash, chainId)} target="_blank" rel="noopener noreferrer" className="block text-[#61d9ff] underline break-all">
              {t('Swap tx:', '兑换交易：')} {swapTxHash.slice(0, 10)}…{swapTxHash.slice(-6)} ↗
            </a>
          )}
          {stakeTxHash && (
            <a href={txExplorerUrl(stakeTxHash, chainId)} target="_blank" rel="noopener noreferrer" className="block text-[#61d9ff] underline break-all">
              {t('Stake tx:', '质押交易：')} {stakeTxHash.slice(0, 10)}…{stakeTxHash.slice(-6)} ↗
            </a>
          )}
        </div>

        {autoStakeUnsupported && (
          <p className="text-xs text-amber-300">
            {t(`Auto-stake is unavailable on ${TARGET_NETWORK_NAME}. Switch to a supported chain or disable auto-stake.`, `自动质押在 ${TARGET_NETWORK_NAME} 不可用。请切换到支持链或关闭自动质押。`)}
          </p>
        )}
        {insufficientEthForAutoStake && (
          <p className="text-xs text-amber-300">
            {t('Auto-stake requires at least', '自动质押至少需要')} {stakeMinRequiredEthLabel || STAKE_GAS_BUFFER_ETH_LABEL} ETH {t('input to cover stake gas + buffer.', '输入以覆盖质押 Gas 与预留。')}
          </p>
        )}
        {error && <p className="text-xs text-red-400">{error}</p>}
        {status && <p className="text-xs text-[#00d4ff] break-all">{status}</p>}

        <button
          onClick={executeSwap}
          disabled={swapping || !srcAmountBase || !address || !isMainnet || insufficientEthForAutoStake || autoStakeUnsupported}
          className="w-full text-center py-3 bg-[#00d4ff] text-[#0a0f1a] font-bold rounded-xl cta-animate disabled:opacity-40"
        >
          {swapping
            ? t('Swapping…', '兑换中…')
            : autoStakeUnsupported
              ? t('Auto-stake unavailable on this network', '当前网络不支持自动质押')
              : isEthInput
                ? t('No Swap Needed (ETH)', '无需兑换（ETH）')
                : t('Swap', '兑换')}
        </button>

        <Link
          href="/stake"
          className="block w-full text-center py-3 border border-[#1a2535] text-[#8892a4] rounded-xl hover:border-[#00d4ff]/30 hover:text-[#00d4ff]"
        >
          {t('Continue to Stake', '继续前往质押')}
        </Link>
      </div>

      {recentSwaps.length > 0 && (
        <div className="dex-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">{t('Recent Swaps', '最近兑换')}</p>
            <button
              onClick={() => {
                setRecentSwaps([]);
                window.localStorage.removeItem(RECENT_SWAPS_KEY);
              }}
              className="text-[11px] text-[#8892a4] hover:text-white"
            >
              {t('Clear', '清空')}
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

      <div className="dex-card rounded-xl p-4 text-xs text-[#8ea0bc] space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="uppercase tracking-wider text-[10px] text-[#8ea0bc]">{t('Advanced challenge', '进阶挑战')}</p>
          <span className="text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/35 text-emerald-300 bg-emerald-500/10">{capabilities.canOneClickAnyTokenToPufEth ? t('Enabled', '已启用') : t('Unavailable', '不可用')}</span>
        </div>
        <p className="text-[#c9d7ea] leading-relaxed">
          {t('One-click any-token → pufETH via DEX aggregator route (token → ETH) and optional auto-stake (ETH → pufETH).', '通过 DEX 聚合路径实现一键 任意代币 → pufETH（代币 → ETH，并可选自动质押 ETH → pufETH）。')}
        </p>
        <p className="text-[#8892a4]">{capabilities.canOneClickAnyTokenToPufEth ? t('Execution depends on route liquidity and available ETH for on-chain gas.', '执行结果取决于路径流动性与链上 Gas 可用性。') : t(`This advanced route is currently unavailable on ${TARGET_NETWORK_NAME}.`, `${TARGET_NETWORK_NAME} 当前暂不可用该进阶路径。`)}</p>
      </div>
    </div>
  );
}
