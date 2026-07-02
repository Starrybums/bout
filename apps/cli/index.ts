#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";

// node:sqlite is still flagged experimental upstream but is what we rely on
// for local storage in this MVP (see src/memory/sqliteStore.ts for the
// rationale). Suppress just this one warning so CLI output stays clean;
// every other process warning still surfaces normally.
process.removeAllListeners("warning");
process.on("warning", (warning) => {
  if (warning.name === "ExperimentalWarning" && /SQLite/i.test(warning.message)) {
    return;
  }
  console.warn(warning);
});

import { initCommand } from "./commands/init";
import { briefTodayCommand } from "./commands/brief";
import { newsScanCommand } from "./commands/news";
import { calendarTodayCommand, calendarUpcomingCommand } from "./commands/calendar";
import { watchAddCommand, watchListCommand } from "./commands/watch";
import { journalAddCommand, journalListCommand } from "./commands/journal";
import { reportDailyCommand } from "./commands/report";
import { modelListCommand, modelSetCommand } from "./commands/model";
import { alertTestCommand } from "./commands/alert";
import { analyzeOrderFlowCommand, analyzeVolumeCommand, analyzeHeatmapCommand, analyzeRhythmCommand, analyzeIctCommand } from "./commands/analyze";
import { strategyListCommand, strategyShowCommand } from "./commands/strategy";
import { confluenceTodayCommand } from "./commands/confluence";
import { isInitialized } from "../../src/config/defaultConfig";

const program = new Command();

program
  .name("bout")
  .description(
    "BOUT — Briefing, Order Flow, Updates, Timing. A terminal-native AI market research desk. " +
      "Know what the market is about before you trade. Research and market context only — not financial advice. " +
      "JustBout.com"
  )
  .version("0.2.0");

function ensureInitializedOrWarn(): void {
  if (!isInitialized()) {
    console.log(
      chalk.yellow("Note: BOUT hasn't been initialized yet. Run `bout init` first for a clean setup.\n")
    );
  }
}

// -- init --------------------------------------------------------------------
program
  .command("init")
  .description("Initialize BOUT (creates local config and data directories)")
  .action(() => {
    initCommand();
  });

// -- brief --------------------------------------------------------------------
const brief = program.command("brief").description("Daily briefing commands");
brief
  .command("today")
  .description("Generate today's market briefing (macro + news + risk)")
  .action(async () => {
    ensureInitializedOrWarn();
    await briefTodayCommand();
  });

// -- news ----------------------------------------------------------------------
const news = program.command("news").description("News scanning commands");
news
  .command("scan")
  .description("Scan recent headlines and classify them into impact cards")
  .option("--hours <hours>", "lookback window in hours", "48")
  .action(async (opts: { hours: string }) => {
    ensureInitializedOrWarn();
    await newsScanCommand(Number(opts.hours) || 48);
  });

// -- calendar --------------------------------------------------------------------
const calendar = program.command("calendar").description("Economic calendar commands");
calendar
  .command("today")
  .description("Show today's economic calendar events")
  .action(() => {
    ensureInitializedOrWarn();
    calendarTodayCommand();
  });
calendar
  .command("upcoming")
  .description("Show upcoming economic calendar events")
  .option("--days <days>", "how many days ahead to look", "7")
  .action((opts: { days: string }) => {
    ensureInitializedOrWarn();
    calendarUpcomingCommand(Number(opts.days) || 7);
  });

// -- watch ----------------------------------------------------------------------
const watch = program.command("watch").description("Watchlist commands");
watch
  .command("add <symbol>")
  .description("Add a symbol to your watchlist")
  .action((symbol: string) => {
    ensureInitializedOrWarn();
    watchAddCommand(symbol);
  });
watch
  .command("list")
  .description("List your watchlist with mock prices")
  .action(() => {
    ensureInitializedOrWarn();
    watchListCommand();
  });

