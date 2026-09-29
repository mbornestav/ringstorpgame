// The courier's cash is shared by both levels and kept in the browser between runs.

const WALLET_KEY = 'ringstorp-wallet';
export const STARTING_CASH = 200;

export interface Wallet { cash: number; earned: number }

export function loadWallet(): Wallet {
  try {
    const raw = JSON.parse(localStorage.getItem(WALLET_KEY) ?? 'null') as Partial<Wallet> | null;
    if (raw && Number.isFinite(raw.cash) && Number.isFinite(raw.earned)) return { cash: Math.max(0, raw.cash!), earned: Math.max(0, raw.earned!) };
  } catch { /* private mode or corrupt data */ }
  return { cash: STARTING_CASH, earned: 0 };
}

export function saveWallet(wallet: Wallet): void {
  try { localStorage.setItem(WALLET_KEY, JSON.stringify(wallet)); } catch { /* private mode */ }
}
