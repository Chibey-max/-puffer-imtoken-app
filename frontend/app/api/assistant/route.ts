import { NextRequest, NextResponse } from 'next/server';

type AssistantRequest = {
  message?: string;
  locale?: 'en' | 'zh';
  mode?: 'live' | 'prototype';
  walletConnected?: boolean;
};

type PlanStep = {
  title: string;
  detail: string;
};

function inferRisk(message: string): 'info' | 'warning' | 'danger' {
  const m = message.toLowerCase();
  if (m.includes('private key') || m.includes('mnemonic') || m.includes('seed phrase')) return 'danger';
  if (m.includes('approve') || m.includes('permit') || m.includes('unlimited')) return 'warning';
  return 'info';
}

function buildPlan(message: string, locale: 'en' | 'zh', mode: 'live' | 'prototype'): PlanStep[] {
  const m = message.toLowerCase();
  const wantsStake = m.includes('stake') || m.includes('质押') || m.includes('pufeth') || m.includes('steth') || m.includes('wsteth') || m.includes('eth');

  if (!wantsStake) {
    return locale === 'zh'
      ? [
          { title: '明确你的目标', detail: '请描述你要完成的链上动作，例如“把 1 ETH 质押为 pufETH”。' },
          { title: '预检查安全边界', detail: '确认网络、合约地址、金额和风险提示。AI 只做解释，不会替你签名。' },
          { title: '进入执行页面', detail: '前往 Stake 页面执行，并在钱包弹窗中逐项确认。' },
        ]
      : [
          { title: 'Clarify your goal', detail: 'Describe the exact action, e.g. “stake 1 ETH into pufETH”.' },
          { title: 'Run safety pre-checks', detail: 'Verify network, contract, amount, and risk prompts. AI only assists and never signs.' },
          { title: 'Execute in Stake page', detail: 'Go to Stake and confirm each field in wallet prompt before signing.' },
        ];
  }

  return locale === 'zh'
    ? [
        { title: '选择资产与数量', detail: '在 Stake 页面选择 ETH / stETH / wstETH 并输入数量。' },
        { title: mode === 'prototype' ? '原型模式模拟执行' : '实时模式执行链上交易', detail: mode === 'prototype' ? '当前为模拟流程，不会真实上链。' : '在钱包中确认网络、金额、目标合约后签名。' },
        { title: '确认结果', detail: '检查 pufETH 余额、汇率（rate）和后续 UniFi Vault 机会。' },
      ]
    : [
        { title: 'Select asset and amount', detail: 'Choose ETH / stETH / wstETH in Stake page and enter the amount.' },
        { title: mode === 'prototype' ? 'Run prototype simulation' : 'Execute live on-chain transaction', detail: mode === 'prototype' ? 'This mode simulates lifecycle only and does not broadcast.' : 'Confirm network, amount, and destination contract in wallet prompt before signing.' },
        { title: 'Verify outcome', detail: 'Check pufETH balance, rate, and optional UniFi Vault opportunities.' },
      ];
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AssistantRequest;
    const locale = body.locale === 'zh' ? 'zh' : 'en';
    const mode = body.mode === 'prototype' ? 'prototype' : 'live';
    const message = (body.message || '').trim();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const risk = inferRisk(message);
    const plan = buildPlan(message, locale, mode);

    const disclaimer = locale === 'zh'
      ? '安全边界：AI 仅提供建议，不会替你签名、广播或托管私钥。'
      : 'Security boundary: AI is advisory only and never signs, broadcasts, or manages your private keys.';

    const walletHint = body.walletConnected
      ? (locale === 'zh' ? '已检测到钱包连接。请在签名前核对全部字段。' : 'Wallet connection detected. Verify all fields before signing.')
      : (locale === 'zh' ? '请先连接钱包再执行链上操作。' : 'Connect wallet before executing on-chain actions.');

    return NextResponse.json({
      reply: locale === 'zh' ? '这是一个可执行的安全操作计划：' : 'Here is a safe, executable action plan:',
      plan,
      risk,
      disclaimer,
      walletHint,
    });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
