'use client';

import { useLocale } from '@/lib/locale';

export default function DemoRoomPage() {
  const { t } = useLocale();

  const rows = [
    {
      nameEn: 'Transaction execution',
      nameZh: '交易执行',
      liveEn: 'Real wallet signature + on-chain broadcast',
      liveZh: '真实钱包签名 + 链上广播',
      protoEn: 'Simulated lifecycle only',
      protoZh: '仅模拟交易生命周期',
    },
    {
      nameEn: 'Risk checks',
      nameZh: '风险检查',
      liveEn: 'Pre-sign risk mapping visible before confirmation',
      liveZh: '确认前展示风险映射',
      protoEn: 'Same checks + simulation notice',
      protoZh: '同样检查 + 模拟提示',
    },
    {
      nameEn: 'AI assistant behavior',
      nameZh: 'AI 助手行为',
      liveEn: 'Advisory only, no auto-signing',
      liveZh: '仅建议，不会自动签名',
      protoEn: 'Advisory only, no broadcasting',
      protoZh: '仅建议，不会广播交易',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="dex-card rounded-xl p-4 card-animate">
        <h1 className="text-xl font-black text-white">{t('Demo Data Room', '演示资料室')}</h1>
        <p className="text-sm text-[#8ea0bc] mt-1">
          {t('Judge-facing summary of architecture, safety boundaries, and mode behavior.', '面向评审的架构、边界与模式行为总览。')}
        </p>
      </div>

      <section className="dex-card rounded-xl p-4 space-y-2 card-animate">
        <p className="text-xs text-[#8ea0bc] uppercase tracking-wider">{t('Token Core Evidence', 'Token Core 证明')}</p>
        <ul className="text-xs text-[#c4d7ee] space-y-1.5">
          <li>• {t('Token Core WASM init + demo keystore + account derivation at /tokencore', '/tokencore 页面支持 Token Core WASM 初始化、演示 keystore 与派生')}</li>
          <li>• {t('CLI-style policy risk mapping integrated into pre-sign flow', 'CLI 风格风险映射已接入签名前流程')}</li>
          <li>• {t('User keeps final signing control in wallet', '用户始终在钱包内掌握最终签名控制')}</li>
        </ul>
      </section>

      <section className="dex-card rounded-xl p-4 card-animate overflow-auto">
        <p className="text-xs text-[#8ea0bc] uppercase tracking-wider mb-2">{t('Live vs Prototype', '实时模式 vs 原型模式')}</p>
        <table className="w-full text-xs min-w-[520px]">
          <thead>
            <tr className="text-left text-[#8ea0bc] border-b border-[#1f2c42]">
              <th className="py-2">{t('Capability', '能力')}</th>
              <th className="py-2">{t('Live', '实时')}</th>
              <th className="py-2">{t('Prototype', '原型')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.nameEn} className="border-b border-[#142036]">
                <td className="py-2 text-white">{t(r.nameEn, r.nameZh)}</td>
                <td className="py-2 text-[#9ed8ff]">{t(r.liveEn, r.liveZh)}</td>
                <td className="py-2 text-[#ffd48a]">{t(r.protoEn, r.protoZh)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
