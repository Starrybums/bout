/**
 * Order Flow Module — MOCK / PLACEHOLDER.
 *
 * No live Level 2 / DOM / tape feed is connected yet. Every reading below is
 * structured, deterministic mock data (see mockSignal.ts) clearly labeled as
 * such — this module exists to define a clean, stable interface that a real
 * order-flow data source can be wired into later without changing callers.
 *
 * Educational framing only: nothing here is a trade signal, and confidence
 * levels describe how aligned the *sampled mock readings* are with each
 * other — not a probability of any real-world outcome.
 */
import { dailySeed, pick } from "./mockSignal";

export type DirectionalTag = "bullish" | "bearish" | "neutral";
export type OrderFlowBias = DirectionalTag;
export type ConfidenceLevel = "low" | "medium" | "high";

export interface OrderFlowConceptReading {
  concept: string;
  reading: string;
  tag: DirectionalTag;
}

export interface OrderFlowResult {
  symbol: string;
  generatedAt: string;
  bias: OrderFlowBias;
  confidenceLevel: ConfidenceLevel;
  confirmationSigns: string[];
  warningSigns: string[];
  affectedAssets: string[];
  explanation: string;
  conceptReadings: OrderFlowConceptReading[];
  dataNote: string;
  isMock: true;
}

interface ConceptOptionSet {
  concept: string;
  bullish: string;
  bearish: string;
  neutral: string;
}

const SCORED_CONCEPTS: ConceptOptionSet[] = [
  {
    concept: "Bid/ask imbalance",
    bullish: "Mock read: resting size skewed toward the bid side — buy-side imbalance",
    bearish: "Mock read: resting size skewed toward the offer side — sell-side imbalance",
    neutral: "Mock read: bid/ask size roughly balanced, no clear imbalance",
  },
  {
    concept: "Cumulative delta (placeholder)",
    bullish: "Cumulative delta placeholder: rising in step with price (supportive of the move)",
    bearish: "Cumulative delta placeholder: falling while price holds up (bearish divergence)",
    neutral: "Cumulative delta placeholder: choppy/flat, no clear lean",
  },
  {
    concept: "Absorption",
    bullish: "Mock read: absorption at session lows — aggressive selling met by passive buying",
    bearish: "Mock read: absorption at session highs — aggressive buying met by passive selling",
    neutral: "Mock read: no clear absorption pattern in this sample window",
  },
  {
    concept: "Aggressive buying/selling",
    bullish: "Mock read: aggressive buying (lifting offers) outweighing aggressive selling",
    bearish: "Mock read: aggressive selling (hitting bids) outweighing aggressive buying",
    neutral: "Mock read: two-sided aggressive flow, no clear skew",
  },
  {
    concept: "Liquidity sweep",
    bullish: "Mock read: sweep of prior session lows followed by a reclaim (stop-run, then reverse up)",
    bearish: "Mock read: sweep of prior session highs followed by rejection (stop-run, then reverse down)",
    neutral: "Mock read: no liquidity sweep pattern flagged in this sample window",
  },
  {
    concept: "Trapped traders",
    bullish: "Mock read: possible trapped breakdown sellers below range low — squeeze risk to the upside",
    bearish: "Mock read: possible trapped breakout buyers above range high — fade risk to the downside",
    neutral: "Mock read: no trapped-trader pattern flagged",
  },
  {
    concept: "Volume at price",
    bullish: "Mock read: a high volume-at-price node sits just below — potential support shelf",
    bearish: "Mock read: a high volume-at-price node sits just above — potential resistance shelf",
    neutral: "Mock read: volume-at-price fairly even on both sides, no standout node",
  },
];

const FOOTPRINT_DOM_NOTE =
  "Footprint/DOM placeholder — no live Level 2 / DOM feed is connected yet. " +
  "Wire a real feed into orderFlow.ts to replace this placeholder with an actual read.";

function resolveBias(score: number): OrderFlowBias {
  if (score >= 2) return "bullish";
  if (score <= -2) return "bearish";
  return "neutral";
}

function resolveConfidence(score: number): ConfidenceLevel {
  const abs = Math.abs(score);
  if (abs >= 4) return "high";
  if (abs >= 2) return "medium";
  return "low";
}

export function runOrderFlowAnalysis(symbol: string, referenceDate: Date = new Date()): OrderFlowResult {
  const upper = symbol.toUpperCase();
  const seedBase = `orderflow-${upper}-${dailySeed(referenceDate)}`;

  const conceptReadings: OrderFlowConceptReading[] = SCORED_CONCEPTS.map((set, i) => {
    const tag = pick(`${seedBase}-${i}-${set.concept}`, ["bullish", "bearish", "neutral"] as const);
    return { concept: set.concept, reading: set[tag], tag };
  });

  // Footprint/DOM is explicitly a no-data placeholder, not a mock reading — excluded from scoring.
  conceptReadings.push({ concept: "Footprint/DOM", reading: FOOTPRINT_DOM_NOTE, tag: "neutral" });

  const scoredReadings = conceptReadings.slice(0, SCORED_CONCEPTS.length);
  const score = scoredReadings.reduce((sum, r) => sum + (r.tag === "bullish" ? 1 : r.tag === "bearish" ? -1 : 0), 0);

  const bias = resolveBias(score);
  const confidenceLevel = resolveConfidence(score);

  const confirmationSigns =
    bias === "neutral"
      ? ["No strong directional confluence among the sampled mock readings."]
      : scoredReadings.filter((r) => r.tag === bias).map((r) => r.reading);

  const opposite: DirectionalTag = bias === "bullish" ? "bearish" : bias === "bearish" ? "bullish" : "neutral";
  const warningSigns =
    bias === "neutral"
      ? scoredReadings.filter((r) => r.tag !== "neutral").map((r) => r.reading)
      : scoredReadings.filter((r) => r.tag === opposite).map((r) => r.reading);

  const bullishCount = scoredReadings.filter((r) => r.tag === "bullish").length;
  const bearishCount = scoredReadings.filter((r) => r.tag === "bearish").length;

  const explanation =
    `Across ${scoredReadings.length} sampled order-flow concepts for ${upper}, ${bullishCount} leaned bullish and ` +
    `${bearishCount} leaned bearish, producing a "${bias}" bias at "${confidenceLevel}" confidence. ` +
    "This is a confluence read across mock concept readings, not a trade signal — treat it as conditions to monitor, requiring confirmation from other context before acting on it.";

  return {
    symbol: upper,
    generatedAt: new Date().toISOString(),
    bias,
    confidenceLevel,
    confirmationSigns,
    warningSigns,
    affectedAssets: [upper],
    explanation,
    conceptReadings,
    dataNote:
      "All readings above are structured mock/placeholder data demonstrating this module's interface — not a connected live order-flow feed.",
    isMock: true,
  };
}
