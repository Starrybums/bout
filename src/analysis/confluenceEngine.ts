/**
 * Confluence Engine.
 *
 * Combines every other analysis module into one report: macro calendar
 * events, news impact cards, the watchlist, order flow, volume, heat map,
 * market rhythm, ICT concepts, the strategy knowledge base, and risk
 * warnings. This is the synthesis layer behind `bout confluence today` and
 * the "Confluence Snapshot" section of `bout brief today`.
 *
 * Language discipline: every generated string in this module sticks to
 * hedged, non-directive phrasing — "setup to watch", "conditions to
 * monitor", "requires confirmation", "contextual bias", "risk warning".
 * Nothing here should ever read as "buy now", "sell now", "guaranteed
 * trade", or a "perfect signal". This is research and market context only,
 * not financial advice — see CONFLUENCE_DISCLAIMER below.
 */
import type { EconomicEvent, ImpactCard, ImpactLevel, ModelProviderConfig, RiskWarning, WatchlistItem } from "../types/index";
import { callModel } from "../modelRouter";
import { runOrderFlowAnalysis, type OrderFlowResult } from "./orderFlow";
import { runVolumeAnalysis, type VolumeResult } from "./volumeAnalysis";
import { runHeatMapAnalysis, type HeatMapResult } from "./heatMap";
import { runMarketRhythmAnalysis, type RhythmResult } from "./marketRhythm";
import { runICTAnalysis, getKillZone, type ICTAnalysisResult, type KillZoneInfo } from "./ictConcepts";
import { loadStrategyTemplates, type StrategyTemplate } from "../tools/strategyTool";

export const CONFLUENCE_DISCLAIMER = "Research and market context only. Not financial advice.";
export const DEFAULT_SYMBOL_BASKET = ["NQ", "ES", "GC", "CL", "DXY", "EURUSD", "BTC"];

type Bias = "bullish" | "bearish" | "neutral";

export interface ConfluenceEngineInput {
  events: EconomicEvent[];
  impactCards: ImpactCard[];
  watchlist: WatchlistItem[];
  riskWarnings: RiskWarning[];
  riskLevel: ImpactLevel;
  modelConfig: ModelProviderConfig;
  referenceDate?: Date;
}

export interface SymbolAnalysisBundle {
  symbol: string;
  orderFlow: OrderFlowResult;
  volume: VolumeResult;
  ict: ICTAnalysisResult;
}

export type StrategyMatchScore = "strong" | "partial" | "weak" | "avoid";

export interface StrategyMatch {
  name: string;
  slug: string;
  matchScore: StrategyMatchScore;
  reasons: string[];
}

export interface AssetToWatch {
  symbol: string;
  lean: "bullish" | "bearish";
  reason: string;
}

export interface ConfluenceResult {
  date: string;
  generatedAt: string;
  overallMarketContext: string;
  bullishFactors: string[];
  bearishFactors: string[];
  conflictingSignals: string[];
  bestAssetsToWatch: AssetToWatch[];
  matchingStrategies: StrategyMatch[];
  strategiesToAvoid: StrategyMatch[];
  riskWarnings: RiskWarning[];
  sourceTrail: string[];
  disclaimer: string;
  symbolBundles: SymbolAnalysisBundle[];
  rhythm: RhythmResult;
  heatMap: HeatMapResult;
  killZone: KillZoneInfo;
}

// ---------------------------------------------------------------------------
// Symbol-level analysis
// ---------------------------------------------------------------------------

function uniqueSymbols(watchlist: WatchlistItem[]): string[] {
  const set = new Set<string>(DEFAULT_SYMBOL_BASKET);
  for (const w of watchlist) set.add(w.symbol.toUpperCase());
  return Array.from(set).slice(0, 10); // bound output size
}

function analyzeSymbol(symbol: string, referenceDate: Date): SymbolAnalysisBundle {
  return {
    symbol,
    orderFlow: runOrderFlowAnalysis(symbol, referenceDate),
    volume: runVolumeAnalysis(symbol, referenceDate),
    ict: runICTAnalysis(symbol, referenceDate),
  };
}

function biasScore(tag: Bias): number {
  return tag === "bullish" ? 1 : tag === "bearish" ? -1 : 0;
}

function ictTagOf(b: SymbolAnalysisBundle): Bias {
  return b.ict.overallContext === "bullish-leaning" ? "bullish" : b.ict.overallContext === "bearish-leaning" ? "bearish" : "neutral";
}

