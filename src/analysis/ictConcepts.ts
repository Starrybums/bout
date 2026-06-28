/**
 * ICT Concepts Module — educational and rule-based.
 *
 * IMPORTANT: ICT-style concepts are a popular price-action framework, not a
 * guaranteed system. This module never claims any concept "guarantees" a
 * trade outcome — every reading is framed as a setup to watch that requires
 * confirmation, with an explicit invalidation idea.
 *
 * Two different kinds of data are mixed deliberately:
 *   - `killZone` is REAL: commonly-cited session windows are time-of-day
 *     facts, computed from the real clock (US Eastern Time). Exact boundary
 *     times vary slightly by source — that's noted in the output.
 *   - Every chart-structure concept (FVG, liquidity sweep, BOS, MSS,
 *     premium/discount, equal highs/lows) is MOCK/illustrative, since none
 *     of them can be honestly detected without a connected real-time-and-
 *     sales / OHLC price feed. Order blocks and previous-day high/low are
 *     left as explicit, constant placeholders rather than mocked, because
 *     mocking specific price levels would cross into fabricating data — see
 *     each placeholder's note for what's needed to make it real.
 */
import { dailySeed, pick, chance } from "./mockSignal";

export type DirectionalTag = "bullish" | "bearish" | "neutral";
export type ICTOverallContext = "bullish-leaning" | "bearish-leaning" | "mixed/no-clear-bias";

export interface ICTConceptReading {
  concept: string;
  status: "watching" | "placeholder";
  context: DirectionalTag;
  reading: string;
  requiredConfirmation: string;
  invalidationIdea: string;
  warning?: string;
}

export interface KillZoneInfo {
  active: boolean;
  name: string | null;
  window: string | null;
  note: string;
}

export interface ICTAnalysisResult {
  symbol: string;
  generatedAt: string;
  killZone: KillZoneInfo;
  concepts: ICTConceptReading[];
  overallContext: ICTOverallContext;
  isMock: true;
}

interface ConceptOptionSet {
  concept: string;
  bullish: { reading: string; requiredConfirmation: string; invalidationIdea: string };
  bearish: { reading: string; requiredConfirmation: string; invalidationIdea: string };
  neutral: { reading: string; requiredConfirmation: string; invalidationIdea: string };
}

const MOCK_CONCEPTS: ConceptOptionSet[] = [
  {
    concept: "Fair Value Gap (FVG)",
    bullish: {
      reading: "Mock read: an unfilled bullish FVG sits below current mock price action",
      requiredConfirmation: "Price returning to partially fill the gap, then continuing in the gap's directional bias",
      invalidationIdea: "A full close back through the opposite side of the gap",
    },
    bearish: {
      reading: "Mock read: an unfilled bearish FVG sits above current mock price action",
      requiredConfirmation: "Price returning to partially fill the gap, then continuing in the gap's directional bias",
      invalidationIdea: "A full close back through the opposite side of the gap",
    },
    neutral: {
      reading: "Mock read: no clear unfilled FVG flagged in this sample window",
      requiredConfirmation: "n/a — no gap currently flagged",
      invalidationIdea: "n/a",
    },
  },
  {
    concept: "Liquidity sweep",
    bullish: {
      reading: "Mock read: sell-side liquidity (resting stops below a prior low) appears swept",
      requiredConfirmation: "A reclaim/close back inside the prior range after the sweep",
      invalidationIdea: "Price continuing lower beyond the sweep without reclaiming the level",
    },
    bearish: {
      reading: "Mock read: buy-side liquidity (resting stops above a prior high) appears swept",
      requiredConfirmation: "A reclaim/close back inside the prior range after the sweep",
      invalidationIdea: "Price continuing higher beyond the sweep without reclaiming the level",
    },
    neutral: {
      reading: "Mock read: no liquidity sweep flagged in this sample window",
      requiredConfirmation: "n/a — no sweep currently flagged",
      invalidationIdea: "n/a",
    },
  },
  {
    concept: "Break of structure (BOS)",
    bullish: {
      reading: "Mock read: a bullish break of structure flagged — prior swing high taken out",
      requiredConfirmation: "A clean close beyond the prior swing point on the timeframe used to define structure",
      invalidationIdea: "Price immediately reversing back through the broken level",
    },
    bearish: {
      reading: "Mock read: a bearish break of structure flagged — prior swing low taken out",
      requiredConfirmation: "A clean close beyond the prior swing point on the timeframe used to define structure",
      invalidationIdea: "Price immediately reversing back through the broken level",
    },
    neutral: {
      reading: "Mock read: no break of structure flagged in this sample window",
      requiredConfirmation: "n/a — no break currently flagged",
      invalidationIdea: "n/a",
    },
  },
  {
    concept: "Market structure shift (MSS)",
    bullish: {
      reading: "Mock read: structure shift flagged from bearish to bullish, typically watched after a sell-side sweep",
      requiredConfirmation: "A break of structure against the prior trend, ideally following a liquidity sweep",
      invalidationIdea: "Structure resuming the prior (bearish) trend without confirming the shift",
    },
    bearish: {
      reading: "Mock read: structure shift flagged from bullish to bearish, typically watched after a buy-side sweep",
      requiredConfirmation: "A break of structure against the prior trend, ideally following a liquidity sweep",
      invalidationIdea: "Structure resuming the prior (bullish) trend without confirming the shift",
    },
    neutral: {
      reading: "Mock read: no structure shift flagged in this sample window",
      requiredConfirmation: "n/a — no shift currently flagged",
      invalidationIdea: "n/a",
    },
  },
  {
    concept: "Premium/discount zone",
    bullish: {
      reading: "Mock read: price reading in the discount (lower) half of the recent range",
      requiredConfirmation: "Bullish confirmation (e.g. a structure shift or sweep) while still in the discount zone",
      invalidationIdea: "Price trading back through equilibrium (50%) without confirming higher",
    },
    bearish: {
      reading: "Mock read: price reading in the premium (upper) half of the recent range",
      requiredConfirmation: "Bearish confirmation (e.g. a structure shift or sweep) while still in the premium zone",
      invalidationIdea: "Price trading back through equilibrium (50%) without confirming lower",
    },
    neutral: {
      reading: "Mock read: price reading near equilibrium (50%) of the recent range",
      requiredConfirmation: "n/a — no clear premium/discount lean",
      invalidationIdea: "n/a",
    },
  },
  {
    concept: "Equal highs/lows",
    bullish: {
      reading: "Mock read: equal lows flagged below current mock price action — often treated as a resting sell-side liquidity target",
      requiredConfirmation: "A sweep of the equal lows followed by a reclaim",
      invalidationIdea: "Price closing below the equal lows without reclaiming",
    },
    bearish: {
      reading: "Mock read: equal highs flagged above current mock price action — often treated as a resting buy-side liquidity target",
      requiredConfirmation: "A sweep of the equal highs followed by rejection",
      invalidationIdea: "Price closing above the equal highs without rejecting",
    },
    neutral: {
      reading: "Mock read: no clear equal highs/lows flagged in this sample window",
      requiredConfirmation: "n/a — none currently flagged",
      invalidationIdea: "n/a",
    },
  },
];

