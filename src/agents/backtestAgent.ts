import * as fs from "node:fs";
import * as path from "node:path";
import { parse as parseYaml } from "yaml";
import type { AgentResult } from "../types/index";
import { STRATEGIES_DIR } from "../config/defaultConfig";

export interface BacktestAgentInput {
  strategyName: string;
}

export interface StrategyDefinition {
  name: string;
  description: string;
  market: string[];
  timeframe: string;
  status: string;
  rules?: Record<string, string[]>;
  risk?: Record<string, unknown>;
  backtest?: { engine: unknown; history_loaded: boolean; last_run: unknown };
}

export interface BacktestAgentOutput {
  strategy: StrategyDefinition | null;
  message: string;
}

const AGENT_NAME = "BacktestAgent";

export function listStrategies(): string[] {
  if (!fs.existsSync(STRATEGIES_DIR)) return [];
  return fs
    .readdirSync(STRATEGIES_DIR)
    .filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"))
    .map((f) => f.replace(/\.ya?ml$/, ""));
}

export async function runBacktestAgent(input: BacktestAgentInput): Promise<AgentResult<BacktestAgentOutput>> {
  const filePath = path.join(STRATEGIES_DIR, `${input.strategyName}.yaml`);

  if (!fs.existsSync(filePath)) {
    return {
      agent: AGENT_NAME,
      generatedAt: new Date().toISOString(),
      data: {
        strategy: null,
        message: `No strategy file found at ${filePath}. Available strategies: ${listStrategies().join(", ") || "none"}.`,
      },
      notes: ["Backtest engine is not implemented in this MVP — this is a placeholder."],
    };
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const strategy = parseYaml(raw) as StrategyDefinition;

  return {
    agent: AGENT_NAME,
    generatedAt: new Date().toISOString(),
    data: {
      strategy,
      message:
        `Loaded strategy "${strategy.name}". No backtest engine is wired up yet — ` +
        "this agent currently only parses and validates the strategy definition. " +
        "A historical-data backtest runner is on the roadmap.",
    },
    notes: ["Backtest engine is not implemented in this MVP — this is a placeholder."],
  };
}
