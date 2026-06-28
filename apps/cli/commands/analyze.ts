import chalk from "chalk";
import { loadConfig } from "../../../src/config/defaultConfig";
import { SqliteStore } from "../../../src/memory/sqliteStore";
import { getEventsForToday } from "../../../src/tools/calendarTool";
import { runOrderFlowAnalysis, type DirectionalTag } from "../../../src/analysis/orderFlow";
import { runVolumeAnalysis } from "../../../src/analysis/volumeAnalysis";
import { runHeatMapAnalysis, type HeatMapGroup } from "../../../src/analysis/heatMap";
import { runMarketRhythmAnalysis } from "../../../src/analysis/marketRhythm";
import { runICTAnalysis } from "../../../src/analysis/ictConcepts";
import { DEFAULT_SYMBOL_BASKET } from "../../../src/analysis/confluenceEngine";

function resolveSymbols(symbolOption?: string): string[] {
  if (symbolOption) return [symbolOption.toUpperCase()];

  const config = loadConfig();
  const store = new SqliteStore(config.dbPath);
  try {
    const watchlist = store.listWatchlist();
    if (watchlist.length > 0) return watchlist.map((w) => w.symbol);
    return DEFAULT_SYMBOL_BASKET;
  } finally {
    store.close();
  }
}

function tagColor(tag: DirectionalTag): (s: string) => string {
  return tag === "bullish" ? chalk.green.bold : tag === "bearish" ? chalk.red.bold : chalk.gray;
}

// ---------------------------------------------------------------------------
// analyze orderflow
// ---------------------------------------------------------------------------

export function analyzeOrderFlowCommand(symbolOption?: string): void {
  const symbols = resolveSymbols(symbolOption);
  console.log(chalk.bold.underline("Order Flow Analysis (mock/placeholder data)"));
  console.log("");

  for (const symbol of symbols) {
    const result = runOrderFlowAnalysis(symbol);
    const color = tagColor(result.bias);
    console.log(`${chalk.bold(symbol)} — bias: ${color(result.bias)} (confidence: ${result.confidenceLevel})`);
    for (const r of result.conceptReadings) {
      console.log(`  ${tagColor(r.tag)("•")} ${r.concept}: ${r.reading}`);
    }
    console.log(chalk.bold("  Confirmation signs:"));
    result.confirmationSigns.forEach((s) => console.log(`    - ${s}`));
    console.log(chalk.bold("  Warning signs:"));
    result.warningSigns.length ? result.warningSigns.forEach((s) => console.log(`    - ${s}`)) : console.log("    - None flagged.");
    console.log(chalk.dim(`  ${result.explanation}`));
    console.log(chalk.dim(`  ${result.dataNote}`));
    console.log("");
  }
}

// ---------------------------------------------------------------------------
// analyze volume
// ---------------------------------------------------------------------------

export function analyzeVolumeCommand(symbolOption?: string): void {
  const symbols = resolveSymbols(symbolOption);
  console.log(chalk.bold.underline("Volume Analysis (mock/placeholder data)"));
  console.log("");

  for (const symbol of symbols) {
    const result = runVolumeAnalysis(symbol);
    const confirmColor = result.confirmsMove === "confirms" ? chalk.green.bold : result.confirmsMove === "rejects" ? chalk.red.bold : chalk.gray;
    console.log(`${chalk.bold(symbol)} — condition: ${chalk.bold(result.volumeCondition)}, move confirmation: ${confirmColor(result.confirmsMove)}`);
    for (const r of result.conceptReadings) {
      const c = r.tag === "supportive" ? chalk.green : r.tag === "cautionary" ? chalk.red : chalk.gray;
      console.log(`  ${c("•")} ${r.concept}: ${r.reading}`);
    }
    console.log(chalk.bold("  Structural notes:"));
    result.structuralNotes.forEach((s) => console.log(`    - ${s}`));
    console.log(chalk.bold("  Caution notes:"));
    result.cautionNotes.forEach((s) => console.log(`    - ${s}`));
    console.log(chalk.dim(`  ${result.explanation}`));
    console.log("");
  }
}

