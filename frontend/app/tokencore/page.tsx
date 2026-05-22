'use client';

import { useMemo, useState } from 'react';
import { useLocale } from '@/lib/locale';
import { createDemoKeystore, deriveEthereumAccount, initTokenCore } from '@/lib/tokenCore/client';
import { analyzeWithTokenCorePolicy, RiskFinding } from '@/lib/risk/tokenCorePolicy';

function badgeClass(level: RiskFinding['level']) {
  if (level === 'block') return 'border-red-500/40 text-red-300 bg-red-500/10';
  if (level === 'danger') return 'border-orange-500/40 text-orange-300 bg-orange-500/10';
  if (level === 'warning') return 'border-amber-500/40 text-amber-300 bg-amber-500/10';
  return 'border-sky-500/40 text-sky-300 bg-sky-500/10';
}

export default function TokenCorePage() {
  const { t } = useLocale();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('demo-only-password');
  const [keystoreJson, setKeystoreJson] = useState('');
  const [derivedAddress, setDerivedAddress] = useState('');
  const [error, setError] = useState('');

  const [to, setTo] = useState('0x0000000000000000000000000000000000000000');
  const [data, setData] = useState('0x');
  const [contractVerified, setContractVerified] = useState(false);
  const [selectorRecognized, setSelectorRecognized] = useState(true);
  const [simulationFailed, setSimulationFailed] = useState(false);
  const [policyRuleViolated, setPolicyRuleViolated] = useState(false);
  const [hasFullSimulation, setHasFullSimulation] = useState(false);

  const findings = useMemo(() => analyzeWithTokenCorePolicy({
    to,
    data,
    contractVerified,
    selectorRecognized,
    simulationFailed,
    policyRuleViolated,
    hasFullSimulation,
  }), [to, data, contractVerified, selectorRecognized, simulationFailed, policyRuleViolated, hasFullSimulation]);

  return (
    <div className="space-y-6 card-animate">
      <div>
        <h2 className="text-xl font-black text-white">{t('Token Core Workspace', 'Token Core 工作台')}</h2>
        <p className="text-sm text-[#8892a4]">
          {t('Direct hackathon-material integration with @consenlabs/tcx-wasm + Token Core CLI-style policy mapping.', '直接集成黑客松官方材料：@consenlabs/tcx-wasm + Token Core CLI 风控映射。')}
        </p>
      </div>

      <section className="bg-[#0d1525] border border-[#1a2535] rounded-2xl p-4 space-y-3">
        <h3 className="text-sm font-bold text-white">{t('Step 1: Initialize Token Core WASM', '步骤 1：初始化 Token Core WASM')}</h3>
        <button
          onClick={async () => {
            setError('');
            try {
              await initTokenCore();
              setReady(true);
            } catch (e) {
              setError(e instanceof Error ? e.message : String(e));
            }
          }}
          className="px-3 py-2 rounded-lg text-sm font-semibold text-[#06101a] bg-gradient-to-r from-[#39d3ff] to-[#6ea2ff]"
        >
          {ready ? t('Initialized', '已初始化') : t('Initialize Token Core', '初始化 Token Core')}
        </button>
      </section>

      <section className="bg-[#0d1525] border border-[#1a2535] rounded-2xl p-4 space-y-3">
        <h3 className="text-sm font-bold text-white">{t('Step 2: Create demo keystore and derive account', '步骤 2：创建演示 Keystore 并派生账户')}</h3>
        <p className="text-xs text-[#8ea0bc]">{t('Demo/Test use only. Never use real mnemonic or production keys here.', '仅用于演示/测试。请勿在此使用真实助记词或生产密钥。')}</p>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-[#09111f] border border-[#1a2535] text-sm text-white"
          placeholder={t('Enter demo password', '输入演示密码')}
        />
        <div className="flex flex-wrap gap-2">
          <button
            disabled={!ready}
            onClick={async () => {
              setError('');
              try {
                const ks = await createDemoKeystore(password, 'TESTNET');
                setKeystoreJson(ks);
              } catch (e) {
                setError(e instanceof Error ? e.message : String(e));
              }
            }}
            className="px-3 py-2 rounded-lg text-xs font-semibold text-[#06101a] bg-gradient-to-r from-[#39d3ff] to-[#6ea2ff] disabled:opacity-40"
          >
            {t('Create keystore', '创建 Keystore')}
          </button>
          <button
            disabled={!ready || !keystoreJson}
            onClick={async () => {
              setError('');
              try {
                const list = await deriveEthereumAccount({ keystoreJson, key: password, network: 'TESTNET', chainId: '11155111' });
                setDerivedAddress(list?.[0]?.address || '');
              } catch (e) {
                setError(e instanceof Error ? e.message : String(e));
              }
            }}
            className="px-3 py-2 rounded-lg text-xs font-semibold text-[#06101a] bg-gradient-to-r from-[#39d3ff] to-[#6ea2ff] disabled:opacity-40"
          >
            {t('Derive account', '派生账户')}
          </button>
        </div>

        {keystoreJson && (
          <details className="text-xs text-[#a9bdd8]">
            <summary className="cursor-pointer">{t('View keystore JSON (demo)', '查看 Keystore JSON（演示）')}</summary>
            <pre className="mt-2 p-2 rounded bg-[#08101d] overflow-auto max-h-40">{keystoreJson}</pre>
          </details>
        )}

        {derivedAddress && (
          <div className="text-xs rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 p-2 break-all">
            {t('Derived address:', '派生地址：')} {derivedAddress}
          </div>
        )}
      </section>

      <section className="bg-[#0d1525] border border-[#1a2535] rounded-2xl p-4 space-y-3">
        <h3 className="text-sm font-bold text-white">{t('Step 3: Token Core CLI-style risk analysis mapping', '步骤 3：Token Core CLI 风控映射')}</h3>
        <p className="text-xs text-[#8ea0bc]">
          {t('This mirrors hackathon policy semantics: unverified contract / unknown selector / simulation fail / policy violation.', '映射官方风控语义：未验证合约 / 未知 selector / 模拟失败 / policy 违规。')}
        </p>

        <input value={to} onChange={(e) => setTo(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-[#09111f] border border-[#1a2535] text-xs text-white" placeholder="to" />
        <textarea value={data} onChange={(e) => setData(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-[#09111f] border border-[#1a2535] text-xs text-white min-h-[90px]" placeholder="0x..." />

        <div className="grid grid-cols-2 gap-2 text-xs text-[#c9d8eb]">
          <label className="flex items-center gap-2"><input type="checkbox" checked={contractVerified} onChange={(e) => setContractVerified(e.target.checked)} /> {t('Contract verified', '合约已验证')}</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={selectorRecognized} onChange={(e) => setSelectorRecognized(e.target.checked)} /> {t('Selector recognized', 'Selector 可识别')}</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={simulationFailed} onChange={(e) => setSimulationFailed(e.target.checked)} /> {t('Simulation failed', '模拟失败')}</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={policyRuleViolated} onChange={(e) => setPolicyRuleViolated(e.target.checked)} /> {t('Policy violated', 'Policy 违规')}</label>
          <label className="flex items-center gap-2 col-span-2"><input type="checkbox" checked={hasFullSimulation} onChange={(e) => setHasFullSimulation(e.target.checked)} /> {t('Full external simulation context available', '已有完整外部模拟上下文')}</label>
        </div>

        <div className="space-y-2">
          {findings.map((f, idx) => (
            <div key={`${f.level}-${idx}`} className={`rounded-lg border p-2 text-xs ${badgeClass(f.level)}`}>
              <p className="font-semibold uppercase tracking-wide">{f.level}</p>
              <p className="font-semibold mt-1">{f.title}</p>
              <p className="mt-1">{f.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {error && <div className="text-xs rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 p-2">{error}</div>}
    </div>
  );
}
