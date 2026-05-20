'use client';

export default function SecurityPage() {
  return (
    <div className="space-y-6 card-animate">
      <div>
        <h2 className="text-xl font-black text-white">Security Center</h2>
        <p className="text-sm text-[#8892a4]">Built with imToken hackathon security guidance from token-ui risk-control materials.</p>
      </div>

      <section className="bg-[#0d1525] border border-[#1a2535] rounded-2xl p-4 space-y-3">
        <h3 className="text-sm font-bold text-white">Your funds, your control</h3>
        <ul className="space-y-2 text-xs text-[#8892a4]">
          <li>• Wallet keys are never handled by this app backend.</li>
          <li>• Transactions require explicit wallet signature approval.</li>
          <li>• Transaction hashes are shown for independent on-chain verification.</li>
          <li>• Network guardrails enforce Ethereum Mainnet for staking actions.</li>
        </ul>
      </section>

      <section className="bg-[#0d1525] border border-[#1a2535] rounded-2xl p-4 space-y-3">
        <h3 className="text-sm font-bold text-white">Anti-risk checklist</h3>
        <ul className="space-y-2 text-xs text-[#8892a4]">
          <li>• Verify destination contract addresses before confirming.</li>
          <li>• Review token approvals and transaction data in your wallet prompt.</li>
          <li>• Use a dedicated wallet for demos and limited-value testing.</li>
          <li>• Never paste real mnemonic/private keys into any dApp or AI tool.</li>
        </ul>
      </section>

      <section className="bg-[#0d1525] border border-[#1a2535] rounded-2xl p-4 md:p-5 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white">Hackathon challenge coverage</h3>
          <p className="text-xs text-[#8ea0bc] mt-1">Judge-focused checklist mapped to implemented features.</p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <article className="rounded-xl border border-[#244063] bg-gradient-to-b from-[#10233b] to-[#0b1a2d] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[#9fc2ea] uppercase tracking-[0.14em] text-[10px]">Base challenge</p>
              <span className="text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/35 text-emerald-300 bg-emerald-500/10">Complete</span>
            </div>
            <ul className="space-y-2 text-xs text-[#d4e2f5] leading-relaxed">
              <li>✓ Wallet connect with network guardrails</li>
              <li>✓ Stake ETH / stETH / wstETH to mint pufETH</li>
              <li>✓ Live rates, balances, and tx verification links</li>
            </ul>
          </article>

          <article className="rounded-xl border border-[#244063] bg-gradient-to-b from-[#10233b] to-[#0b1a2d] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[#9fc2ea] uppercase tracking-[0.14em] text-[10px]">Advanced challenge</p>
              <span className="text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/35 text-emerald-300 bg-emerald-500/10">Enabled</span>
            </div>
            <ul className="space-y-2 text-xs text-[#d4e2f5] leading-relaxed">
              <li>✓ DEX aggregator quote + execution path</li>
              <li>✓ One-click any-token → pufETH flow</li>
              <li>✓ Graceful fallbacks for liquidity and gas constraints</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="bg-[#001a2e] border border-[#00d4ff]/20 rounded-2xl p-4 space-y-2">
        <h3 className="text-sm font-bold text-white">Reference materials</h3>
        <div className="space-y-1 text-xs">
          <a className="text-[#00d4ff] underline" href="https://github.com/consenlabs/token-ui/tree/main/security" target="_blank" rel="noopener noreferrer">
            token-ui security materials ↗
          </a>
          <a className="text-[#00d4ff] underline" href="https://github.com/consenlabs/token-core-monorepo" target="_blank" rel="noopener noreferrer">
            token-core monorepo ↗
          </a>
        </div>
      </section>
    </div>
  );
}
