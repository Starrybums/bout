import chalk from "chalk";
import { loadConfig } from "../../../src/config/defaultConfig";
import { SqliteStore } from "../../../src/memory/sqliteStore";
import { writeConfluenceMarkdown } from "../../../src/memory/markdownStore";
import { getEventsForToday } from "../../../src/tools/calendarTool";
import { getRecentNews } from "../../../src/tools/newsTool";
import { runNewsAgent } from "../../../src/agents/newsAgent";
import { runRiskAgent } from "../../../src/agents/riskAgent";
import { runConfluenceEngine, type ConfluenceResult } from "../../../src/analysis/confluenceEngine";

export async function confluenceTodayCommand(): Promise<void> {
  const config = loadConfig();
  const modelConfig = config.models[config.modelProvider];
  const store = new SqliteStore(config.dbPath);

  try {
    const today = new Date().toISOString().slice(0, 10);
    const events = getEventsForToday();
    const newsItems = getRecentNews(48);
    const watchlist = store.listWatchlist();
    const allEntries = store.listJournalEntries();
    const todaysEntries = allEntries.filter((e) => e.createdAt.slice(0, 10) === today);

    const newsResult = await runNewsAgent({ items: newsItems });
    const riskResult = await runRiskAgent({
      events,
      impactCards: newsResult.data.impactCards,
      todaysJournalEntries: todaysEntries,
    });

    const result = await runConfluenceEngine({
      events,
      impactCards: newsResult.data.impactCards,
      watchlist,
      riskWarnings: riskResult.data.warnings,
      riskLevel: riskResult.data.riskLevel,
      modelConfig,
    });

    printConfluence(result);
    const path = writeConfluenceMarkdown(result);
    console.log(chalk.dim(`\nFull confluence report saved to: ${path}`));
  } finally {
    store.close();
  }
}

function printConfluence(result: ConfluenceResult): void {
  console.log(chalk.bold.underline(`BOUT Confluence Report — ${result.date}`));
  console.log("");

  console.log(chalk.bold("Overall Market Context:"));
  console.log(result.overallMarketContext);
  console.log("");

  console.log(chalk.bold.green("Strongest Bullish Factors:"));
  result.bullishFactors.length ? result.bullishFactors.forEach((f) => console.log(`  - ${f}`)) : console.log(chalk.gray("  None flagged."));
  console.log("");

  console.log(chalk.bold.red("Strongest Bearish Factors:"));
  result.bearishFactors.length ? result.bearishFactors.forEach((f) => console.log(`  - ${f}`)) : console.log(chalk.gray("  None flagged."));
  console.log("");

  console.log(chalk.bold.yellow("Conflicting Signals:"));
  result.conflictingSignals.length
    ? result.conflictingSignals.forEach((f) => console.log(`  - ${f}`))
    : console.log(chalk.gray("  None flagged."));
  console.log("");

  console.log(chalk.bold("Best Assets To Watch:"));
  if (result.bestAssetsToWatch.length === 0) {
    console.log(chalk.gray("  None met the confluence threshold today."));
  } else {
    result.bestAssetsToWatch.forEach((a) => {
      const color = a.lean === "bullish" ? chalk.green.bold : chalk.red.bold;
      console.log(`  - ${chalk.bold(a.symbol)} (${color(a.lean)}): ${a.reason}`);
    });
  }
  console.log("");

  console.log(chalk.bold("Matching Strategies (setups to watch):"));
  if (result.matchingStrategies.length === 0) {
    console.log(chalk.gray("  None."));
  } else {
    result.matchingStrategies.forEach((s) => {
      const tierColor = s.matchScore === "strong" ? chalk.green.bold : s.matchScore === "partial" ? chalk.yellow.bold : chalk.gray;
      console.log(`  - ${chalk.bold(s.name)} [${tierColor(s.matchScore)}]`);
      s.reasons.forEach((r) => console.log(`      ${r}`));
    });
  }
  console.log("");

  console.log(chalk.bold("Strategies To Avoid Today:"));
  if (result.strategiesToAvoid.length === 0) {
    console.log(chalk.gray("  None."));
  } else {
    result.strategiesToAvoid.forEach((s) => {
      console.log(`  - ${chalk.bold(s.name)}`);
      s.reasons.forEach((r) => console.log(`      ${r}`));
    });
  }
  console.log("");

  console.log(chalk.bold("Risk Warnings:"));
  result.riskWarnings.length
    ? result.riskWarnings.forEach((w) => console.log(`  - (${w.level}) ${w.reason}`))
    : console.log(chalk.gray("  None flagged."));
  console.log("");

  console.log(chalk.dim("Source / data trail:"));
  result.sourceTrail.forEach((s) => console.log(chalk.dim(`  - ${s}`)));
  console.log("");
  console.log(chalk.italic.dim(result.disclaimer));
}
