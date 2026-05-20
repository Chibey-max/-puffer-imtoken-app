import fs from 'fs';
import path from 'path';

export interface PersistedTx {
  wallet: string;
  hash: string;
  token: 'ETH' | 'stETH' | 'wstETH';
  amount: string;
  status: 'submitted' | 'confirmed' | 'error';
  timestamp: number;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'tx-history.json');

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]', 'utf-8');
}

function readAll(): PersistedTx[] {
  ensureStore();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as PersistedTx[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(items: PersistedTx[]) {
  ensureStore();
  fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2), 'utf-8');
}

export function appendTx(tx: PersistedTx) {
  const all = readAll();
  all.unshift(tx);
  writeAll(all.slice(0, 500));
}

export function getTxsByWallet(wallet: string): PersistedTx[] {
  const all = readAll();
  const key = wallet.toLowerCase();
  return all.filter((t) => t.wallet.toLowerCase() === key).sort((a, b) => b.timestamp - a.timestamp);
}
