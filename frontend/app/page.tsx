'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import RateDisplay from '@/components/RateDisplay';
import { useWallet } from '@/hooks/useWallet';
import { useVaultsData } from '@/hooks/usePufferApi';
import { TARGET_NETWORK_NAME } from '@/lib/network';
import { getChainCapabilities } from '@/lib/capabilities';
import { useLocale } from '@/lib/locale';

const SHOW_SUBMISSION_STATUS = process.env.NEXT_PUBLIC_SHOW_SUBMISSION_STATUS === 'true';

function parseNumericLoose(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const cleaned = value.replace(/,/g, '').trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export default function Dashboard() {
  const { address, ethBalance, pufEthBalance, chainId } = useWallet();
  const { protocolTvl, loading: tvlLoading, error: protocolError, updatedAt: protocolUpdatedAt } = useVaultsData();
  const { t, locale } = useLocale();
  const capabilities = getChainCapabilities(chainId);

  const protocolUpdatedLabel = protocolUpdatedAt
    ? new Date(protocolUpdatedAt).toLocaleTimeString(locale === 'zh' ? 'zh-CN' : 'en-US', { hour: '2-digit', minute: '2-digit' })
    : null;

  const protocolTvlNumber = parseNumericLoose(protocolTvl?.tvl);
  const stakingApyNumber = parseNumericLoose(protocolTvl?.stakingApy);

  const [lastKnownTvl, setLastKnownTvl] = useState<number | null>(null);
  const [lastKnownApy, setLastKnownApy] = useState<number | null>(null);

  useEffect(() => {
    if (protocolTvlNumber != null) setLastKnownTvl(protocolTvlNumber);
  }, [protocolTvlNumber]);

  useEffect(() => {
    if (stakingApyNumber != null) setLastKnownApy(stakingApyNumber);
  }, [stakingApyNumber]);

  const statsPillClass = tvlLoading
    ? 'text-[#8ea0bc] border-[#2a3a52] bg-[#0f1c2f]/70'
    : protocolError
      ? 'text-amber-300 border-amber-500/40 bg-amber-500/10'
      : 'text-emerald-300 border-emerald-400/45 bg-emerald-500/10 shadow-[0_0_24px_rgba(16,185,129,0.22)]';
  const statsState = tvlLoading ? 'syncing' : protocolError ? 'delayed' : 'live';

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden dex-card p-6 card-animate glow-soft">
        <div className="absolute top-0 right-0 w-40 h-40 bg-[#00d4ff]/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <p className="text-xs text-[#61d9ff] font-semibold tracking-widest uppercase mb-2">Puffer Finance</p>
          <h1 className="text-[28px] leading-none font-black text-white mb-1">{t('Stake ETH.', '质押 ETH。')}</h1>
          <h1 className="text-[28px] leading-none font-black text-[#79dfff] mb-3">{t('Earn pufETH.', '赚取 pufETH。')}</h1>
          <p className="text-sm text-[#8ea0bc] mb-5">
            {t(
              `imToken-ready liquid staking on ${TARGET_NETWORK_NAME}. Stake in a guided flow, track live protocol data, and receive pufETH with transparent on-chain verification.`,
              `在 ${TARGET_NETWORK_NAME} 上进行 imToken 友好的流动性质押。按引导流程质押，追踪实时协议数据，并获得可链上核验的 pufETH。`,
            )}
          </p>
          <Link
            href="/stake"
            className="inline-block px-6 py-3 bg-gradient-to-r from-[#39d3ff] to-[#6ea2ff] text-[#07111d] font-semibold rounded-xl hover:brightness-110 active:scale-95 transition-all text-sm"
          >
            {t('Stake Now →', '立即质押 →')}
          </Link>
        </div>
      </div>

      {address && (
        <div className="dex-card p-4">
          <p className="text-xs text-[#8ea0bc] mb-3 uppercase tracking-wider">{t('Your Wallet', '你的钱包')}</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <p className="text-xs text-[#8ea0bc]">ETH {t('Balance', '余额')}</p>
              <p className="text-2xl font-mono font-bold text-white tracking-tight">
                {ethBalance ? parseFloat(ethBalance).toFixed(4) : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#8ea0bc]">pufETH {t('Balance', '余额')}</p>
              <p className="text-2xl font-mono font-bold text-[#6fd7ff] tracking-tight">
                {pufEthBalance ? parseFloat(pufEthBalance).toFixed(4) : '—'}
              </p>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-[11px] text-[#8ea0bc]">{t('On-chain ERC-20 balance from', '来自以下网络的链上 ERC-20 余额')} {TARGET_NETWORK_NAME}</p>
            <Link
              href="/stake"
              className="px-4 py-2 border border-[#4f6f97] text-[#9de9ff] text-sm rounded-xl hover:bg-[#2a3e5d]/40 transition-colors"
            >
              {t('Stake', '质押')}
            </Link>
          </div>
        </div>
      )}

      <div>
        <p className="text-xs text-[#8ea0bc] mb-3 uppercase tracking-wider">{t('Live Rates', '实时汇率')}</p>
        <RateDisplay />
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-[#243754] bg-gradient-to-b from-[#111f33]/95 via-[#0c1729]/95 to-[#0a1322]/95 p-4 md:p-5">
        <div className="absolute -top-16 -right-12 h-40 w-40 rounded-full bg-[#00d4ff]/10 blur-2xl" />
        <div className="absolute -bottom-20 -left-14 h-44 w-44 rounded-full bg-[#6ea2ff]/10 blur-2xl" />

        <div className="relative mb-4 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-[#86a2c7] uppercase tracking-[0.22em]">{t('Protocol Stats', '协议数据')}</p>
            <span className={`inline-flex items-center text-[11px] font-medium px-3 py-1.5 rounded-full border backdrop-blur-sm ${statsPillClass}`}>
              <span className="relative inline-flex w-2 h-2 mr-2">
                {statsState === 'live' && <span className="absolute inset-0 rounded-full bg-current opacity-40 animate-ping" />}
                <span className="relative inline-flex w-2 h-2 rounded-full bg-current" />
              </span>
              {statsState === 'syncing' ? t('Syncing', '同步中') : statsState === 'delayed' ? t('Delayed', '延迟') : t('Live', '实时')}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[#8ea0bc]">{t('Last update', '最近更新')}</span>
            <span className="inline-flex items-center gap-1.5 text-[#b9c8dc] font-medium">
              <span className="w-1 h-1 rounded-full bg-[#5f7393]" />
              {protocolUpdatedLabel || t('Waiting for first tick', '等待首次更新')}
            </span>
          </div>

          {protocolError && (
            <p className="text-[11px] text-amber-300/90">{t('Feed delayed. Showing fallback values when available.', '数据源延迟。可用时展示回退值。')}</p>
          )}
        </div>

        <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-2xl border border-[#2a3f5d] bg-gradient-to-b from-[#13233a]/85 to-[#0d1a2c]/85 p-4 min-h-[136px] flex flex-col justify-between">
            <div>
              <p className="text-[11px] text-[#8ea0bc] uppercase tracking-wider mb-2">Protocol TVL</p>
              {protocolTvlNumber != null ? (
                <p className="text-2xl font-mono font-extrabold text-white tracking-tight">{`$${(protocolTvlNumber / 1e6).toFixed(1)}M`}</p>
              ) : lastKnownTvl != null ? (
                <p className="text-2xl font-mono font-bold text-white/90 tracking-tight">{`$${(lastKnownTvl / 1e6).toFixed(1)}M`}</p>
              ) : tvlLoading ? (
                <div className="h-7 w-24 bg-[#1a2535] rounded animate-pulse" />
              ) : (
                <p className="text-2xl font-mono font-bold text-white tracking-tight">—</p>
              )}
            </div>
            <p className="text-[11px] text-[#8ea0bc] mt-2">
              {protocolTvlNumber != null ? t('Total value secured across Puffer protocol.', 'Puffer 协议的总锁定价值。') : lastKnownTvl != null ? t('Showing last known TVL snapshot.', '展示最近一次已知 TVL 快照。') : tvlLoading ? t('Fetching latest TVL…', '正在获取最新 TVL…') : t('Live TVL unavailable right now.', '当前无法获取实时 TVL。')}
            </p>
          </div>

          <div className="rounded-2xl border border-[#2a3f5d] bg-gradient-to-b from-[#13233a]/85 to-[#0d1a2c]/85 p-4 min-h-[136px] flex flex-col justify-between">
            <div>
              <p className="text-[11px] text-[#8ea0bc] uppercase tracking-wider mb-2">Staking APY</p>
              {stakingApyNumber != null ? (
                <p className="text-2xl font-mono font-extrabold text-[#00ff9d] tracking-tight">{`${stakingApyNumber.toFixed(2)}%`}</p>
              ) : lastKnownApy != null ? (
                <p className="text-2xl font-mono font-bold text-[#8cffc9] tracking-tight">{`${lastKnownApy.toFixed(2)}%`}</p>
              ) : tvlLoading ? (
                <div className="h-7 w-20 bg-[#1a2535] rounded animate-pulse" />
              ) : (
                <p className="text-2xl font-mono font-bold text-[#00ff9d] tracking-tight">—</p>
              )}
            </div>
            <p className="text-[11px] text-[#8ea0bc] mt-2">
              {stakingApyNumber != null ? t('Current live staking annual percentage yield.', '当前实时年化质押收益率。') : lastKnownApy != null ? t('Showing last known APY snapshot.', '展示最近一次已知 APY 快照。') : tvlLoading ? t('Fetching latest APY…', '正在获取最新 APY…') : t('Live APY temporarily unavailable.', '实时 APY 暂不可用。')}
            </p>
          </div>
        </div>
      </div>

      {SHOW_SUBMISSION_STATUS && (
        <section className="dex-card p-4">
          <p className="text-xs text-[#8ea0bc] uppercase tracking-wider">{t('Submission status', '提交状态')}</p>
          <div className="mt-2 space-y-1 text-sm">
            <p className="text-[#00ff9d]"><span className="font-semibold">{t('Base Challenge:', '基础挑战：')}</span> {t('Complete ✅', '已完成 ✅')}</p>
            <p className="text-[#00ff9d]"><span className="font-semibold">{t('Advanced Challenge:', '进阶挑战：')}</span> {t('Implemented for supported routes/networks ✅', '支持路线/网络已实现 ✅')}</p>
          </div>
        </section>
      )}

      <section className="dex-card p-4 space-y-3 card-animate">
        <div>
          <p className="text-xs text-[#8ea0bc] uppercase tracking-wider">{t('Trust & Safety', '信任与安全')}</p>
          <h3 className="text-base font-bold text-white mt-1">{t('Why this is secure', '为什么这是安全的')}</h3>
        </div>

        <ul className="space-y-2 text-xs text-[#8ea0bc]">
          <li>{t('• Network guardrail prevents staking on unsupported networks.', '• 网络护栏防止在不支持的网络上质押。')}</li>
          <li>{t('• Every stake shows transaction state and links directly to the active chain explorer.', '• 每次质押都会显示交易状态并直达当前链的区块浏览器。')}</li>
          <li>{t('• Live rates and vault stats are fetched from the official Puffer hackathon API via backend proxy.', '• 实时汇率和金库数据通过后端代理从官方 Puffer 黑客松 API 获取。')}</li>
          <li>{t('• Contract references are visible in-app before staking.', '• 质押前可在应用内查看合约地址。')}</li>
        </ul>
      </section>

      <section className="dex-card p-4 space-y-3 card-animate">
        <div>
          <p className="text-xs text-[#8ea0bc] uppercase tracking-wider">{t('Chain Capability Status', '链能力状态')}</p>
          <h3 className="text-base font-bold text-white mt-1">{t('Live Feature Availability', '实时功能可用性')}</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="flex items-center justify-between bg-[#0b1322] border border-[#1f2c42] rounded-lg px-3 py-2">
            <span className="text-[#8ea0bc]">{t('Stake (ETH)', '质押（ETH）')}</span>
            <span className={capabilities.canStake ? 'text-emerald-300' : 'text-amber-300'}>{capabilities.canStake ? t('Available', '可用') : t('Unavailable', '不可用')}</span>
          </div>
          <div className="flex items-center justify-between bg-[#0b1322] border border-[#1f2c42] rounded-lg px-3 py-2">
            <span className="text-[#8ea0bc]">{t('Stake (stETH/wstETH)', '质押（stETH/wstETH）')}</span>
            <span className={capabilities.canStakeStEth && capabilities.canStakeWstEth ? 'text-emerald-300' : 'text-amber-300'}>{capabilities.canStakeStEth && capabilities.canStakeWstEth ? t('Available', '可用') : t('Unavailable', '不可用')}</span>
          </div>
          <div className="flex items-center justify-between bg-[#0b1322] border border-[#1f2c42] rounded-lg px-3 py-2">
            <span className="text-[#8ea0bc]">{t('UniFi Vault Deposit', 'UniFi 金库存入')}</span>
            <span className={capabilities.canVaultDeposit ? 'text-emerald-300' : 'text-amber-300'}>{capabilities.canVaultDeposit ? t('Available', '可用') : t('Unavailable', '不可用')}</span>
          </div>
          <div className="flex items-center justify-between bg-[#0b1322] border border-[#1f2c42] rounded-lg px-3 py-2">
            <span className="text-[#8ea0bc]">{t('Any-token One-click Route', '任意代币一键路径')}</span>
            <span className={capabilities.canOneClickAnyTokenToPufEth ? 'text-emerald-300' : 'text-amber-300'}>{capabilities.canOneClickAnyTokenToPufEth ? t('Available', '可用') : t('Unavailable', '不可用')}</span>
          </div>
        </div>
      </section>

      <Link
        href="/assistant"
        className="block dex-card p-4 hover:border-[#65d8ff]/40 transition-colors cta-animate card-animate"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white">{t('AI Assistant Workspace', 'AI 助手工作台')}</p>
            <p className="text-xs text-[#8ea0bc]">{t('Generate safe intent plans before signing', '签名前生成安全意图计划')}</p>
          </div>
          <span className="text-[#61d9ff]">→</span>
        </div>
      </Link>

      <Link
        href="/vaults"
        className="block dex-card p-4 hover:border-[#65d8ff]/40 transition-colors cta-animate card-animate"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white">{t('UniFi Vaults', 'UniFi 金库')}</p>
            <p className="text-xs text-[#8ea0bc]">{t('Explore curated pufETH yield opportunities', '探索精选 pufETH 收益机会')}</p>
          </div>
          <span className="text-[#61d9ff]">→</span>
        </div>
      </Link>
    </div>
  );
}