// ---------------------------------------------------------------------------
// analyze heatmap
// ---------------------------------------------------------------------------

function printHeatGroup(g: HeatMapGroup): void {
  const color = g.score > 0 ? chalk.green : g.score < 0 ? chalk.red : chalk.gray;
  const sign = g.score > 0 ? "+" : "";
  console.log(`    ${g.name.padEnd(24)} ${color(`${sign}${g.score}`)}`);
}

export function analyzeHeatmapCommand(): void {
  const result = runHeatMapAnalysis();
  console.log(chalk.bold.underline("Heat Map (mock/placeholder data)"));
  console.log("");

  console.log(chalk.bold("Sectors:"));
  result.categories.sectors.forEach(printHeatGroup);
  console.log("");
  console.log(chalk.bold("Forex strength:"));
  result.categories.forex.forEach(printHeatGroup);
  console.log("");
  console.log(chalk.bold("Crypto:"));
  result.categories.crypto.forEach(printHeatGroup);
  console.log("");
  console.log(chalk.bold("Futures / commodities:"));
  result.categories.commodities.forEach(printHeatGroup);
  console.log("");

  console.log(`${chalk.bold("Strongest group:")} ${result.strongestGroup.name} (${result.strongestGroup.category}, ${result.strongestGroup.score})`);
  console.log(`${chalk.bold("Weakest group:")} ${result.weakestGroup.name} (${result.weakestGroup.category}, ${result.weakestGroup.score})`);
  console.log(`${chalk.bold("Overall tone:")} ${result.overallTone}`);
  console.log("");
  console.log(chalk.bold("Correlation notes:"));
  result.correlationNotes.forEach((n) => console.log(`  - ${n}`));
}

// ---------------------------------------------------------------------------
// analyze rhythm
// ---------------------------------------------------------------------------

export function analyzeRhythmCommand(): void {
  const events = getEventsForToday();
  const result = runMarketRhythmAnalysis(events);
  console.log(chalk.bold.underline("Market Rhythm"));
  console.log("");
  console.log(`${chalk.bold("Current session:")} ${result.currentSession}`);
  console.log(`${chalk.bold("Rhythm state:")} ${result.rhythmState}`);
  console.log(`${chalk.bold("Volatility state:")} ${result.volatilityState}`);
  console.log("");
  console.log(`${chalk.bold("Best window to observe:")} ${result.bestWindowToObserve}`);
  console.log("");
  console.log(chalk.bold("Danger zones:"));
  result.dangerZones.forEach((d) => console.log(`  - ${d}`));
  console.log("");
  console.log(chalk.dim(result.explanation));
}

// ---------------------------------------------------------------------------
// analyze ict
// ---------------------------------------------------------------------------

export function analyzeIctCommand(symbolOption?: string): void {
  const symbols = resolveSymbols(symbolOption);
  console.log(chalk.bold.underline("ICT Concepts (educational, rule-based — not a guaranteed system)"));
  console.log("");

  for (const symbol of symbols) {
    const result = runICTAnalysis(symbol);
    console.log(chalk.bold(symbol));
    console.log(
      `  Kill zone: ${result.killZone.active ? chalk.green.bold(`active (${result.killZone.name})`) : chalk.gray("none active")} ${chalk.dim(`— ${result.killZone.note}`)}`
    );
    for (const c of result.concepts) {
      const color = tagColor(c.context);
      console.log(`  ${color("•")} ${c.concept}${c.status === "placeholder" ? chalk.dim(" [placeholder]") : ""}: ${c.reading}`);
      if (c.status === "watching") {
        console.log(chalk.dim(`      requires confirmation: ${c.requiredConfirmation}`));
        console.log(chalk.dim(`      invalidation idea: ${c.invalidationIdea}`));
      }
      if (c.warning) console.log(chalk.yellow(`      ⚠ ${c.warning}`));
    }
    console.log(`  ${chalk.bold("Overall context:")} ${result.overallContext}`);
    console.log("");
  }
}