// -- journal ----------------------------------------------------------------------
const journal = program.command("journal").description("Trade journal commands");
journal
  .command("add")
  .description("Log a trade and generate an AI-assisted review")
  .requiredOption("--symbol <symbol>", "ticker/symbol, e.g. NQ")
  .requiredOption("--direction <direction>", "long or short")
  .requiredOption("--entry <price>", "entry price")
  .requiredOption("--exit <price>", "exit price")
  .requiredOption("--stop <price>", "stop-loss price")
  .requiredOption("--target <price>", "target price")
  .option("--setup <setup>", "setup name or rationale", "")
  .option("--emotion <emotion>", "emotional state going into the trade", "")
  .option("--notes <notes>", "freeform notes", "")
  .action(async (opts) => {
    ensureInitializedOrWarn();
    await journalAddCommand(opts);
  });
journal
  .command("list")
  .description("List logged trades")
  .action(() => {
    ensureInitializedOrWarn();
    journalListCommand();
  });

// -- report ----------------------------------------------------------------------
const report = program.command("report").description("Reporting commands");
report
  .command("daily")
  .description("Generate an end-of-day summary report of today's trading activity")
  .action(() => {
    ensureInitializedOrWarn();
    reportDailyCommand();
  });

// -- model ----------------------------------------------------------------------
const model = program.command("model").description("AI model provider commands");
model
  .command("list")
  .description("List available model providers and their configuration status")
  .action(() => {
    modelListCommand();
  });
model
  .command("set <provider>")
  .description("Set the active model provider (claude | openai | ollama)")
  .action((provider: string) => {
    modelSetCommand(provider);
  });

// -- alert ----------------------------------------------------------------------
const alert = program.command("alert").description("Alert commands");
alert
  .command("test")
  .description("Send a test alert to the terminal")
  .action(() => {
    alertTestCommand();
  });

// -- analyze ----------------------------------------------------------------------
const analyze = program.command("analyze").description("Market-analysis modules (order flow, volume, heat map, rhythm, ICT)");
analyze
  .command("orderflow")
  .description("Order flow analysis: bid/ask imbalance, delta, absorption, sweeps, and more (mock/placeholder data)")
  .option("--symbol <symbol>", "analyze a single symbol instead of the watchlist/default basket")
  .action((opts: { symbol?: string }) => {
    ensureInitializedOrWarn();
    analyzeOrderFlowCommand(opts.symbol);
  });
analyze
  .command("volume")
  .description("Volume analysis: relative volume, spikes, exhaustion, divergence, and more (mock/placeholder data)")
  .option("--symbol <symbol>", "analyze a single symbol instead of the watchlist/default basket")
  .action((opts: { symbol?: string }) => {
    ensureInitializedOrWarn();
    analyzeVolumeCommand(opts.symbol);
  });
analyze
  .command("heatmap")
  .description("Sector/forex/crypto/commodity heat map and risk-on/risk-off tone (mock/placeholder data)")
  .action(() => {
    ensureInitializedOrWarn();
    analyzeHeatmapCommand();
  });
analyze
  .command("rhythm")
  .description("Market rhythm: current session, trending/ranging/choppy/event-driven read, danger zones")
  .action(() => {
    ensureInitializedOrWarn();
    analyzeRhythmCommand();
  });
analyze
  .command("ict")
  .description("ICT-style concepts: FVG, liquidity sweep, BOS, MSS, kill zones, and more (educational, not guaranteed)")
  .option("--symbol <symbol>", "analyze a single symbol instead of the watchlist/default basket")
  .action((opts: { symbol?: string }) => {
    ensureInitializedOrWarn();
    analyzeIctCommand(opts.symbol);
  });

// -- strategy ----------------------------------------------------------------------
const strategy = program.command("strategy").description("Strategy knowledge base (educational templates)");
strategy
  .command("list")
  .description("List all strategy templates")
  .action(() => {
    strategyListCommand();
  });
strategy
  .command("show <name>")
  .description("Show full detail for one strategy template (by slug or name)")
  .action((name: string) => {
    strategyShowCommand(name);
  });

// -- confluence ----------------------------------------------------------------------
const confluence = program.command("confluence").description("Confluence engine — combines every analysis module into one report");
confluence
  .command("today")
  .description("Combine macro, news, order flow, volume, heat map, rhythm, and ICT into today's confluence report")
  .action(async () => {
    ensureInitializedOrWarn();
    await confluenceTodayCommand();
  });

program.parseAsync(process.argv).catch((err) => {
  console.error(chalk.red(`Error: ${(err as Error).message}`));
  process.exitCode = 1;
});
