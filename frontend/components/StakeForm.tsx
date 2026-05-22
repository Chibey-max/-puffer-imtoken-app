'use client';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { parseEther, formatEther, BrowserProvider, Eip1193Provider } from 'ethers';
import { useWallet } from '@/hooks/useWallet';
import { usePufferClient } from '@/hooks/usePufferClient';
import { usePufETHRate } from '@/hooks/usePufferApi';
import TxFeedback, { TxStatus } from './TxFeedback';
import { TARGET_NETWORK_NAME } from '@/lib/network';
import { getChainCapabilities } from '@/lib/capabilities';
import { getApiBase } from '@/lib/apiBase';
import { useLocale } from '@/lib/locale';
import { ADDRESSES } from '@/lib/puffer';
import { useAppMode } from '@/lib/appMode';
import { analyzeWithTokenCorePolicy, RiskFinding } from '@/lib/risk/tokenCorePolicy';

const TOKENS = ['ETH', 'stETH', 'wstETH'] as const;
type Token = typeof TOKENS[number];

type StoredTx = {
  hash: string;
  token: Token;
  amount: string;
  status: 'submitted' | 'confirmed' | 'error';
  timestamp: number;
};

const TX_STORAGE_KEY = 'puffer_tx_history';
const API = getApiBase();
const LIVE_ONLY_CONFLICT = process.env.NEXT_PUBLIC_SIMULATE_STAKE === 'true';
const DEFAULT_GAS_RESERVE_ETH = Number(process.env.NEXT_PUBLIC_STAKE_GAS_RESERVE_ETH || '0.0003');

function riskBadgeClass(level: RiskFinding['level']) {
  if (level === 'block') return 'border-red-500/40 text-red-300 bg-red-500/10';
  if (level === 'danger') return 'border-orange-500/40 text-orange-300 bg-orange-500/10';
  if (level === 'warning') return 'border-amber-500/40 text-amber-300 bg-amber-500/10';
  return 'border-sky-500/40 text-sky-300 bg-sky-500/10';
}

function saveTx(tx: StoredTx) {
  if (typeof window === 'undefined') return;
  const existing = window.localStorage.getItem(TX_STORAGE_KEY);
  const parsed = existing ? (JSON.parse(existing) as StoredTx[]) : [];
  const next = [tx, ...parsed].slice(0, 25);
  window.localStorage.setItem(TX_STORAGE_KEY, JSON.stringify(next));
}

