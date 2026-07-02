import chalk from "chalk";
import { loadConfig, getActiveModelConfig, DISCLAIMER } from "../../../src/config/defaultConfig";
import { SqliteStore } from "../../../src/memory/sqliteStore";
import { writeBriefMarkdown } from "../../../src/memory/markdownStore";
import { getEventsForToday } from "../../../src/tools/calendarTool";
import { getRecentNews } from "../../../src/tools/newsTool";
import { runMacroAgent } from "../../../src/agents/macroAgent";
import { runNewsAgent } from "../../../src/agents/newsAgent";
import { runRiskAgent } from "../../../src/agents/riskAgent";
import { runConfluenceEngine, type SymbolAnalysisBundle } from "../../../src/analysis/confluenceEngine";
import type { ConfluenceSnapshot, DailyBrief, ImpactLevel } from "../../../src/types/index";

const RISK_COLOR: Record<ImpactLevel, (s: string) => string> = {
  high: (s) => chalk.bgRed.white.bold(s),
  medium: (s) => chalk.yellow.bold(s),
  low: (s) => chalk.green.bold(s),
};

/**
 * "Macro bias" here means the calendar's RISK tone (how much scheduled event
 * risk today carries), not a directional price call — the sample calendar
 * data has no number-surprise info to honestly base a direction on.
 */
function deriveMacroBias(events: { impactLevel: ImpactLevel }[]): string {
  const high = events.filter((e) => e.impactLevel === "high").length;
  const medium = events.filter((e) => e.impactLevel === "medium").length;
  if (high > 0) return `Elevated event risk — ${high} high-impact event(s) on today's calendar.`;
  if (medium > 0) return `Moderate event risk — ${medium} medium-impact event(s), no high-impact releases today.`;
  return "Light calendar — no high/medium-impact events flagged today.";
}

/** Same logic as deriveMacroBias: describes the news feed's risk/importance tone, not a fabricated direction. */
function deriveNewsBias(impactCards: { importance: ImpactLevel }[]): string {
  const high = impactCards.filter((c) => c.importance === "high").length;
  if (high > 0) return `${high} high-importance headline(s) flagged in the sample feed — worth a closer read.`;
  if (impactCards.length > 0) return "Routine headline flow — nothing high-importance flagged in the sample feed.";
  return "No headlines in the sample feed for this window.";
}

function summarizeOrderFlow(bundles: SymbolAnalysisBundle[]): string {
  const bullish = bundles.filter((b) => b.orderFlow.bias === "bullish").length;
  const bearish = bundles.filter((b) => b.orderFlow.bias === "bearish").length;
  const neutral = bundles.length - bullish - bearish;
  return `${bullish} bullish / ${bearish} bearish / ${neutral} neutral across ${bundles.length} analyzed symbol(s) — mock/placeholder data, conditions to monitor.`;
}

function summarizeVolume(bundles: SymbolAnalysisBundle[]): string {
  const confirms = bundles.filter((b) => b.volume.confirmsMove === "confirms").length;
  const rejects = bundles.filter((b) => b.volume.confirmsMove === "rejects").length;
  const unclear = bundles.length - confirms - rejects;
  return `${confirms} confirm / ${rejects} reject / ${unclear} unclear across ${bundles.length} analyzed symbol(s) — mock/placeholder data.`;
}

