/**
 * Heat Map Module — MOCK / PLACEHOLDER.
 *
 * No live sector/FX-strength/crypto/futures data feed is connected yet.
 * Scores are deterministic mock data on a -3..+3 scale (see mockSignal.ts).
 * Correlation notes describe commonly-cited *historical tendencies*
 * (e.g. gold vs. the dollar), not a live correlation calculation — they're
 * conditioned on today's mock scores to stay illustrative rather than static.
 */
import { dailySeed, seededScore } from "./mockSignal";

export interface HeatMapGroup {
  name: string;
  score: number; // -3 (weak) .. +3 (strong), mock
}

export type MarketTone = "risk-on" | "risk-off" | "mixed";

export interface HeatMapCategories {
  sectors: HeatMapGroup[];
  forex: HeatMapGroup[];
  crypto: HeatMapGroup[];
  commodities: HeatMapGroup[];
}

export interface HeatMapCorrelationSignals {
  goldUsdInverseHolding: boolean;
  energyCrudeAligned: boolean;
  riskAppetiteAligned: boolean;
}

export interface HeatMapResult {
  date: string;
  generatedAt: string;
  categories: HeatMapCategories;
  strongestGroup: { category: string; name: string; score: number };
  weakestGroup: { category: string; name: string; score: number };
  overallTone: MarketTone;
  correlationNotes: string[];
  correlationSignals: HeatMapCorrelationSignals;
  isMock: true;
}

const SECTOR_NAMES = [
  "Technology",
  "Financials",
  "Energy",
  "Healthcare",
  "Industrials",
  "Consumer Discretionary",
  "Consumer Staples",
  "Materials",
  "Real Estate",
  "Utilities",
];

const FOREX_NAMES = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "NZD"];
const CRYPTO_NAMES = ["BTC", "ETH", "SOL", "Altcoins (basket)"];
const COMMODITY_NAMES = ["Gold", "Crude Oil", "Natural Gas", "Copper", "Agriculture (basket)"];

function buildGroup(category: string, name: string, seedBase: string): HeatMapGroup {
  return { name, score: seededScore(`${seedBase}-${category}-${name}`) };
}

function rankGroups(groups: HeatMapGroup[]): HeatMapGroup[] {
  return [...groups].sort((a, b) => b.score - a.score);
}

function findScore(groups: HeatMapGroup[], name: string): number {
  return groups.find((g) => g.name === name)?.score ?? 0;
}

export function runHeatMapAnalysis(referenceDate: Date = new Date()): HeatMapResult {
  const date = dailySeed(referenceDate);
  const seedBase = `heatmap-${date}`;

  const sectors = SECTOR_NAMES.map((n) => buildGroup("sectors", n, seedBase));
  const forex = FOREX_NAMES.map((n) => buildGroup("forex", n, seedBase));
  const crypto = CRYPTO_NAMES.map((n) => buildGroup("crypto", n, seedBase));
  const commodities = COMMODITY_NAMES.map((n) => buildGroup("commodities", n, seedBase));

  const allGroups: Array<{ category: string; group: HeatMapGroup }> = [
    ...sectors.map((g) => ({ category: "sectors", group: g })),
    ...forex.map((g) => ({ category: "forex", group: g })),
    ...crypto.map((g) => ({ category: "crypto", group: g })),
    ...commodities.map((g) => ({ category: "commodities", group: g })),
  ];

  const strongest = allGroups.reduce((a, b) => (b.group.score > a.group.score ? b : a));
  const weakest = allGroups.reduce((a, b) => (b.group.score < a.group.score ? b : a));

  // Risk-on/risk-off tone: a simple illustrative split of typically risk-sensitive
  // vs. typically defensive groups. This is a heuristic framing, not a formal model.
  const riskOnAvg =
    [
      findScore(sectors, "Technology"),
      findScore(sectors, "Consumer Discretionary"),
      findScore(crypto, "BTC"),
      findScore(crypto, "ETH"),
      findScore(forex, "AUD"),
      findScore(forex, "NZD"),
    ].reduce((a, b) => a + b, 0) / 6;

  const riskOffAvg =
    [
      findScore(sectors, "Utilities"),
      findScore(sectors, "Consumer Staples"),
      findScore(commodities, "Gold"),
      findScore(forex, "JPY"),
      findScore(forex, "CHF"),
    ].reduce((a, b) => a + b, 0) / 5;

  let overallTone: MarketTone = "mixed";
  if (riskOnAvg - riskOffAvg >= 1) overallTone = "risk-on";
  else if (riskOffAvg - riskOnAvg >= 1) overallTone = "risk-off";

  // Correlation notes — conditioned on today's mock scores, framed as commonly-cited
  // historical tendencies rather than asserted laws.
  const correlationNotes: string[] = [];

  const goldScore = findScore(commodities, "Gold");
  const usdScore = findScore(forex, "USD");
  const goldUsdInverse = (goldScore > 0 && usdScore < 0) || (goldScore < 0 && usdScore > 0);
  correlationNotes.push(
    goldUsdInverse
      ? "Gold and the US Dollar are showing their commonly-cited inverse relationship in today's mock data."
      : "Gold and the US Dollar are NOT showing their usual inverse relationship in today's mock data — one of the periods where that historical link weakens."
  );

  const energyScore = findScore(sectors, "Energy");
  const crudeScore = findScore(commodities, "Crude Oil");
  const energyCrudeAligned = Math.sign(energyScore) === Math.sign(crudeScore);
  correlationNotes.push(
    energyCrudeAligned
      ? "The Energy sector and Crude Oil are moving in the same direction in today's mock data, consistent with their typical relationship."
      : "The Energy sector and Crude Oil are diverging in today's mock data — worth a closer look if this were live."
  );

  const riskCurrencyAvg = (findScore(forex, "AUD") + findScore(forex, "NZD")) / 2;
  const cryptoAvg = (findScore(crypto, "BTC") + findScore(crypto, "ETH")) / 2;
  const riskAppetiteAligned = Math.sign(riskCurrencyAvg) === Math.sign(cryptoAvg);
  correlationNotes.push(
    riskAppetiteAligned
      ? "Risk-sensitive FX (AUD/NZD) and major crypto are reading in the same direction today — consistent with a shared risk-appetite driver."
      : "Risk-sensitive FX (AUD/NZD) and major crypto are reading in different directions today — a sign the move may not be purely a risk-on/risk-off story."
  );

  return {
    date,
    generatedAt: new Date().toISOString(),
    categories: {
      sectors: rankGroups(sectors),
      forex: rankGroups(forex),
      crypto: rankGroups(crypto),
      commodities: rankGroups(commodities),
    },
    strongestGroup: { category: strongest.category, name: strongest.group.name, score: strongest.group.score },
    weakestGroup: { category: weakest.category, name: weakest.group.name, score: weakest.group.score },
    overallTone,
    correlationNotes,
    correlationSignals: {
      goldUsdInverseHolding: goldUsdInverse,
      energyCrudeAligned,
      riskAppetiteAligned,
    },
    isMock: true,
  };
}