function combinedScore(b: SymbolAnalysisBundle): number {
  const score = biasScore(b.orderFlow.bias) + biasScore(ictTagOf(b));
  if (b.volume.confirmsMove === "confirms") return score + Math.sign(score) * 0.5;
  if (b.volume.confirmsMove === "rejects") return score - Math.sign(score) * 0.5;
  return score;
}

interface ScoredFactor {
  text: string;
  weight: number;
}

function collectDirectionalFactors(bundles: SymbolAnalysisBundle[]): {
  bullish: ScoredFactor[];
  bearish: ScoredFactor[];
  conflicts: string[];
} {
  const bullish: ScoredFactor[] = [];
  const bearish: ScoredFactor[] = [];
  const conflicts: string[] = [];

  for (const b of bundles) {
    const ofTag = b.orderFlow.bias;
    const ictTag = ictTagOf(b);

    if (ofTag !== "neutral" && ofTag === ictTag) {
      const confidenceBonus = b.orderFlow.confidenceLevel === "high" ? 1 : b.orderFlow.confidenceLevel === "medium" ? 0 : -1;
      const factor: ScoredFactor = {
        text: `${b.symbol}: order flow and ICT context both read ${ofTag} (order flow confidence: ${b.orderFlow.confidenceLevel}) — setup to watch, requires confirmation.`,
        weight: 2 + confidenceBonus,
      };
      (ofTag === "bullish" ? bullish : bearish).push(factor);
    } else if (ofTag !== "neutral" && ictTag !== "neutral" && ofTag !== ictTag) {
      conflicts.push(
        `${b.symbol}: order flow reads ${ofTag} while ICT context reads ${ictTag} — conflicting signals, requires confirmation either way.`
      );
    }

    if (ofTag !== "neutral") {
      if (b.volume.confirmsMove === "confirms") {
        (ofTag === "bullish" ? bullish : bearish).push({
          text: `${b.symbol}: volume confirms the ${ofTag} order-flow lean — adds confluence, still requires confirmation before treating as a setup.`,
          weight: 1,
        });
      } else if (b.volume.confirmsMove === "rejects") {
        conflicts.push(
          `${b.symbol}: order flow leans ${ofTag} but volume reads "rejects" the move — contextual bias without volume support.`
        );
      }
    }
  }

  return { bullish, bearish, conflicts };
}

// ---------------------------------------------------------------------------
// Strategy matching
// ---------------------------------------------------------------------------

interface MatchContext {
  rhythm: RhythmResult;
  killZone: KillZoneInfo;
  events: EconomicEvent[];
  impactCards: ImpactCard[];
  heatMap: HeatMapResult;
  bundles: SymbolAnalysisBundle[];
  hasHighImpactEventToday: boolean;
}

function rankOf(score: StrategyMatchScore): number {
  return score === "strong" ? 2 : score === "partial" ? 1 : 0;
}

