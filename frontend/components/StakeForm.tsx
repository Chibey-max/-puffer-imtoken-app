'use client';
import { useState, useCallback } from 'react';
import { parseEther, formatEther, BrowserProvider, Eip1193Provider } from 'ethers';
import { useWallet } from '@/hooks/useWallet';
import { usePufferClient } from '@/hooks/usePufferClient';
import { usePufETHRate } from '@/hooks/usePufferApi';
import TxFeedback, { TxStatus } from './TxFeedback';
import { TARGET_NETWORK_NAME, isPufferStakingSupportedChain } from '@/lib/network';

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
const API = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080/api';
const SIMULATE_STAKE = process.env.NEXT_PUBLIC_SIMULATE_STAKE === 'true';

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
  const { client, init } = usePufferClient();
  const { data: rate } = usePufETHRate();

  const [token, setToken] = useState<Token>('ETH');
  const [amount, setAmount] = useState('');
  const [gasEstimate, setGasEstimate] = useState<string | null>(null);
  const [status, setStatus] = useState<TxStatus>('idle');
  const [txHash, setTxHash] = useState<string | undefined>();
  const [txError, setTxError] = useState<string | undefined>();
  const [showConfirm, setShowConfirm] = useState(false);

  const pufferClient = client || init();
  const stakingSupported = isPufferStakingSupportedChain(chainId);

  const estimatedPufETH = amount && rate
    ? (parseFloat(amount) * parseFloat(rate.pufEthPerEth)).toFixed(6)
    : null;

  const handleEstimateGas = useCallback(async () => {
    if (!pufferClient || !address || !amount) return;
    try {
      const { estimate } = pufferClient.vault.depositETH(address as `0x${string}`);
      const gas = await estimate();
      setGasEstimate(formatEther(gas * BigInt(30_000_000_000)));
    } catch {
      setGasEstimate(null);
    }
  }, [pufferClient, address, amount]);

  const executeStake = async () => {
    if (!address || !amount || !isMainnet) return;

    setStatus('preparing');
    setTxHash(undefined);
    setTxError(undefined);

    try {
      if (SIMULATE_STAKE) {
        setStatus('awaiting_signature');
        await new Promise(resolve => setTimeout(resolve, 800));

        const fakeHash = `0x${Date.now().toString(16).padStart(64, '0').slice(0, 64)}`;
        setTxHash(fakeHash);
        setStatus('submitted');

        const txRecord = {
          hash: fakeHash,
          token,
          amount,
          status: 'submitted' as const,
          timestamp: Date.now(),
        };
        saveTx(txRecord);
        await persistTx(address, txRecord);

        await new Promise(resolve => setTimeout(resolve, 1400));
        markTxConfirmed(fakeHash);
        setStatus('confirmed');
        return;
      }

      if (!pufferClient) {
        throw new Error('Puffer client not initialized.');
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
          setTxError('Transaction failed on-chain.');
          setStatus('error');
        }
      } else {
        setStatus('confirmed');
      }
    } catch (err: unknown) {
      const raw = err as { code?: number; shortMessage?: string; message?: string };

      if (raw?.code === 4001 || (raw?.message && raw.message.toLowerCase().includes('rejected'))) {
        setTxError('Transaction cancelled in wallet. No funds moved.');
      } else if (raw?.shortMessage) {
        setTxError(raw.shortMessage);
      } else if (raw?.message) {
        setTxError(raw.message.length > 160 ? `${raw.message.slice(0, 160)}…` : raw.message);
      } else {
        setTxError('Transaction failed. Please try again.');
      }

      setStatus('error');
    }
  };

  const handleStake = () => {
    if (!amount || parseFloat(amount) <= 0 || !isMainnet) return;
    setShowConfirm(true);
  };

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
        Connect your wallet to stake
      </div>
    );
  }

  if (!isMainnet) {
    return (
      <div className="bg-[#1a0d0d] border border-red-500/30 rounded-xl p-4 space-y-3">
        <p className="text-sm text-red-300 font-semibold">{TARGET_NETWORK_NAME} required</p>
        <p className="text-xs text-[#8892a4]">Please switch your wallet network to {TARGET_NETWORK_NAME} to stake safely.</p>
        {walletError && <p className="text-xs text-red-400">{walletError}</p>}
        <button
          onClick={switchToMainnet}
          className="w-full py-3 bg-[#00d4ff] text-[#0a0f1a] font-bold rounded-xl hover:bg-[#00b8d9] transition-all"
        >
          Switch to {TARGET_NETWORK_NAME}
        </button>
      </div>
    );
  }

  if (!stakingSupported && !SIMULATE_STAKE) {
    return (
      <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-4 space-y-2">
        <p className="text-sm text-amber-300 font-semibold">Staking not supported on {TARGET_NETWORK_NAME}</p>
        <p className="text-xs text-[#8892a4]">
          Wallet connection and balance checks work here, but pufETH mint staking is currently supported on Holesky/Mainnet only.
        </p>
      </div>
    );
  }

  if (status !== 'idle') {
    return <TxFeedback status={status} txHash={txHash} error={txError} onReset={reset} />;
  }

  return (
    <div className="space-y-4">
      {SIMULATE_STAKE && (
        <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-3">
          <p className="text-xs text-amber-300 font-semibold">Simulation mode enabled</p>
          <p className="text-xs text-[#8892a4] mt-1">Staking confirmations are mocked for demo/testing. No on-chain transaction is submitted.</p>
        </div>
      )}
      <div className="flex gap-2 card-animate">
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

      <div className="bg-[#0d1525] border border-[#1a2535] rounded-xl p-4 card-animate">
        <div className="flex justify-between mb-2">
          <label className="text-xs text-[#8892a4]">Amount ({token})</label>
          {token === 'ETH' && ethBalance && (
            <button
              onClick={() => setAmount(parseFloat(ethBalance).toFixed(6))}
              className="text-xs text-[#00d4ff] hover:underline"
            >
              MAX: {parseFloat(ethBalance).toFixed(4)}
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
        <div className="bg-[#001a2e] border border-[#00d4ff]/20 rounded-xl p-4 space-y-2 card-animate">
          <div className="flex justify-between text-sm">
            <span className="text-[#8892a4]">You will receive ~</span>
            <span className="font-mono font-bold text-[#00d4ff]">{estimatedPufETH} pufETH</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#8892a4]">Exchange rate</span>
            <span className="font-mono text-white">1 ETH = {parseFloat(rate!.pufEthPerEth).toFixed(4)} pufETH</span>
          </div>
          {gasEstimate && (
            <div className="flex justify-between text-sm">
              <span className="text-[#8892a4]">Est. gas cost</span>
              <span className="font-mono text-[#8892a4]">~{parseFloat(gasEstimate).toFixed(6)} ETH</span>
            </div>
          )}
          <p className="text-xs text-[#8892a4] pt-1 border-t border-[#1a2535]">
            Rate updates every block. Final amount may vary slightly.
          </p>
        </div>
      )}

      <button
        onClick={handleStake}
        disabled={!amount || parseFloat(amount) <= 0 || !isMainnet}
        className="w-full py-4 bg-[#00d4ff] text-[#0a0f1a] font-bold rounded-xl cta-animate
                   hover:bg-[#00b8d9] active:scale-[0.98] transition-all
                   disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
      >
        Review & Stake {token} → pufETH
      </button>

      {showConfirm && (
        <div className="fixed inset-0 z-[60] bg-black/65 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0d1525] border border-[#1a2535] rounded-2xl p-4 space-y-4 card-animate">
            <div>
              <p className="text-xs text-[#8892a4] uppercase tracking-wider">Security confirmation</p>
              <h3 className="text-lg font-bold text-white mt-1">Review before signing</h3>
            </div>

            <div className="bg-[#0a0f1a] border border-[#1a2535] rounded-xl p-3 text-sm space-y-2">
              <div className="flex justify-between"><span className="text-[#8892a4]">Asset</span><span className="text-white font-semibold">{token}</span></div>
              <div className="flex justify-between"><span className="text-[#8892a4]">Amount</span><span className="text-white font-semibold">{amount}</span></div>
              <div className="flex justify-between"><span className="text-[#8892a4]">Receive (est.)</span><span className="text-[#00d4ff] font-semibold">{estimatedPufETH || '—'} pufETH</span></div>
              {gasEstimate && <div className="flex justify-between"><span className="text-[#8892a4]">Est. Gas</span><span className="text-white">~{parseFloat(gasEstimate).toFixed(6)} ETH</span></div>}
            </div>

            <ul className="text-xs text-[#8892a4] space-y-1.5">
              <li>• Verify token and amount in your wallet prompt.</li>
              <li>• Confirm destination contract and network are correct.</li>
              <li>• Never sign unexpected approval/permit requests.</li>
            </ul>

            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 border border-[#2a3545] rounded-xl text-[#8892a4] hover:text-white hover:border-[#00d4ff]/40 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowConfirm(false);
                  executeStake();
                }}
                className="flex-1 py-3 bg-[#00d4ff] text-[#0a0f1a] font-bold rounded-xl cta-animate"
              >
                {SIMULATE_STAKE ? 'Confirm & Simulate' : 'Confirm & Sign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
