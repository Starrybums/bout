import type { AgentResult, EconomicEvent, ImpactCard, ImpactLevel, JournalEntry, RiskWarning } from "../types/index";

export interface RiskAgentInput {
  events: EconomicEvent[];
  impactCards: ImpactCard[];
  /** Today's journal entries, used for overtrading checks */
  todaysJournalEntries?: JournalEntry[];
  overtradingThreshold?: number;
}

export interface RiskAgentOutput {
  riskLevel: ImpactLevel;
  warnings: RiskWarning[];
}

const AGENT_NAME = "RiskAgent";
const RANK: Record<ImpactLevel, number> = { low: 0, medium: 1, high: 2 };

export async function runRiskAgent(input: RiskAgentInput): Promise<AgentResult<RiskAgentOutput>> {
  const warnings: RiskWarning[] = [];
  const threshold = input.overtradingThreshold ?? 5;

  // 1. High-impact economic events
  const highImpactEvents = input.events.filter((e) => e.impactLevel === "high");
  if (highImpactEvents.length > 0) {
    warnings.push({
      level: "high",
      reason:
        `${highImpactEvents.length} high-impact event(s) on today's calendar ` +
        `(${highImpactEvents.map((e) => e.title).join(", ")}). Expect elevated volatility around release times.`,
      relatedEventIds: highImpactEvents.map((e) => e.id),
    });
  }

  // 2. High-impact / multi-asset news
  const highImpactNews = input.impactCards.filter((c) => c.importance === "high");
  if (highImpactNews.length > 0) {
    warnings.push({
      level: "medium",
      reason: `${highImpactNews.length} high-importance headline(s) in the feed — review before sizing up.`,
      relatedEventIds: highImpactNews.map((c) => c.id),
    });
  }

  // 3. Overtrading check
  const tradesToday = input.todaysJournalEntries?.length ?? 0;
  if (tradesToday >= threshold) {
    warnings.push({
      level: "medium",
      reason: `${tradesToday} trades logged today, at or above your configured threshold of ${threshold}. Consider whether this is plan-driven or revenge/overtrading.`,
      relatedEventIds: [],
    });
  }

  const riskLevel: ImpactLevel = warnings.length === 0 ? "low" : warnings.some((w) => w.level === "high") ? "high" : "medium";

  return {
    agent: AGENT_NAME,
    generatedAt: new Date().toISOString(),
    data: { riskLevel, warnings },
    notes: [],
  };
}

export function rankImpact(level: ImpactLevel): number {
  return RANK[level];
}
