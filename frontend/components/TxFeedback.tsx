'use client';

export type TxStatus = 'idle' | 'preparing' | 'awaiting_signature' | 'submitted' | 'confirmed' | 'error';

interface Props {
  status: TxStatus;
  txHash?: string;
  error?: string;
  onReset: () => void;
}

export default function TxFeedback({ status, txHash, error, onReset }: Props) {
  if (status === 'idle') return null;

  const isWorking = status === 'preparing' || status === 'awaiting_signature' || status === 'submitted';

  return (
    <div className={`rounded-xl p-4 border ${
      isWorking ? 'bg-[#0d1525] border-[#1a2535]' :
      status === 'confirmed' ? 'bg-[#001a0f] border-[#00ff9d]/30' :
      'bg-[#1a0d0d] border-red-500/30'
    }`}>
      {isWorking && (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-[#00d4ff] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-[#8892a4]">
              {status === 'preparing' && 'Preparing transaction…'}
              {status === 'awaiting_signature' && 'Awaiting wallet signature…'}
              {status === 'submitted' && 'Transaction submitted. Waiting for confirmation…'}
            </p>
          </div>
          {txHash && (
            <a
              href={`https://etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#00d4ff] underline break-all"
            >
              View on Etherscan ↗
            </a>
          )}
        </div>
      )}

      {status === 'confirmed' && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[#00ff9d] text-lg">✓</span>
            <p className="text-sm font-semibold text-[#00ff9d]">Transaction confirmed!</p>
          </div>
          {txHash && (
            <a
              href={`https://etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#00d4ff] underline break-all"
            >
              View on Etherscan ↗
            </a>
          )}
          <button onClick={onReset} className="mt-3 text-xs text-[#8892a4] hover:text-white block">
            ← New transaction
          </button>
        </div>
      )}

      {status === 'error' && (
        <div>
          <p className="text-sm text-red-400 mb-2">⚠ {error || 'Transaction failed'}</p>
          <button onClick={onReset} className="text-xs text-[#8892a4] hover:text-white">
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
