import type { AgentResult, ImpactCard, ImpactLevel, NewsItem } from "../types/index";

export interface NewsAgentInput {
  items: NewsItem[];
}

export interface NewsAgentOutput {
  impactCards: ImpactCard[];
}

const AGENT_NAME = "NewsAgent";

const HIGH_IMPACT_CATEGORIES = new Set(["macro", "fx"]);
const HIGH_IMPACT_KEYWORDS = ["fed", "fomc", "rate", "cpi", "inflation", "recession", "war", "sanction", "crisis"];

function classifyImportance(item: NewsItem): ImpactLevel {
  const haystack = `${item.headline} ${item.summary}`.toLowerCase();
  const hasHighKeyword = HIGH_IMPACT_KEYWORDS.some((kw) => haystack.includes(kw));
  const isMultiAsset = item.affectedAssets.length >= 3;

  if (hasHighKeyword || isMultiAsset) return "high";
  if (HIGH_IMPACT_CATEGORIES.has(item.category.toLowerCase())) return "medium";
  return "low";
}

function toImpactCard(item: NewsItem): ImpactCard {
  return {
    id: item.id,
    headline: item.headline,
    summary: item.summary,
    region: item.region,
    affectedAssets: item.affectedAssets,
    category: item.category,
    importance: classifyImportance(item),
    sourceName: item.source,
    sourceUrl: item.sourceUrl,
    timestamp: item.timestamp,
  };
}

const IMPORTANCE_RANK: Record<ImpactLevel, number> = { high: 2, medium: 1, low: 0 };

export async function runNewsAgent(input: NewsAgentInput): Promise<AgentResult<NewsAgentOutput>> {
  const impactCards = input.items
    .map(toImpactCard)
    .sort((a, b) => IMPORTANCE_RANK[b.importance] - IMPORTANCE_RANK[a.importance]);

  return {
    agent: AGENT_NAME,
    generatedAt: new Date().toISOString(),
    data: { impactCards },
    notes: ["Importance is heuristic (keyword + asset-breadth based), not AI-classified in this MVP."],
  };
}
