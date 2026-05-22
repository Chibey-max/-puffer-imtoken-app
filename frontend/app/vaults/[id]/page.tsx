'use client';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { BrowserProvider, Contract, Eip1193Provider, parseUnits } from 'ethers';
import { Token, UnifiToken } from '@pufferfinance/puffer-sdk';
import { VAULTS } from '@/lib/puffer';
import { useVaultsData } from '@/hooks/usePufferApi';
import { useLocale } from '@/lib/locale';
import { useWallet } from '@/hooks/useWallet';
import { usePufferClient } from '@/hooks/usePufferClient';
import { getChainCapabilities } from '@/lib/capabilities';
import { TARGET_NETWORK_NAME } from '@/lib/network';
import { txExplorerUrl } from '@/lib/explorer';

export default function VaultDetail({ params }: { params: { id: string } }) {
  const { id } = params;
  const vault = VAULTS.find(v => v.id === id);
  const { t } = useLocale();
  if (!vault) notFound();

  const { apy, tvl } = useVaultsData();
  const { address, isMainnet, switchToMainnet, chainId } = useWallet();
  const { client, init } = usePufferClient();
  const pufferClient = client || init();
  const capabilities = getChainCapabilities(chainId);
  const [depositAmount, setDepositAmount] = useState('');
  const [txStatus, setTxStatus] = useState<'idle' | 'approving' | 'depositing' | 'submitted' | 'confirmed' | 'error'>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  const unifiToken = useMemo(() => {
    if (vault.id === 'unifiETH') return UnifiToken.unifiETH;
    if (vault.id === 'unifiUSD') return UnifiToken.unifiUSD;
    if (vault.id === 'unifiBTC') return UnifiToken.unifiBTC;
    return UnifiToken.pufETHs;
  }, [vault.id]);

  const canDepositLive = capabilities.canVaultDeposit && isMainnet;

  const submitDeposit = async () => {
    if (!address) {
      setTxError(t('Connect wallet first.', '请先连接钱包。'));
      setTxStatus('error');
      return;
    }
    if (!canDepositLive) {
      setTxError(t(`Vault deposit is currently unavailable on ${TARGET_NETWORK_NAME}.`, `${TARGET_NETWORK_NAME} 当前暂不可用金库存入。`));
      setTxStatus('error');
      return;
    }
    if (!pufferClient) {
      setTxError(t('Puffer client not initialized.', 'Puffer 客户端未初始化。'));
      setTxStatus('error');
      return;
    }

    const amountNum = Number(depositAmount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setTxError(t('Enter a valid deposit amount.', '请输入有效的存入数量。'));
      setTxStatus('error');
      return;
    }

    try {
      setTxError(null);
      setTxHash(null);
      const provider = new BrowserProvider(window.ethereum as Eip1193Provider);
      const signer = await provider.getSigner();
      const owner = await signer.getAddress();

      const amountWei = parseUnits(depositAmount, 18);
      const tellerHandler = pufferClient.nucleusTeller.withToken(unifiToken);
      const tellerAddress = (tellerHandler.getContract() as { address: string }).address;

      const pufTokenAddress = pufferClient.erc20Permit.withToken(Token.pufETH).getContract().address as string;
      const erc20 = new Contract(
        pufTokenAddress,
        [
          'function allowance(address owner, address spender) view returns (uint256)',
          'function approve(address spender, uint256 amount) returns (bool)',
        ],
        signer,
      );

      const allowance = (await erc20.allowance(owner, tellerAddress)) as bigint;
      if (allowance < amountWei) {
        setTxStatus('approving');
        const approveTx = await erc20.approve(tellerAddress, amountWei);
        await approveTx.wait(1);
      }

      setTxStatus('depositing');
      const { transact } = await tellerHandler.deposit({
        account: owner as `0x${string}`,
        token: Token.pufETH,
        unifiToken,
        amount: amountWei,
        minimumMint: BigInt(0),
        isPreapproved: true,
      });

      const hash = await transact();
      setTxHash(hash);
      setTxStatus('submitted');

      const receipt = await provider.waitForTransaction(hash, 1, 120_000);
      if (receipt?.status === 1) {
        setTxStatus('confirmed');
      } else {
        setTxError(t('Vault deposit failed on-chain.', '金库存入在链上执行失败。'));
        setTxStatus('error');
      }
    } catch (err: unknown) {
      const msg = (err as { shortMessage?: string; message?: string })?.shortMessage || (err as { message?: string })?.message || t('Vault deposit failed. Please try again.', '金库存入失败，请重试。');
      setTxError(msg);
      setTxStatus('error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/vaults" className="text-[#8892a4] hover:text-white">←</Link>
        <div>
          <h2 className="text-xl font-black text-white">{vault.name}</h2>
          <p className="text-sm text-[#8892a4]">{vault.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#0d1525] border border-[#1a2535] rounded-xl p-4">
          <p className="text-xs text-[#8892a4] mb-1">APY</p>
          <p className="text-2xl font-mono font-bold" style={{ color: vault.color }}>
            {apy?.[vault.id] != null ? `${apy[vault.id].toFixed(2)}%` : '—'}
          </p>
        </div>
        <div className="bg-[#0d1525] border border-[#1a2535] rounded-xl p-4">
          <p className="text-xs text-[#8892a4] mb-1">TVL</p>
          <p className="text-2xl font-mono font-bold text-white">
            {tvl?.[vault.id] ? `$${(parseFloat(tvl[vault.id]) / 1e6).toFixed(1)}M` : '—'}
          </p>
        </div>
      </div>

      <div className="bg-[#0d1525] border border-[#1a2535] rounded-xl p-4 space-y-2">
        <p className="text-xs text-[#8892a4] uppercase tracking-wider font-semibold">{t('Vault Details', '金库详情')}</p>
        <div className="space-y-2 text-xs font-mono">
          <div className="flex justify-between">
            <span className="text-[#8892a4]">Vault</span>
            <span className="text-white truncate ml-4">{vault.vault.slice(0, 10)}…</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#8892a4]">Teller</span>
            <span className="text-white truncate ml-4">{vault.teller.slice(0, 10)}…</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#8892a4]">{t('Deposit token', '存入代币')}</span>
            <span className="text-white">{vault.token}</span>
          </div>
        </div>
      </div>

      <div className="bg-[#0d1525] border border-[#1a2535] rounded-xl p-4 space-y-3">
        <p className="text-xs text-[#8892a4] uppercase tracking-wider font-semibold">{t('Live Vault Deposit', '实时金库存入')}</p>

        {!address ? (
          <p className="text-xs text-amber-300">{t('Connect wallet to deposit into this vault.', '请先连接钱包再存入该金库。')}</p>
        ) : !isMainnet ? (
          <div className="space-y-2">
            <p className="text-xs text-amber-300">{t(`${TARGET_NETWORK_NAME} does not currently support this UniFi vault deposit flow in-app.`, `${TARGET_NETWORK_NAME} 当前暂不支持该 UniFi 金库站内存入流程。`)}</p>
            <button onClick={switchToMainnet} className="w-full py-2 rounded-lg bg-[#00d4ff] text-[#0a0f1a] text-sm font-semibold">
              {t(`Switch to ${TARGET_NETWORK_NAME}`, `切换到 ${TARGET_NETWORK_NAME}`)}
            </button>
          </div>
        ) : !capabilities.canVaultDeposit ? (
          <p className="text-xs text-amber-300">{t('Required UniFi vault contracts are not available on this chain.', '当前链上缺少所需的 UniFi 金库合约。')}</p>
        ) : (
          <>
            <div className="bg-[#0a0f1a] border border-[#1a2535] rounded-xl p-3 space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-[#8892a4]">{t('Source token', '来源代币')}</span><span className="text-white">pufETH</span></div>
              <div className="flex justify-between"><span className="text-[#8892a4]">{t('Vault token', '目标金库')}</span><span className="text-white">{vault.name}</span></div>
              <div className="flex justify-between"><span className="text-[#8892a4]">{t('Network', '网络')}</span><span className="text-white">{TARGET_NETWORK_NAME}</span></div>
            </div>

            <input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="0.0"
              className="w-full bg-[#0a0f1a] border border-[#1a2535] rounded-xl px-3 py-3 text-white outline-none"
            />

            <button
              onClick={submitDeposit}
              disabled={txStatus === 'approving' || txStatus === 'depositing' || txStatus === 'submitted' || !depositAmount}
              className="w-full py-3 rounded-xl bg-[#00d4ff] text-[#0a0f1a] font-bold disabled:opacity-40"
            >
              {txStatus === 'approving'
                ? t('Approving…', '授权中…')
                : txStatus === 'depositing'
                  ? t('Submitting deposit…', '提交存入中…')
                  : txStatus === 'submitted'
                    ? t('Waiting confirmation…', '等待确认中…')
                    : t('Deposit pufETH into vault', '将 pufETH 存入金库')}
            </button>

            {txHash && (
              <a
                href={txExplorerUrl(txHash, chainId)}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs text-[#00d4ff] underline break-all"
              >
                {t('View tx on explorer ↗', '在区块浏览器查看交易 ↗')}
              </a>
            )}

            {txStatus === 'confirmed' && <p className="text-xs text-emerald-300">{t('Vault deposit confirmed on-chain.', '金库存入已在链上确认。')}</p>}
            {txError && <p className="text-xs text-red-300">{txError}</p>}
          </>
        )}
      </div>

      <a
        href="https://app.puffer.fi/vaults"
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full py-4 rounded-xl text-center font-bold text-sm transition-all active:scale-[0.98]"
        style={{ background: vault.color, color: '#0a0f1a' }}
      >
        {t('Open in Puffer App ↗', '在 Puffer 应用中打开 ↗')}
      </a>
    </div>
  );
}
