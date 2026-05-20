export interface PersistedTx {
  wallet: string;
  hash: string;
  token: string;
  amount: string;
  status: 'submitted' | 'confirmed' | 'error';
  timestamp: number;
}

// Note: In serverless environments this is best-effort memory storage.
const txs: PersistedTx[] = [];

export function appendTx(tx: PersistedTx) {
  txs.unshift(tx);
  if (txs.length > 500) txs.length = 500;
}

export function getTxsByWallet(wallet: string): PersistedTx[] {
  const key = wallet.toLowerCase();
  return txs.filter((t) => t.wallet.toLowerCase() === key).sort((a, b) => b.timestamp - a.timestamp);
}
