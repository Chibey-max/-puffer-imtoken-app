'use client';

import { useLocale } from '@/lib/locale';

export default function DemoStepper() {
  const { t } = useLocale();
  const steps = [
    t('1) Define staking intent', '1）定义质押意图'),
    t('2) Review risk + route preview', '2）查看风险与路径预览'),
    t('3) Confirm in wallet (or prototype simulation)', '3）钱包确认（或原型模拟）'),
    t('4) Verify pufETH result + vault opportunity', '4）核验 pufETH 结果与金库机会'),
  ];

  return (
    <section className="dex-card rounded-xl p-4 space-y-2 card-animate">
      <p className="text-xs text-[#8ea0bc] uppercase tracking-wider">{t('Award Demo Flow', '评审演示流程')}</p>
      <ul className="space-y-1.5">
        {steps.map((s, idx) => (
          <li key={idx} className="text-xs text-[#c4d7ee] flex gap-2">
            <span className="text-[#61d9ff]">•</span>
            <span>{s}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
