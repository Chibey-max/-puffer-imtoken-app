'use client';

import { FormEvent, useState } from 'react';
import { useLocale } from '@/lib/locale';
import { useAppMode } from '@/lib/appMode';
import { useWallet } from '@/hooks/useWallet';

type AssistantResponse = {
  reply: string;
  plan: Array<{ title: string; detail: string }>;
  risk: 'info' | 'warning' | 'danger';
  disclaimer: string;
  walletHint: string;
};

function riskClass(risk: AssistantResponse['risk']) {
  if (risk === 'danger') return 'border-red-500/40 text-red-300 bg-red-500/10';
  if (risk === 'warning') return 'border-amber-500/40 text-amber-300 bg-amber-500/10';
  return 'border-sky-500/40 text-sky-300 bg-sky-500/10';
}

export default function AssistantPanel() {
  const { t, locale } = useLocale();
  const { mode } = useAppMode();
  const { address } = useWallet();

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AssistantResponse | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          locale,
          mode,
          walletConnected: Boolean(address),
        }),
      });

      if (!res.ok) {
        throw new Error(t('Assistant request failed.', '助手请求失败。'));
      }

      const json = (await res.json()) as AssistantResponse;
      setResult(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Unexpected error.', '发生未知错误。'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="dex-card rounded-xl p-4 space-y-3 card-animate">
      <div>
        <p className="text-xs text-[#8ea0bc] uppercase tracking-wider">{t('AI Assistant', 'AI 助手')}</p>
        <h2 className="text-lg font-bold text-white mt-1">{t('Intent Planner (Safe Mode)', '意图规划助手（安全模式）')}</h2>
      </div>

      <form onSubmit={submit} className="space-y-2">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t('Example: Stake 1 ETH to pufETH with minimum risk', '示例：将 1 ETH 质押为 pufETH，并尽量降低风险')}
          className="w-full min-h-[110px] px-3 py-2 rounded-lg bg-[#09111f] border border-[#1a2535] text-sm text-white"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-[#06101a] bg-gradient-to-r from-[#39d3ff] to-[#6ea2ff] disabled:opacity-50"
        >
          {loading ? t('Analyzing…', '分析中…') : t('Generate Safe Plan', '生成安全计划')}
        </button>
      </form>

      {error && <p className="text-xs text-red-300">{error}</p>}

      {result && (
        <div className="space-y-2">
          <p className="text-sm text-white">{result.reply}</p>
          <div className={`rounded-lg border p-2 text-xs ${riskClass(result.risk)}`}>
            <p className="font-semibold uppercase">{result.risk}</p>
          </div>
          <ol className="space-y-2">
            {result.plan.map((step, i) => (
              <li key={`${step.title}-${i}`} className="bg-[#0b1322] border border-[#1f2c42] rounded-lg px-3 py-2">
                <p className="text-sm font-semibold text-[#7fe1ff]">{i + 1}. {step.title}</p>
                <p className="text-xs text-[#8ea0bc] mt-1">{step.detail}</p>
              </li>
            ))}
          </ol>
          <p className="text-xs text-[#8ea0bc]">{result.walletHint}</p>
          <p className="text-xs text-amber-300">{result.disclaimer}</p>
        </div>
      )}
    </section>
  );
}
