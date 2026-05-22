'use client';

import { useLocale } from '@/lib/locale';
import { useWallet } from '@/hooks/useWallet';
import { getChainCapabilities } from '@/lib/capabilities';
import { TARGET_NETWORK_NAME } from '@/lib/network';

export default function SecurityPage() {
  const { t } = useLocale();
  const { chainId } = useWallet();
  const capabilities = getChainCapabilities(chainId);

  return (
    <div className="space-y-6 card-animate">
      <div>
        <h2 className="text-xl font-black text-white">{t('Security Center', '安全中心')}</h2>
        <p className="text-sm text-[#8892a4]">{t('Built with imToken hackathon security guidance from token-ui risk-control materials.', '基于 imToken 黑客松 token-ui 风控安全指引构建。')}</p>
      </div>

      <section className="bg-[#0d1525] border border-[#1a2535] rounded-2xl p-4 space-y-3">
        <h3 className="text-sm font-bold text-white">{t('Your funds, your control', '你的资金，你来掌控')}</h3>
        <ul className="space-y-2 text-xs text-[#8892a4]">
          <li>{t('• Wallet keys are never handled by this app backend.', '• 本应用后端绝不会接触钱包私钥。')}</li>
          <li>{t('• Transactions require explicit wallet signature approval.', '• 所有交易都需要钱包明确签名授权。')}</li>
          <li>{t('• Transaction hashes are shown for independent on-chain verification.', '• 展示交易哈希，便于独立链上核验。')}</li>
          <li>{t(`• Network guardrails enforce ${TARGET_NETWORK_NAME} and block unsupported actions.`, `• 网络护栏会强制使用 ${TARGET_NETWORK_NAME} 并阻止不支持的操作。`)}</li>
        </ul>
      </section>

      <section className="bg-[#0d1525] border border-[#1a2535] rounded-2xl p-4 space-y-3">
        <h3 className="text-sm font-bold text-white">{t('Anti-risk checklist', '风险检查清单')}</h3>
        <ul className="space-y-2 text-xs text-[#8892a4]">
          <li>{t('• Verify destination contract addresses before confirming.', '• 确认前请核对目标合约地址。')}</li>
          <li>{t('• Review token approvals and transaction data in your wallet prompt.', '• 在钱包弹窗中检查授权与交易数据。')}</li>
          <li>{t('• Use a dedicated wallet for demos and limited-value testing.', '• 演示和小额测试建议使用独立钱包。')}</li>
          <li>{t('• Never paste real mnemonic/private keys into any dApp or AI tool.', '• 切勿把真实助记词/私钥粘贴到任何 dApp 或 AI 工具。')}</li>
        </ul>
      </section>

      <section className="bg-[#0d1525] border border-[#1a2535] rounded-2xl p-4 md:p-5 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white">{t('Hackathon challenge coverage', '黑客松挑战覆盖')}</h3>
          <p className="text-xs text-[#8ea0bc] mt-1">{t('Judge-focused checklist mapped to implemented features.', '面向评审的功能覆盖清单。')}</p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <article className="rounded-xl border border-[#244063] bg-gradient-to-b from-[#10233b] to-[#0b1a2d] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[#9fc2ea] uppercase tracking-[0.14em] text-[10px]">{t('Base challenge', '基础挑战')}</p>
              <span className="text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/35 text-emerald-300 bg-emerald-500/10">{t('Complete', '已完成')}</span>
            </div>
            <ul className="space-y-2 text-xs text-[#d4e2f5] leading-relaxed">
              <li>{t('✓ Wallet connect with network guardrails', '✓ 带网络护栏的钱包连接')}</li>
              <li>{t('✓ Stake ETH / stETH / wstETH to mint pufETH', '✓ 质押 ETH / stETH / wstETH 铸造 pufETH')}</li>
              <li>{t('✓ Live rates, balances, and tx verification links', '✓ 实时汇率、余额与交易核验链接')}</li>
            </ul>
          </article>

          <article className="rounded-xl border border-[#244063] bg-gradient-to-b from-[#10233b] to-[#0b1a2d] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[#9fc2ea] uppercase tracking-[0.14em] text-[10px]">{t('Advanced challenge', '进阶挑战')}</p>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${capabilities.canOneClickAnyTokenToPufEth ? 'border-emerald-500/35 text-emerald-300 bg-emerald-500/10' : 'border-amber-500/35 text-amber-300 bg-amber-500/10'}`}>{capabilities.canOneClickAnyTokenToPufEth ? t('Enabled', '已启用') : t('Unavailable', '不可用')}</span>
            </div>
            <ul className="space-y-2 text-xs text-[#d4e2f5] leading-relaxed">
              <li>{capabilities.canAdvancedSwapAggregator ? t('✓ DEX aggregator quote + execution path', '✓ DEX 聚合器报价与执行路径') : t('• DEX aggregator execution is blocked on unsupported chain', '• 不支持链上已阻止 DEX 聚合执行')}</li>
              <li>{capabilities.canOneClickAnyTokenToPufEth ? t('✓ One-click any-token → pufETH flow', '✓ 一键任意代币 → pufETH') : t('• One-click any-token → pufETH is unavailable on current network', '• 当前网络不支持一键 任意代币 → pufETH')}</li>
              <li>{t('✓ Graceful fallbacks for liquidity and gas constraints', '✓ 流动性与 Gas 限制下的优雅降级')}</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="bg-[#001a2e] border border-[#00d4ff]/20 rounded-2xl p-4 space-y-2">
        <h3 className="text-sm font-bold text-white">{t('Reference materials', '参考资料')}</h3>
        <div className="space-y-1 text-xs">
          <a className="text-[#00d4ff] underline" href="/tokencore">
            {t('Open in-app Token Core workspace ↗', '打开应用内 Token Core 工作台 ↗')}
          </a>
          <a className="text-[#00d4ff] underline" href="https://github.com/consenlabs/token-ui/tree/main/security" target="_blank" rel="noopener noreferrer">
            token-ui security materials ↗
          </a>
          <a className="text-[#00d4ff] underline" href="https://github.com/consenlabs/token-core-monorepo/tree/tenth-anniversary/token-core/tcx-wasm" target="_blank" rel="noopener noreferrer">
            token-core tcx-wasm ↗
          </a>
          <a className="text-[#00d4ff] underline" href="https://github.com/consenlabs/token-core-monorepo/tree/demo/token-core-cli/token-core/tcx-examples/cli" target="_blank" rel="noopener noreferrer">
            token-core cli demo ↗
          </a>
        </div>
      </section>
    </div>
  );
}
