import * as fs from "node:fs";
import * as path from "node:path";
import * as dotenv from "dotenv";
import type { AppConfig, ModelProvider, ModelProviderConfig } from "../types/index";
import { isProviderConfigured } from "../modelRouter";

dotenv.config();

function findProjectRoot(startDir: string): string {
  let dir = startDir;
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(dir, "package.json"))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break; // reached filesystem root
    dir = parent;
  }
  // Fall back to the original assumption if no package.json was found.
  return path.resolve(startDir, "..", "..");
}

export const PROJECT_ROOT = findProjectRoot(__dirname);
export const LOCAL_DATA_DIR = path.join(PROJECT_ROOT, "data", "local");
export const CONFIG_PATH = path.join(LOCAL_DATA_DIR, "config.json");
export const SAMPLE_CALENDAR_PATH = path.join(PROJECT_ROOT, "data", "sample", "calendar.sample.json");
export const SAMPLE_NEWS_PATH = path.join(PROJECT_ROOT, "data", "sample", "news.sample.json");
export const STRATEGIES_DIR = path.join(PROJECT_ROOT, "data", "strategies");
export const REPORTS_DIR = path.join(PROJECT_ROOT, "reports");
export const DEFAULT_DB_PATH = path.join(LOCAL_DATA_DIR, "bout.db");
export const JOURNAL_MARKDOWN_DIR = path.join(REPORTS_DIR, "journal");

export const DISCLAIMER =
  "BOUT provides market context, educational analysis, and risk awareness only. " +
  "It does not provide financial advice and makes no guarantees about future price action. " +
  "Nothing produced by this tool is a recommendation to buy, sell, or hold any asset. " +
  "Always do your own research and consider consulting a licensed financial professional.";

function buildDefaultModelConfigs(): Record<ModelProvider, ModelProviderConfig> {
  return {
    claude: {
      provider: "claude",
      apiKey: process.env.ANTHROPIC_API_KEY || "",
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
    },
    openai: {
      provider: "openai",
      apiKey: process.env.OPENAI_API_KEY || "",
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    },
    ollama: {
      provider: "ollama",
      baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
      model: process.env.OLLAMA_MODEL || "llama3.1",
    },
  };
}

export function getDefaultConfig(): AppConfig {
  const validProviders: ModelProvider[] = ["claude", "openai", "ollama"];
  const envProvider = process.env.BOUT_MODEL_PROVIDER as ModelProvider | undefined;
  const modelProvider = envProvider && validProviders.includes(envProvider) ? envProvider : null;

  return {
    modelProvider,
    models: buildDefaultModelConfigs(),
    dbPath: process.env.BOUT_DB_PATH || DEFAULT_DB_PATH,
    reportsDir: REPORTS_DIR,
    initialized: false,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Returns the active provider's config, or null if no real AI provider (Claude,
 * OpenAI, or Ollama) is configured yet. BOUT has no offline/mock AI mode —
 * AI-dependent commands must check this and refuse to run when it's null.
 */
export function getActiveModelConfig(config: AppConfig): ModelProviderConfig | null {
  if (!config.modelProvider) return null;
  const providerConfig = config.models[config.modelProvider];
  return isProviderConfigured(providerConfig) ? providerConfig : null;
}

function ensureDirs(): void {
  for (const dir of [LOCAL_DATA_DIR, REPORTS_DIR, JOURNAL_MARKDOWN_DIR]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

export function isInitialized(): boolean {
  return fs.existsSync(CONFIG_PATH);
}

export function loadConfig(): AppConfig {
  if (!fs.existsSync(CONFIG_PATH)) {
    return getDefaultConfig();
  }
  const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
  const saved = JSON.parse(raw) as AppConfig;
  // Merge in any newly-added env-derived model configs without clobbering saved keys.
  const merged: AppConfig = {
    ...getDefaultConfig(),
    ...saved,
    models: { ...buildDefaultModelConfigs(), ...saved.models },
  };
  return merged;
}

export function saveConfig(config: AppConfig): void {
  ensureDirs();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}

export function initConfig(): AppConfig {
  ensureDirs();
  const existing = isInitialized() ? loadConfig() : null;
  const config: AppConfig = existing ?? getDefaultConfig();
  config.initialized = true;
  saveConfig(config);
  return config;
}