const ORDER_BLOCK_PLACEHOLDER: ICTConceptReading = {
  concept: "Order block (placeholder)",
  status: "placeholder",
  context: "neutral",
  reading: "Order block placeholder — real order-block identification requires a connected OHLC price feed, not available in mock mode.",
  requiredConfirmation: "Connect a real price feed so order blocks can be identified from actual candle data.",
  invalidationIdea: "n/a (placeholder)",
};

const PREVIOUS_DAY_HIGH_LOW_PLACEHOLDER: ICTConceptReading = {
  concept: "Previous day high/low",
  status: "placeholder",
  context: "neutral",
  reading:
    "Previous day high/low placeholder — specific price levels require a connected price feed and are intentionally not fabricated here.",
  requiredConfirmation: "Connect a real price feed so the actual previous-day high/low can be calculated.",
  invalidationIdea: "n/a (placeholder)",
};

interface KillZoneWindow {
  name: string;
  startMinutes: number;
  endMinutes: number;
  window: string;
}

// Commonly-cited windows in ICT-style methodology; exact boundaries vary by source.
const KILL_ZONES: KillZoneWindow[] = [
  { name: "Asian range", startMinutes: 20 * 60, endMinutes: 24 * 60, window: "20:00–00:00 ET" },
  { name: "London open kill zone", startMinutes: 2 * 60, endMinutes: 5 * 60, window: "02:00–05:00 ET" },
  { name: "NY AM kill zone", startMinutes: 7 * 60, endMinutes: 10 * 60, window: "07:00–10:00 ET" },
  { name: "NY PM / London close kill zone", startMinutes: 13 * 60 + 30, endMinutes: 16 * 60, window: "13:30–16:00 ET" },
];

export function getKillZone(referenceDate: Date): KillZoneInfo {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(referenceDate);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const totalMinutes = hour * 60 + minute;

  const match = KILL_ZONES.find((kz) => totalMinutes >= kz.startMinutes && totalMinutes < kz.endMinutes);

  return {
    active: Boolean(match),
    name: match?.name ?? null,
    window: match?.window ?? null,
    note: "Commonly-cited session windows in ICT-style methodology; exact boundaries vary by source. Based on the real clock (US Eastern Time), not mock data.",
  };
}

export function runICTAnalysis(symbol: string, referenceDate: Date = new Date()): ICTAnalysisResult {
  const upper = symbol.toUpperCase();
  const seedBase = `ict-${upper}-${dailySeed(referenceDate)}`;

  const concepts: ICTConceptReading[] = MOCK_CONCEPTS.map((set, i) => {
    const context = pick(`${seedBase}-${i}-${set.concept}`, ["bullish", "bearish", "neutral"] as const);
    const variant = set[context];
    const isWeak = context !== "neutral" && chance(`${seedBase}-weak-${i}`, 0.35);
    return {
      concept: set.concept,
      status: "watching",
      context,
      reading: variant.reading,
      requiredConfirmation: variant.requiredConfirmation,
      invalidationIdea: variant.invalidationIdea,
      warning: isWeak
        ? "Flagged but with limited confluence in this sample read — treat as a setup to watch, not a standalone signal."
        : undefined,
    };
  });

  concepts.push(ORDER_BLOCK_PLACEHOLDER, PREVIOUS_DAY_HIGH_LOW_PLACEHOLDER);

  const scored = concepts.filter((c) => c.status === "watching");
  const bullishCount = scored.filter((c) => c.context === "bullish").length;
  const bearishCount = scored.filter((c) => c.context === "bearish").length;

  let overallContext: ICTOverallContext = "mixed/no-clear-bias";
  if (bullishCount > bearishCount) overallContext = "bullish-leaning";
  else if (bearishCount > bullishCount) overallContext = "bearish-leaning";

  return {
    symbol: upper,
    generatedAt: new Date().toISOString(),
    killZone: getKillZone(referenceDate),
    concepts,
    overallContext,
    isMock: true,
  };
}
