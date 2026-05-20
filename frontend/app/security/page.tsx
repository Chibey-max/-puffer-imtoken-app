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