function evaluateStrategy(template: StrategyTemplate, ctx: MatchContext): StrategyMatch {
  const tags = template.matchTags ?? {};
  const reasons: string[] = [];
  let score = 0;
  let hardAvoid = false;

  const relevantBundles = ctx.bundles.filter((b) => template.marketType.includes(b.symbol));

  if (tags.requiresHighImportanceNewsToday) {
    const has = ctx.impactCards.some((c) => c.importance === "high");
    if (has) {
      score += 2;
      reasons.push("High-importance news today provides the required context.");
    } else {
      hardAvoid = true;
      reasons.push("No high-importance news today — required context for this strategy is absent.");
    }
  }

  if (tags.requiresCalendarEventTitleContains) {
    const needle = tags.requiresCalendarEventTitleContains.toLowerCase();
    const has = ctx.events.some((e) => e.title.toLowerCase().includes(needle));
    if (has) {
      score += 2;
      reasons.push(`Today's calendar includes an event matching "${tags.requiresCalendarEventTitleContains}".`);
    } else {
      hardAvoid = true;
      reasons.push(`No calendar event matching "${tags.requiresCalendarEventTitleContains}" today — required context is absent.`);
    }
  }

  if (tags.requiresGoldUsdInverseHolding) {
    if (ctx.heatMap.correlationSignals.goldUsdInverseHolding) {
      score += 1;
      reasons.push("Gold/USD inverse relationship is holding in today's heat map read.");
    } else {
      hardAvoid = true;
      reasons.push("Gold/USD relationship is not holding today per the heat map read — cross-asset confirmation is absent.");
    }
  }

  if (tags.requiresActiveKillZone) {
    if (ctx.killZone.active) {
      score += 1;
      reasons.push(`An ICT kill zone is currently active (${ctx.killZone.name}).`);
    } else {
      hardAvoid = true;
      reasons.push("No ICT kill zone is currently active — required session-timing context is absent.");
    }
  }

  if (tags.requiresIctSweepAndMss) {
    const found = relevantBundles.some((b) => {
      const sweep = b.ict.concepts.find((c) => c.concept === "Liquidity sweep");
      const mss = b.ict.concepts.find((c) => c.concept === "Market structure shift (MSS)");
      return sweep && mss && sweep.context !== "neutral" && sweep.context === mss.context;
    });
    if (found) {
      score += 2;
      reasons.push("Liquidity sweep and market structure shift are aligned on at least one analyzed symbol.");
    } else {
      hardAvoid = true;
      reasons.push("Liquidity sweep and market structure shift aren't both aligned on any analyzed symbol right now.");
    }
  }

  if (tags.rhythmStatesAvoid?.includes(ctx.rhythm.rhythmState)) {
    hardAvoid = true;
    reasons.push(`Current rhythm state ("${ctx.rhythm.rhythmState}") is one this strategy explicitly avoids.`);
  } else if (tags.rhythmStatesFavorable?.includes(ctx.rhythm.rhythmState)) {
    score += 1;
    reasons.push(`Current rhythm state ("${ctx.rhythm.rhythmState}") favors this strategy.`);
  }

  if (tags.avoidWhenHighImpactEventToday && ctx.hasHighImpactEventToday) {
    hardAvoid = true;
    reasons.push("A high-impact event is on today's calendar, which this strategy's avoid conditions flag.");
  }

  if (tags.requiresVolumeConfirms) {
    const anyConfirms = relevantBundles.some((b) => b.volume.confirmsMove === "confirms");
    if (anyConfirms) {
      score += 1;
      reasons.push("Volume confirms the move on at least one relevant symbol.");
    } else {
      reasons.push("Volume isn't currently confirming on the relevant symbol(s) — would need that for a stronger read.");
    }
  }

  if (tags.relatedOrderFlowConcepts?.length) {
    const found = relevantBundles.some((b) =>
      b.orderFlow.conceptReadings.some((c) => tags.relatedOrderFlowConcepts!.includes(c.concept) && c.tag !== "neutral")
    );
    if (found) {
      score += 1;
      reasons.push("A related order-flow concept is flagged on a relevant symbol.");
    }
  }

  if (reasons.length === 0) {
    reasons.push("No specific conditions for this strategy are currently flagged either way.");
  }

  let matchScore: StrategyMatchScore;
  if (hardAvoid) matchScore = "avoid";
  else if (score >= 3) matchScore = "strong";
  else if (score >= 1) matchScore = "partial";
  else matchScore = "weak";

  return { name: template.name, slug: template.slug, matchScore, reasons };
}

function buildStrategyMatches(templates: StrategyTemplate[], ctx: MatchContext): { matching: StrategyMatch[]; avoid: StrategyMatch[] } {
  const evaluated = templates.map((t) => evaluateStrategy(t, ctx));
  const avoid = evaluated.filter((e) => e.matchScore === "avoid");
  const matching = evaluated.filter((e) => e.matchScore !== "avoid").sort((a, b) => rankOf(b.matchScore) - rankOf(a.matchScore));
  return { matching, avoid };
}

// ---------------------------------------------------------------------------
// Overall market context (AI-assisted, with a heuristic fallback)
// ---------------------------------------------------------------------------