export async function briefTodayCommand(): Promise<void> {
  const config = loadConfig();
  const modelConfig = getActiveModelConfig(config);
  if (!modelConfig) {
    console.log(chalk.red("No AI provider configured — `bout brief` requires one."));
    console.log(
      chalk.dim(
        "BOUT has no offline/mock AI mode. Add an API key to .env (Claude or OpenAI), or point Ollama at a " +
          "local server, then run `bout model set <claude|openai|ollama>`. See `bout model list` for current status."
      )
    );
    process.exitCode = 1;
    return;
  }
  const store = new SqliteStore(config.dbPath);

  let brief: DailyBrief;
  try {
    const today = new Date().toISOString().slice(0, 10);
    const events = getEventsForToday();
    const newsItems = getRecentNews(48);
    const watchlist = store.listWatchlist();
    const allEntries = store.listJournalEntries();
    const todaysEntries = allEntries.filter((e) => e.createdAt.slice(0, 10) === today);

    const macroResult = await runMacroAgent({ events, modelConfig });
    const newsResult = await runNewsAgent({ items: newsItems });
    const topImpactCards = newsResult.data.impactCards.slice(0, 5);
    const riskResult = await runRiskAgent({
      events,
      impactCards: newsResult.data.impactCards,
      todaysJournalEntries: todaysEntries,
    });

    const confluence = await runConfluenceEngine({
      events,
      impactCards: newsResult.data.impactCards,
      watchlist,
      riskWarnings: riskResult.data.warnings,
      riskLevel: riskResult.data.riskLevel,
      modelConfig,
    });

    const confluenceSnapshot: ConfluenceSnapshot = {
      macroBias: deriveMacroBias(events),
      newsBias: deriveNewsBias(newsResult.data.impactCards),
      rhythmState: confluence.rhythm.rhythmState,
      orderFlowSummary: summarizeOrderFlow(confluence.symbolBundles),
      volumeSummary: summarizeVolume(confluence.symbolBundles),
      heatMapTone: confluence.heatMap.overallTone,
      strategyWatchlist: confluence.matchingStrategies.length
        ? confluence.matchingStrategies.slice(0, 4).map((s) => s.name).join(", ")
        : "No strategies currently flagged as setups to watch.",
      riskWarning: confluence.riskWarnings.length ? confluence.riskWarnings[0].reason : "None flagged.",
    };

    const affectedAssets = Array.from(
      new Set([...events.flatMap((e) => e.affectedAssets), ...topImpactCards.flatMap((c) => c.affectedAssets)])
    );

    const thingsToAvoid: string[] = [];
    if (riskResult.data.warnings.some((w) => w.level === "high")) {
      thingsToAvoid.push("Avoid sizing up immediately before/after high-impact releases listed below.");
    }
    if (watchlist.length === 0) {
      thingsToAvoid.push("Your watchlist is empty — add symbols with `bout watch add <symbol>` for more tailored briefs.");
    }

    brief = {
      date: today,
      topMacroEvents: events.slice(0, 5),
      topImpactCards,
      affectedAssets,
      riskLevel: riskResult.data.riskLevel,
      riskWarnings: riskResult.data.warnings,
      watchlist,
      thingsToAvoid,
      sourceTrail: [
        "Economic calendar: data/sample/calendar.sample.json (sample data)",
        "News headlines: data/sample/news.sample.json (sample data)",
        "Confluence snapshot: order flow / volume / heat map / rhythm modules (src/analysis/*, mock/placeholder data)",
        `Model provider: ${config.modelProvider}`,
        ...(macroResult.notes ?? []),
      ],
      disclaimer: DISCLAIMER,
      confluenceSnapshot,
    };

    printBrief(brief, macroResult.data.summary);
    const path = writeBriefMarkdown(brief);
    console.log(chalk.dim(`\nFull brief saved to: ${path}`));
  } finally {
    store.close();
  }
}

function printBrief(brief: DailyBrief, macroSummary: string): void {
  console.log(chalk.bold.underline(`BOUT Daily Brief — ${brief.date}`));
  console.log("");
  console.log(RISK_COLOR[brief.riskLevel](` RISK LEVEL: ${brief.riskLevel.toUpperCase()} `));
  console.log("");

  console.log(chalk.bold("Macro Summary:"));
  console.log(macroSummary);
  console.log("");

  console.log(chalk.bold("Top Macro Events:"));
  if (brief.topMacroEvents.length === 0) console.log(chalk.gray("  None."));
  brief.topMacroEvents.forEach((e) => console.log(`  - [${e.impactLevel}] ${e.title} (${e.time})`));
  console.log("");

  console.log(chalk.bold("Top News Impact Cards:"));
  if (brief.topImpactCards.length === 0) console.log(chalk.gray("  None."));
  brief.topImpactCards.forEach((c) => console.log(`  - [${c.importance}] ${c.headline}`));
  console.log("");

  console.log(chalk.bold("Affected Assets:"), brief.affectedAssets.join(", ") || "None");
  console.log(chalk.bold("Watchlist:"), brief.watchlist.map((w) => w.symbol).join(", ") || "Empty");
  console.log("");

  if (brief.riskWarnings.length) {
    console.log(chalk.bold("Risk Warnings:"));
    brief.riskWarnings.forEach((w) => console.log(`  - (${w.level}) ${w.reason}`));
    console.log("");
  }

  if (brief.thingsToAvoid.length) {
    console.log(chalk.bold("Things To Avoid Today:"));
    brief.thingsToAvoid.forEach((t) => console.log(`  - ${t}`));
    console.log("");
  }

  if (brief.confluenceSnapshot) {
    const s = brief.confluenceSnapshot;
    console.log(chalk.bold.underline("Confluence Snapshot:"));
    console.log(`  ${chalk.bold("Macro bias:")} ${s.macroBias}`);
    console.log(`  ${chalk.bold("News bias:")} ${s.newsBias}`);
    console.log(`  ${chalk.bold("Rhythm state:")} ${s.rhythmState}`);
    console.log(`  ${chalk.bold("Order flow:")} ${s.orderFlowSummary}`);
    console.log(`  ${chalk.bold("Volume:")} ${s.volumeSummary}`);
    console.log(`  ${chalk.bold("Heat map tone:")} ${s.heatMapTone}`);
    console.log(`  ${chalk.bold("Strategy watchlist:")} ${s.strategyWatchlist}`);
    console.log(`  ${chalk.bold("Risk warning:")} ${s.riskWarning}`);
    console.log(chalk.dim("  Run `bout confluence today` for the full breakdown."));
    console.log("");
  }

  console.log(chalk.dim("Source trail:"));
  brief.sourceTrail.forEach((s) => console.log(chalk.dim(`  - ${s}`)));
  console.log("");
  console.log(chalk.italic.dim(brief.disclaimer));
}
