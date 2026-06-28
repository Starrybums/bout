import * as fs from "node:fs";
import * as path from "node:path";
import { PROJECT_ROOT } from "../config/defaultConfig";

export const STRATEGIES_JSON_PATH = path.join(PROJECT_ROOT, "data", "sample", "strategies.json");

export interface StrategyMatchTags {
  rhythmStatesFavorable?: string[];
  rhythmStatesAvoid?: string[];
  avoidWhenHighImpactEventToday?: boolean;
  relatedSymbols?: string[];
  relatedOrderFlowConcepts?: string[];
  requiresVolumeConfirms?: boolean;
  requiresHighImportanceNewsToday?: boolean;
  requiresCalendarEventTitleContains?: string;
  requiresGoldUsdInverseHolding?: boolean;
  requiresActiveKillZone?: boolean;
  requiresIctSweepAndMss?: boolean;
}

export interface StrategyTemplate {
  name: string;
  slug: string;
  description: string;
  marketType: string[];
  requiredContext: string[];
  confirmationSigns: string[];
  invalidationSigns: string[];
  riskNotes: string;
  bestSessionOrTimeWindow: string;
  avoidConditions: string[];
  matchTags?: StrategyMatchTags;
}

let cache: StrategyTemplate[] | null = null;

export function loadStrategyTemplates(): StrategyTemplate[] {
  if (cache) return cache;
  const raw = fs.readFileSync(STRATEGIES_JSON_PATH, "utf-8");
  cache = JSON.parse(raw) as StrategyTemplate[];
  return cache;
}

export function getStrategyBySlug(slug: string): StrategyTemplate | null {
  const normalized = slug.trim().toLowerCase();
  return loadStrategyTemplates().find((s) => s.slug.toLowerCase() === normalized) ?? null;
}

/** Loose lookup: matches by slug OR a case-insensitive match on the display name. */
export function findStrategy(query: string): StrategyTemplate | null {
  const normalized = query.trim().toLowerCase();
  const all = loadStrategyTemplates();
  return (
    all.find((s) => s.slug.toLowerCase() === normalized) ??
    all.find((s) => s.name.toLowerCase() === normalized) ??
    null
  );
}
