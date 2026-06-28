/**
 * Market data tool — MOCK ONLY for the MVP.
 *
 * No paid market-data API is wired up yet. This generates deterministic,
 * plausible-looking quotes so the rest of the app (watchlist display, briefs)
 * has something to render. Swap this implementation out once a real data
 * vendor (e.g. polygon.io, IEX, a broker API) is connected — keep the same
 * `MockQuote` shape so callers don't need to change.
 */

export interface MockQuote {
  symbol: string;
  price: number;
  changePct: number;
  asOf: string;
  isMock: true;
}

// Rough, illustrative reference prices — NOT live data.
const BASE_PRICES: Record<string, number> = {
  NQ: 19850,
  ES: 5450,
  GC: 2380,
  CL: 81.5,
  DXY: 104.2,
  EURUSD: 1.085,
  BTC: 67500,
};

function hashStringToUnit(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  // Normalize to [-1, 1]
  return (hash % 1000) / 1000;
}

export function getMockQuote(symbol: string, referenceDate: Date = new Date()): MockQuote {
  const upper = symbol.toUpperCase();
  const base = BASE_PRICES[upper] ?? 100;
  const daySeed = referenceDate.toISOString().slice(0, 10);
  const drift = hashStringToUnit(`${upper}-${daySeed}`); // deterministic per symbol per day
  const changePct = Number((drift * 2.5).toFixed(2)); // +/- ~2.5%
  const price = Number((base * (1 + changePct / 100)).toFixed(upper === "EURUSD" ? 4 : 2));

  return {
    symbol: upper,
    price,
    changePct,
    asOf: referenceDate.toISOString(),
    isMock: true,
  };
}

export function getMockQuotes(symbols: string[], referenceDate: Date = new Date()): MockQuote[] {
  return symbols.map((s) => getMockQuote(s, referenceDate));
}
