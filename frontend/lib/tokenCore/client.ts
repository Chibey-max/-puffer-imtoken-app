'use client';

let tokenCoreModulePromise: Promise<typeof import('@consenlabs/tcx-wasm')> | null = null;

async function loadModule() {
  if (!tokenCoreModulePromise) {
    tokenCoreModulePromise = import('@consenlabs/tcx-wasm');
  }
  return tokenCoreModulePromise;
}

export async function initTokenCore() {
  const mod = await loadModule();
  await mod.default();
  return mod;
}

export type TokenCoreNetwork = 'MAINNET' | 'TESTNET';

export async function createDemoKeystore(password: string, network: TokenCoreNetwork = 'TESTNET') {
  const mod = await initTokenCore();
  const keystoreJson = mod.create_keystore(JSON.stringify({ password, network }));
  return keystoreJson;
}

export async function deriveEthereumAccount(params: {
  keystoreJson: string;
  key: string;
  chainId?: string;
  network?: TokenCoreNetwork;
  derivationPath?: string;
}) {
  const mod = await initTokenCore();
  const result = mod.derive_accounts(JSON.stringify({
    keystoreJson: params.keystoreJson,
    key: params.key,
    derivations: [
      {
        chain: 'ETHEREUM',
        derivationPath: params.derivationPath || "m/44'/60'/0'/0/0",
        chainId: params.chainId || '11155111',
        network: params.network || 'TESTNET',
      },
    ],
  }));

  return JSON.parse(result) as Array<{ address: string; derivationPath: string; chainType: string }>;
}