async function buildOverallContext(
  input: ConfluenceEngineInput,
  rhythm: RhythmResult,
  heatMap: HeatMapResult,
  bundles: SymbolAnalysisBundle[]
): Promise<string> {
  const bullishCount = bundles.filter((b) => combinedScore(b) >= 1.5).length;
  const bearishCount = bundles.filter((b) => combinedScore(b) <= -1.5).length;
  const highImpactCount = input.events.filter((e) => e.impactLevel === "high").length;

  try {
    const response = await callModel(
      {
        messages: [
          {
            role: "system",
            content:
              "You are a markets research assistant synthesizing a confluence report from structured mock/sample data. " +
              "Write 2-4 sentences of overall market context. Use only hedged, non-directive language such as " +
              "'setup to watch', 'conditions to monitor', 'requires confirmation', 'contextual bias', 'risk warning'. " +
              "NEVER use phrases like 'buy now', 'sell now', 'guaranteed trade', 'this will win', or 'perfect signal'. " +
              "Do not predict specific price levels. This is research and market context only, not financial advice.",
          },
          {
            role: "user",
            content:
              `Rhythm state: ${rhythm.rhythmState}. Heat map tone: ${heatMap.overallTone} ` +
              `(strongest group: ${heatMap.strongestGroup.name}, weakest: ${heatMap.weakestGroup.name}). ` +
              `Overall risk level: ${input.riskLevel}. Bullish-leaning symbols in the analyzed basket: ${bullishCount}. ` +
              `Bearish-leaning symbols: ${bearishCount}. High-impact calendar events today: ${highImpactCount}.`,
          },
        ],
        context: { topic: "confluence" },
      },
      input.modelConfig
    );
    return response.text;
  } catch (err) {
    return (
      `Fallback summary: rhythm reads "${rhythm.rhythmState}", heat map tone reads "${heatMap.overallTone}", and overall ` +
      `risk level is "${input.riskLevel}". ${bullishCount} symbol(s) in the analyzed basket lean bullish and ${bearishCount} ` +
      `lean bearish — conditions to monitor, not a directive. (AI summary unavailable: ${(err as Error).message})`
    );
  }
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function runConfluenceEngine(input: ConfluenceEngineInput): Promise<ConfluenceResult> {
  const referenceDate = input.referenceDate ?? new Date();
  const date = referenceDate.toISOString().slice(0, 10);

  const symbols = uniqueSymbols(input.watchlist);
  const bundles = symbols.map((s) => analyzeSymbol(s, referenceDate));

  const rhythm = runMarketRhythmAnalysis(input.events, referenceDate);
  const heatMap = runHeatMapAnalysis(referenceDate);
  const killZone = getKillZone(referenceDate);
  const hasHighImpactEventToday = input.events.some((e) => e.impactLevel === "high");

  const { bullish, bearish, conflicts } = collectDirectionalFactors(bundles);

  if (heatMap.overallTone === "risk-on" && (rhythm.rhythmState === "event-driven" || hasHighImpactEventToday)) {
    conflicts.push(
      "Heat map tone reads risk-on, but elevated macro event risk today is a risk warning that could shift sentiment quickly."
    );
  } else if (heatMap.overallTone === "risk-off" && rhythm.rhythmState === "trending") {
    conflicts.push("Heat map tone reads risk-off while the session rhythm reads trending — worth reconciling before leaning on either alone.");
  }

  const bestAssetsToWatch: AssetToWatch[] = bundles
    .map((b) => ({ b, score: combinedScore(b) }))
    .filter((x) => Math.abs(x.score) >= 1.5)
    .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
    .slice(0, 5)
    .map(({ b, score }) => {
      const lean: "bullish" | "bearish" = score > 0 ? "bullish" : "bearish";
      return {
        symbol: b.symbol,
        lean,
        reason:
          `Order flow (${b.orderFlow.bias}, ${b.orderFlow.confidenceLevel} confidence), ICT context (${b.ict.overallContext}), ` +
          `and volume (${b.volume.confirmsMove}) combine into a ${lean} contextual bias — setup to watch, requires confirmation.`,
      };
    });

  const templates = loadStrategyTemplates();
  const { matching, avoid } = buildStrategyMatches(templates, {
    rhythm,
    killZone,
    events: input.events,
    impactCards: input.impactCards,
    heatMap,
    bundles,
    hasHighImpactEventToday,
  });

  const overallMarketContext = await buildOverallContext(input, rhythm, heatMap, bundles);

  const sourceTrail = [
    "Economic calendar: data/sample/calendar.sample.json (sample data)",
    "News headlines: data/sample/news.sample.json (sample data)",
    "Order flow, volume, ICT concepts: structured mock/placeholder data (src/analysis/orderFlow.ts, volumeAnalysis.ts, ictConcepts.ts)",
    "Heat map: structured mock/placeholder data (src/analysis/heatMap.ts)",
    "Market rhythm: session timing is real-clock based; trending/ranging/choppy read is mock (src/analysis/marketRhythm.ts)",
    "ICT kill zone: real-clock based (src/analysis/ictConcepts.ts)",
    "Strategy templates: data/sample/strategies.json",
    `Model provider: ${input.modelConfig.provider}`,
  ];

  return {
    date,
    generatedAt: new Date().toISOString(),
    overallMarketContext,
    bullishFactors: [...bullish].sort((a, b) => b.weight - a.weight).slice(0, 5).map((f) => f.text),
    bearishFactors: [...bearish].sort((a, b) => b.weight - a.weight).slice(0, 5).map((f) => f.text),
    conflictingSignals: conflicts.slice(0, 6),
    bestAssetsToWatch,
    matchingStrategies: matching,
    strategiesToAvoid: avoid,
    riskWarnings: input.riskWarnings,
    sourceTrail,
    disclaimer: CONFLUENCE_DISCLAIMER,
    symbolBundles: bundles,
    rhythm,
    heatMap,
    killZone,
  };
}
