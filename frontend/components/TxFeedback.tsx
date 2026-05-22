'use client';

import { useLocale } from '@/lib/locale';
import { useWallet } from '@/hooks/useWallet';
import { txExplorerUrl } from '@/lib/explorer';

export type TxStatus = 'idle' | 'preparing' | 'awaiting_signature' | 'submitted' | 'confirmed' | 'error';

interface Props {
  status: TxStatus;
  txHash?: string;
  error?: string;
  onReset: () => void;
}

export default function TxFeedback({ status, txHash, error, onReset }: Props) {
  const { t } = useLocale();
  const { chainId } = useWallet();
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
              {status === 'preparing' && t('Preparing transaction…', '正在准备交易…')}
              {status === 'awaiting_signature' && t('Awaiting wallet signature…', '等待钱包签名…')}
              {status === 'submitted' && t('Transaction submitted. Waiting for confirmation…', '交易已提交，等待确认…')}
            </p>
          </div>
          {txHash && (
            <a
              href={txExplorerUrl(txHash, chainId)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#00d4ff] underline break-all"
            >
              {t('View on explorer ↗', '在区块浏览器查看 ↗')}
            </a>
          )}
        </div>
      )}

      {status === 'confirmed' && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[#00ff9d] text-lg">✓</span>
            <p className="text-sm font-semibold text-[#00ff9d]">{t('Transaction confirmed!', '交易已确认！')}</p>
          </div>
          {txHash && (
            <a
              href={txExplorerUrl(txHash, chainId)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#00d4ff] underline break-all"
            >
              {t('View on explorer ↗', '在区块浏览器查看 ↗')}
            </a>
          )}
          <button onClick={onReset} className="mt-3 text-xs text-[#8892a4] hover:text-white block">
            {t('← New transaction', '← 发起新交易')}
          </button>
        </div>
      )}

      {status === 'error' && (
        <div>
          <p className="text-sm text-red-400 mb-2">⚠ {error || t('Transaction failed', '交易失败')}</p>
          <button onClick={onReset} className="text-xs text-[#8892a4] hover:text-white">
            {t('Try again', '重试')}
          </button>
        </div>
      )}
    </div>
  );
}