async function persistTx(wallet: string, tx: StoredTx) {
  try {
    await fetch(`${API}/tx-history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet, ...tx }),
    });
  } catch {
    // local history already saved; backend persistence is best effort
  }
}

function markTxConfirmed(hash: string) {
  if (typeof window === 'undefined') return;
  const existing = window.localStorage.getItem(TX_STORAGE_KEY);
  if (!existing) return;
  const parsed = JSON.parse(existing) as StoredTx[];
  const next = parsed.map(tx => tx.hash.toLowerCase() === hash.toLowerCase() ? { ...tx, status: 'confirmed' as const } : tx);
  window.localStorage.setItem(TX_STORAGE_KEY, JSON.stringify(next));
}

export default function StakeForm() {
  const { address, ethBalance, isMainnet, switchToMainnet, error: walletError, chainId } = useWallet();
  const { t } = useLocale();
  const { isPrototype } = useAppMode();
  const { client, init } = usePufferClient();
  const { data: rate } = usePufETHRate();

  const [token, setToken] = useState<Token>('ETH');
  const [amount, setAmount] = useState('');
  const [gasEstimate, setGasEstimate] = useState<string | null>(null);
  const [recommendedGasReserve, setRecommendedGasReserve] = useState<number>(DEFAULT_GAS_RESERVE_ETH);
  const [status, setStatus] = useState<TxStatus>('idle');
  const [txHash, setTxHash] = useState<string | undefined>();
  const [txError, setTxError] = useState<string | undefined>();
  const [showConfirm, setShowConfirm] = useState(false);

  const pufferClient = client || init();
  const capabilities = getChainCapabilities(chainId);
  const stakingSupported = token === 'ETH'
    ? capabilities.canStake
    : token === 'stETH'
      ? capabilities.canStakeStEth
      : capabilities.canStakeWstEth;

  const estimatedPufETH = amount && rate
    ? (parseFloat(amount) * parseFloat(rate.pufEthPerEth)).toFixed(6)
    : null;

  const riskFindings = useMemo(() => analyzeWithTokenCorePolicy({
    to: ADDRESSES.pufETH,
    data: '0x',
    contractVerified: true,
    selectorRecognized: true,
    simulationFailed: false,
    policyRuleViolated: false,
    hasFullSimulation: false,
  }), []);

  const handleEstimateGas = useCallback(async () => {
    if (!pufferClient || !address || !amount || !window.ethereum) return;
    try {
      const { estimate } = pufferClient.vault.depositETH(address as `0x${string}`);
      const gasUnits = await estimate();
      const provider = new BrowserProvider(window.ethereum as Eip1193Provider);
      const feeData = await provider.getFeeData();
      const feePerGas = feeData.maxFeePerGas || feeData.gasPrice || BigInt(2_000_000_000); // fallback 2 gwei
      const costWei = gasUnits * feePerGas;
      const costEth = parseFloat(formatEther(costWei));
      setGasEstimate(costEth.toString());
      const safeReserve = Number.isFinite(costEth) && costEth > 0
        ? Math.max(DEFAULT_GAS_RESERVE_ETH, costEth * 1.25)
        : DEFAULT_GAS_RESERVE_ETH;
      setRecommendedGasReserve(safeReserve);
    } catch {
      setGasEstimate(null);
      setRecommendedGasReserve(DEFAULT_GAS_RESERVE_ETH);
    }
  }, [pufferClient, address, amount]);

  const executeStake = async () => {
    if (LIVE_ONLY_CONFLICT && !isPrototype) {
      setTxError(t('Live-only mode blocks simulated actions. Set NEXT_PUBLIC_SIMULATE_STAKE=false and retry.', '实时模式禁止模拟行为。请设置 NEXT_PUBLIC_SIMULATE_STAKE=false 后重试。'));
      setStatus('error');
      return;
    }

    if (!address || !amount || (!isMainnet && !isPrototype)) return;

    if (isPrototype) {
      setStatus('preparing');
      setTxHash(undefined);
      setTxError(undefined);

      const fakeHash = `0x${Date.now().toString(16).padStart(64, '0')}`;
      const txRecord = {
        hash: fakeHash,
        token,
        amount,
        status: 'confirmed' as const,
        timestamp: Date.now(),
      };

      setTimeout(() => {
        setStatus('awaiting_signature');
      }, 300);

      setTimeout(() => {
        setTxHash(fakeHash);
        setStatus('submitted');
      }, 900);

      setTimeout(async () => {
        saveTx(txRecord);
        await persistTx(address, txRecord);
        setStatus('confirmed');
      }, 1500);

      return;
    }

    // Prevent wallet-level generic RPC failures by checking balance + dynamic gas reserve first
    {
      const requested = Number(amount);
      const balance = Number(ethBalance || '0');
      const minGasReserve = Math.max(DEFAULT_GAS_RESERVE_ETH, recommendedGasReserve);

      if (!Number.isFinite(requested) || requested <= 0) {
        setTxError(t('Enter a valid stake amount.', '请输入有效的质押数量。'));
        setStatus('error');
        return;
      }

      if (!Number.isFinite(balance) || balance <= 0 || (token === 'ETH' && requested + minGasReserve > balance)) {
        setTxError(t(`Insufficient ETH. You need stake amount + gas reserve (~${minGasReserve.toFixed(6)} ETH). Current wallet balance is ${balance.toFixed(6)} ETH.`, `ETH 余额不足。你需要“质押数量 + Gas 预留（约 ${minGasReserve.toFixed(6)} ETH）”。当前钱包余额为 ${balance.toFixed(6)} ETH。`));
        setStatus('error');
        return;
      }

      if (token !== 'ETH' && balance < minGasReserve) {
        setTxError(t(`Insufficient ETH for gas. Keep at least ~${minGasReserve.toFixed(6)} ETH in wallet for fees.`, `ETH Gas 余额不足。请至少保留约 ${minGasReserve.toFixed(6)} ETH 用于手续费。`));
        setStatus('error');
        return;
      }
    }

    setStatus('preparing');
    setTxHash(undefined);
    setTxError(undefined);

    try {


      if (!pufferClient) {
        throw new Error(t('Puffer client not initialized.', 'Puffer 客户端未初始化。'));
      }

      const amountWei = parseEther(amount);
      setStatus('awaiting_signature');

      let hash: string;
      if (token === 'ETH') {
        const { transact } = pufferClient.vault.depositETH(address as `0x${string}`);
        hash = await transact(amountWei);
      } else if (token === 'stETH') {
        const { transact } = await pufferClient.depositor.depositStETH(address as `0x${string}`, amountWei);
        hash = await transact();
      } else {
        const { transact } = await pufferClient.depositor.depositWstETH(address as `0x${string}`, amountWei);
        hash = await transact();
      }

      setTxHash(hash);
      setStatus('submitted');
      const txRecord = {
        hash,
        token,
        amount,
        status: 'submitted' as const,
        timestamp: Date.now(),
      };
      saveTx(txRecord);
      await persistTx(address, txRecord);

      if (window.ethereum) {
        const provider = new BrowserProvider(window.ethereum as Eip1193Provider);
        const receipt = await provider.waitForTransaction(hash, 1, 120_000);
        if (receipt?.status === 1) {
          markTxConfirmed(hash);
          setStatus('confirmed');
        } else {
          setTxError(t('Transaction failed on-chain.', '交易在链上执行失败。'));
          setStatus('error');
        }
      } else {
        setStatus('confirmed');
      }
    } catch (err: unknown) {
      const raw = err as { code?: number; shortMessage?: string; message?: string };
      const msg = (raw?.shortMessage || raw?.message || '').toLowerCase();

      if (raw?.code === 4001 || msg.includes('rejected')) {
        setTxError(t('Transaction cancelled in wallet. No funds moved.', '交易已在钱包中取消，资金未发生变动。'));
      } else if (msg.includes('unknown rpc error') || msg.includes('rpc error') || msg.includes('internal json-rpc error')) {
        setTxError(t('Wallet RPC error after signing. On Holesky this is usually temporary RPC/provider instability or unsupported contract path. Retry in 10–20s, then try a smaller amount.', '签名后钱包 RPC 报错。在 Holesky 上这通常是临时 RPC/节点不稳定或合约路径暂不支持。请 10-20 秒后重试，并尝试更小金额。'));
      } else if (msg.includes('insufficient funds')) {
        setTxError(t('Insufficient ETH for value + gas. Keep extra Holesky ETH for fees and retry with a smaller amount.', 'ETH 不足以支付转账金额与 Gas。请保留额外 Holesky ETH 作为手续费并使用更小金额重试。'));
      } else if (raw?.shortMessage) {
        setTxError(raw.shortMessage);
      } else if (raw?.message) {
        setTxError(raw.message.length > 220 ? `${raw.message.slice(0, 220)}…` : raw.message);
      } else {
        setTxError(t('Transaction failed. Please try again.', '交易失败，请重试。'));
      }

      setStatus('error');
    }
  };

  const handleStake = () => {
    if (!amount || parseFloat(amount) <= 0 || (!isMainnet && !isPrototype)) return;
    setShowConfirm(true);
  };

  useEffect(() => {
    if (!showConfirm) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [showConfirm]);

  const reset = () => {
    setStatus('idle');
    setAmount('');
    setGasEstimate(null);
    setTxHash(undefined);
    setTxError(undefined);
  };

  if (!address) {
    return (
      <div className="text-center py-8 text-[#8892a4]">
        {t('Connect your wallet to stake', '请先连接钱包再进行质押')}
      </div>
    );
  }

  if (!isMainnet && !isPrototype) {
    return (
      <div className="bg-[#1a0d0d] border border-red-500/30 rounded-xl p-4 space-y-3">
        <p className="text-sm text-red-300 font-semibold">{t(`${TARGET_NETWORK_NAME} required`, `需要 ${TARGET_NETWORK_NAME} 网络`)}</p>
        <p className="text-xs text-[#8892a4]">{t(`Please switch your wallet network to ${TARGET_NETWORK_NAME} to stake safely.`, `请将钱包网络切换到 ${TARGET_NETWORK_NAME} 后再安全质押。`)}</p>
        {walletError && <p className="text-xs text-red-400">{walletError}</p>}
        <button
          onClick={switchToMainnet}
          className="w-full py-3 bg-[#00d4ff] text-[#0a0f1a] font-bold rounded-xl hover:bg-[#00b8d9] transition-all"
        >
          {t(`Switch to ${TARGET_NETWORK_NAME}`, `切换到 ${TARGET_NETWORK_NAME}`)}
        </button>
      </div>
    );
  }

  if (!stakingSupported && !isPrototype) {
    return (
      <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-4 space-y-2">
        <p className="text-sm text-amber-300 font-semibold">{t(`Staking not supported on ${TARGET_NETWORK_NAME}`, `${TARGET_NETWORK_NAME} 暂不支持质押`)}</p>
        <p className="text-xs text-[#8892a4]">
          {t('Wallet connection and balance checks work here, but required staking contracts are not available on this network.', '钱包连接和余额检查可用，但该网络缺少所需的质押合约。')}
        </p>
      </div>
    );
  }

  if (status !== 'idle') {
    return <TxFeedback status={status} txHash={txHash} error={txError} onReset={reset} />;
  }

  return (
    <div className="space-y-4">
      {isPrototype && (
        <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-3">
          <p className="text-xs text-amber-300 font-semibold">{t('Prototype mode enabled', '原型模式已开启')}</p>
          <p className="text-xs text-[#f2d5a7] mt-1">{t('Transactions are simulated for UX testing. No real on-chain transaction will be broadcast.', '当前交易为模拟流程，仅用于交互测试，不会真实上链。')}</p>
        </div>
      )}
      {LIVE_ONLY_CONFLICT && !isPrototype && (
        <div className="bg-red-950/40 border border-red-500/40 rounded-xl p-3">
          <p className="text-xs text-red-300 font-semibold">{t('Live-only mode: simulation is disabled.', '实时模式：模拟功能已禁用。')}</p>
          <p className="text-xs text-[#f3b6b6] mt-1">{t('Set NEXT_PUBLIC_SIMULATE_STAKE=false. This build only allows real on-chain transactions.', '请设置 NEXT_PUBLIC_SIMULATE_STAKE=false。当前构建仅允许真实链上交易。')}</p>
        </div>
      )}
      <div className="flex gap-2 card-animate dex-card p-2 rounded-xl">
        {TOKENS.map(t => (
          <button
            key={t}
            onClick={() => setToken(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              token === t
                ? 'bg-[#00d4ff] text-[#0a0f1a]'
                : 'bg-[#0d1525] border border-[#1a2535] text-[#8892a4] hover:border-[#00d4ff]/50'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="dex-card rounded-xl p-4 card-animate">
        <div className="flex justify-between mb-2">
          <label className="text-xs text-[#8892a4]">{t('Amount', '数量')} ({token})</label>
          {token === 'ETH' && ethBalance && (
            <button
              onClick={() => {
                const balance = parseFloat(ethBalance);
                const reserve = Math.max(DEFAULT_GAS_RESERVE_ETH, recommendedGasReserve);
                const maxStake = Math.max(0, balance - reserve);
                setAmount(maxStake.toFixed(6));
              }}
              className="text-xs text-[#00d4ff] hover:underline"
            >
              {t('MAX (after gas)', '最大值（扣除Gas）')}: {Math.max(0, parseFloat(ethBalance) - Math.max(DEFAULT_GAS_RESERVE_ETH, recommendedGasReserve)).toFixed(4)}
            </button>
          )}
        </div>
        <input
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          onBlur={handleEstimateGas}
          placeholder="0.0"
          className="w-full bg-transparent text-2xl font-mono text-white outline-none placeholder-[#2a3545]"
        />
      </div>

      {estimatedPufETH && (
        <div className="dex-card rounded-xl p-4 space-y-2 card-animate">
          <div className="flex justify-between text-sm">
            <span className="text-[#8892a4]">{t('You will receive ~', '你将收到约')}</span>
            <span className="font-mono font-bold text-[#00d4ff]">{estimatedPufETH} pufETH</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#8892a4]">{t('Exchange rate', '兑换汇率')}</span>
            <span className="font-mono text-white">1 ETH = {parseFloat(rate!.pufEthPerEth).toFixed(4)} pufETH</span>
          </div>
          {gasEstimate && (
            <div className="flex justify-between text-sm">
              <span className="text-[#8892a4]">{t('Est. gas cost', '预估 Gas 成本')}</span>
              <span className="font-mono text-[#8892a4]">~{parseFloat(gasEstimate).toFixed(6)} ETH</span>
            </div>
          )}
          <p className="text-xs text-[#8ea0bc] pt-1 border-t border-[#2a3a52]">
            {t('Rate updates every block. Final amount may vary slightly.', '汇率每个区块更新，最终数量可能略有偏差。')}
          </p>
          <p className="text-xs text-[#8ea0bc]">
            {t(`Recommended gas reserve: ~${Math.max(DEFAULT_GAS_RESERVE_ETH, recommendedGasReserve).toFixed(6)} ETH`, `建议预留 Gas：约 ${Math.max(DEFAULT_GAS_RESERVE_ETH, recommendedGasReserve).toFixed(6)} ETH`)}
          </p>
        </div>
      )}

      <button
        onClick={handleStake}
        disabled={(!isPrototype && LIVE_ONLY_CONFLICT) || !amount || parseFloat(amount) <= 0 || (!isMainnet && !isPrototype) || (!stakingSupported && !isPrototype)}
        className="w-full py-4 bg-[#00d4ff] text-[#0a0f1a] font-bold rounded-xl cta-animate
                   hover:bg-[#00b8d9] active:scale-[0.98] transition-all
                   disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
      >
        {t(`Review & Stake ${token} → pufETH`, `确认并质押 ${token} → pufETH`)}
      </button>

      {showConfirm && (
        <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-md flex items-center justify-center px-4 pt-24 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:pt-4 sm:pb-4 overflow-y-auto overscroll-contain">
          <div className="w-full max-w-md max-h-[82vh] overflow-y-auto overscroll-contain dex-card rounded-2xl p-4 space-y-4 card-animate">
            <div>
              <p className="text-xs text-[#8892a4] uppercase tracking-wider">{t('Security confirmation', '安全确认')}</p>
              <h3 className="text-lg font-bold text-white mt-1">{t('Review before signing', '签名前请确认')}</h3>
            </div>

            <div className="bg-[#0a0f1a] border border-[#1a2535] rounded-xl p-3 text-sm space-y-2">
              <div className="flex justify-between"><span className="text-[#8892a4]">{t('Asset', '资产')}</span><span className="text-white font-semibold">{token}</span></div>
              <div className="flex justify-between"><span className="text-[#8892a4]">{t('Amount', '数量')}</span><span className="text-white font-semibold">{amount}</span></div>
              <div className="flex justify-between"><span className="text-[#8892a4]">{t('Receive (est.)', '预计收到')}</span><span className="text-[#00d4ff] font-semibold">{estimatedPufETH || '—'} pufETH</span></div>
              <div className="flex justify-between"><span className="text-[#8892a4]">{t('Network', '网络')}</span><span className="text-white">{TARGET_NETWORK_NAME}</span></div>
              <div className="flex justify-between"><span className="text-[#8892a4]">{t('Destination contract', '目标合约')}</span><span className="text-white font-mono">{ADDRESSES.pufETH.slice(0, 10)}…{ADDRESSES.pufETH.slice(-6)}</span></div>
              {gasEstimate && <div className="flex justify-between"><span className="text-[#8892a4]">{t('Est. Gas', '预估 Gas')}</span><span className="text-white">~{parseFloat(gasEstimate).toFixed(6)} ETH</span></div>}
            </div>

            <div className="space-y-2">
              <p className="text-xs text-[#8ea0bc] uppercase tracking-wider">{t('Pre-sign Risk Checks', '签名前风险检查')}</p>
              {riskFindings.map((f, idx) => (
                <div key={`${f.level}-${idx}`} className={`rounded-lg border p-2 text-xs ${riskBadgeClass(f.level)}`}>
                  <p className="font-semibold uppercase">{f.level}</p>
                  <p className="font-semibold mt-0.5">{t(f.title, f.title)}</p>
                  <p className="mt-1">{t(f.detail, f.detail)}</p>
                </div>
              ))}
            </div>

            <ul className="text-xs text-[#8ea0bc] space-y-1.5 leading-relaxed">
              {isPrototype ? (
                <li>{t('• Prototype mode simulates transaction lifecycle for testing only.', '• 原型模式仅模拟交易生命周期，用于测试交互。')}</li>
              ) : (
                <>
                  <li>{t('• Verify token and amount in your wallet prompt.', '• 请在钱包弹窗中核对代币与数量。')}</li>
                  <li>{t('• Confirm destination contract and network are correct.', '• 请确认目标合约与网络正确。')}</li>
                  <li>{t('• Never sign unexpected approval/permit requests.', '• 不要签署任何意外的授权/许可请求。')}</li>
                </>
              )}
            </ul>

            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 min-h-[52px] px-3 border border-[#2a3545] rounded-xl text-[#8892a4] hover:text-white hover:border-[#00d4ff]/40 transition-colors flex items-center justify-center text-center leading-none"
              >
                <span className="block">{t('Cancel', '取消')}</span>
              </button>
              <button
                onClick={() => {
                  setShowConfirm(false);
                  executeStake();
                }}
                className="flex-1 min-h-[52px] px-3 bg-[#00d4ff] text-[#0a0f1a] font-bold rounded-xl cta-animate flex items-center justify-center text-center leading-none"
              >
                <span className="block">{isPrototype ? t('Confirm Simulation', '确认模拟') : t('Confirm & Sign', '确认并签名')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
