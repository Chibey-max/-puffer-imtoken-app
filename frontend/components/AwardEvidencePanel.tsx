'use client';

import { useLocale } from '@/lib/locale';

export default function AwardEvidencePanel() {
  const { t } = useLocale();

  const items = [
    {
      titleEn: 'Best User Control',
      titleZh: '最佳用户掌控',
      detailEn: 'Self-custody flow, explicit signature gates, and no hidden auto-execution.',
      detailZh: '自托管流程、显式签名关口、无隐藏自动执行。',
    },
    {
      titleEn: 'Best Security Design',
      titleZh: '最佳安全设计',
      detailEn: 'Pre-sign risk labels, network guardrails, and key-handling boundaries.',
      detailZh: '签名前风险标签、网络护栏与密钥边界约束。',
    },
    {
      titleEn: 'Best On-chain Scenario',
      titleZh: '最佳链上场景',
      detailEn: 'ETH/stETH/wstETH → pufETH with status tracking and transparent contract refs.',
      detailZh: 'ETH/stETH/wstETH → pufETH，带状态追踪与透明合约信息。',
    },
    {
      titleEn: 'Best AI Wallet',
      titleZh: '最佳 AI 钱包',
      detailEn: 'Intent assistant explains actions but never signs or broadcasts transactions.',
      detailZh: '意图助手仅解释与规划，不会签名或广播交易。',
    },
  ];

  return (
    <section className="dex-card rounded-xl p-4 space-y-3 card-animate">
      <div>
        <p className="text-xs text-[#8ea0bc] uppercase tracking-wider">{t('Award Evidence', '奖项能力映射')}</p>
        <h3 className="text-base font-bold text-white mt-1">{t('How this build targets multiple awards', '该版本如何覆盖多项奖项')}</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {items.map((item) => (
          <div key={item.titleEn} className="bg-[#0b1322] border border-[#1f2c42] rounded-lg px-3 py-2">
            <p className="text-sm font-semibold text-[#7fe1ff]">{t(item.titleEn, item.titleZh)}</p>
            <p className="text-xs text-[#8ea0bc] mt-1">{t(item.detailEn, item.detailZh)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
