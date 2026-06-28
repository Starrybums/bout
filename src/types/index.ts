/**
 * BOUT shared types.
 * Keep this file dependency-free — every other module imports from here.
 */

export type ImpactLevel = "low" | "medium" | "high";
export type Direction = "long" | "short";
export type ModelProvider = "mock" | "claude" | "openai" | "ollama";

// ---------------------------------------------------------------------------
// Economic calendar
// ---------------------------------------------------------------------------

export interface EconomicEvent {
  id: string;
  title: string;
  /** ISO-8601 timestamp */
  time: string;
  country: string;
  region: string;
  impactLevel: ImpactLevel;
  affectedAssets: string[];
  explanation: string;
}

// ---------------------------------------------------------------------------
// News
// ---------------------------------------------------------------------------

export interface NewsItem {
  id: string;
  headline: string;
  source: string;
  region: string;
  affectedAssets: string[];
  category: string;
  /** ISO-8601 timestamp */
  timestamp: string;
  summary: string;
  sourceUrl: string;
}

export interface ImpactCard {
  id: string;
  headline: string;
  summary: string;
  region: string;
  affectedAssets: string[];
  category: string;
  importance: ImpactLevel;
  sourceName: string;
  sourceUrl: string;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Watchlist
// ---------------------------------------------------------------------------

export interface WatchlistItem {
  symbol: string;
  addedAt: string;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Journal
// ---------------------------------------------------------------------------

export interface JournalEntry {
  id: string;
  symbol: string;
  direction: Direction;
  entry: number;
  exit: number;
  stop: number;
  target: number;
  setup: string;
  emotion: string;
  notes: string;
  createdAt: string;
}

export interface JournalReview {
  entryId: string;
  whatWentWell: string[];
  whatWentWrong: string[];
  riskRewardPlanned: number | null;
  riskRewardRealized: number | null;
  ruleViolations: string[];
  improvementForNextTime: string[];
}

// ---------------------------------------------------------------------------
// Risk
// ---------------------------------------------------------------------------

export interface RiskWarning {
  level: ImpactLevel;
  reason: string;
  relatedEventIds: string[];
}

// ---------------------------------------------------------------------------
// Daily briefing
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Confluence snapshot — short cross-module summary embedded in the daily brief
// ---------------------------------------------------------------------------

export interface ConfluenceSnapshot {
  macroBias: string;
  newsBias: string;
  rhythmState: string;
  orderFlowSummary: string;
  volumeSummary: string;
  heatMapTone: string;
  strategyWatchlist: string;
  riskWarning: string;
}

export interface DailyBrief {
  date: string;
  topMacroEvents: EconomicEvent[];
  topImpactCards: ImpactCard[];
  affectedAssets: string[];
  riskLevel: ImpactLevel;
  riskWarnings: RiskWarning[];
  watchlist: WatchlistItem[];
  thingsToAvoid: string[];
  sourceTrail: string[];
  disclaimer: string;
  confluenceSnapshot?: ConfluenceSnapshot;
}

// ---------------------------------------------------------------------------
// Model router
// ---------------------------------------------------------------------------

export interface ModelMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ModelRequest {
  messages: ModelMessage[];
  /** Hint for the mock model so canned responses stay relevant */
  context?: Record<string, unknown>;
}

export interface ModelResponse {
  provider: ModelProvider;
  model: string;
  text: string;
}

export interface ModelProviderConfig {
  provider: ModelProvider;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface AppConfig {
  modelProvider: ModelProvider;
  models: Record<ModelProvider, ModelProviderConfig>;
  dbPath: string;
  reportsDir: string;
  initialized: boolean;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Agent contract — every agent implements this shape
// ---------------------------------------------------------------------------

export interface AgentResult<T> {
  agent: string;
  generatedAt: string;
  data: T;
  notes?: string[];
}
