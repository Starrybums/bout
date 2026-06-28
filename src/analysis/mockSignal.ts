/**
 * Deterministic mock-signal helpers shared by every module in src/analysis/.
 *
 * IMPORTANT CONTEXT: none of the analysis modules in this folder are
 * connected to a real price, order-book, or volume feed yet. Every "reading"
 * they produce is structured MOCK data, generated deterministically from a
 * seed string (symbol + concept + calendar day) so that:
 *   1. Output is stable across repeated calls on the same day (not random
 *      noise every run), which makes the CLI feel coherent.
 *   2. It's obvious in the code that this is illustrative, not real — every
 *      module labels its output `isMock: true` and most reading strings are
 *      prefixed "Mock read:" for the same reason.
 *
 * Swap-in plan: when a real data source is connected (price feed, DOM feed,
 * volume-by-price feed, etc.), replace the seeded `pick()` calls in each
 * module with real calculations. The output *shapes* (types) are designed to
 * stay stable through that swap so callers (CLI commands, confluenceEngine)
 * don't need to change.
 */

export function seededUnitInterval(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return (Math.abs(hash) % 100000) / 100000;
}

export function pick<T>(seed: string, items: readonly T[]): T {
  if (items.length === 0) {
    throw new Error("pick() called with an empty list");
  }
  const idx = Math.floor(seededUnitInterval(seed) * items.length) % items.length;
  return items[idx];
}

export function chance(seed: string, probability: number): boolean {
  return seededUnitInterval(seed) < probability;
}

export function dailySeed(referenceDate: Date = new Date()): string {
  return referenceDate.toISOString().slice(0, 10);
}

/** Generic [-range, range] seeded score, rounded to 1 decimal. */
export function seededScore(seed: string, range = 3): number {
  const unit = seededUnitInterval(seed); // [0, 1)
  return Number(((unit * 2 - 1) * range).toFixed(1));
}
