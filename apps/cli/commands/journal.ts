import * as crypto from "node:crypto";
import chalk from "chalk";
import { loadConfig, getActiveModelConfig } from "../../../src/config/defaultConfig";
import { SqliteStore } from "../../../src/memory/sqliteStore";
import { writeJournalReviewMarkdown } from "../../../src/memory/markdownStore";
import { runJournalAgent } from "../../../src/agents/journalAgent";
import type { Direction, JournalEntry } from "../../../src/types/index";

export interface JournalAddOptions {
  symbol?: string;
  direction?: string;
  entry?: string;
  exit?: string;
  stop?: string;
  target?: string;
  setup?: string;
  emotion?: string;
  notes?: string;
}

function requireNumber(label: string, value: string | undefined): number {
  if (value === undefined || value.trim() === "") {
    throw new Error(`Missing required option --${label} <number>`);
  }
  const n = Number(value);
  if (Number.isNaN(n)) {
    throw new Error(`Option --${label} must be a number, got "${value}"`);
  }
  return n;
}

export async function journalAddCommand(options: JournalAddOptions): Promise<void> {
  if (!options.symbol) {
    console.log(chalk.red("Missing required --symbol <SYMBOL>"));
    printUsage();
    process.exitCode = 1;
    return;
  }
  if (options.direction !== "long" && options.direction !== "short") {
    console.log(chalk.red('Missing or invalid --direction <long|short>'));
    printUsage();
    process.exitCode = 1;
    return;
  }

  let entryPrice: number, exitPrice: number, stopPrice: number, targetPrice: number;
  try {
    entryPrice = requireNumber("entry", options.entry);
    exitPrice = requireNumber("exit", options.exit);
    stopPrice = requireNumber("stop", options.stop);
    targetPrice = requireNumber("target", options.target);
  } catch (err) {
    console.log(chalk.red((err as Error).message));
    printUsage();
    process.exitCode = 1;
    return;
  }

  const entry: JournalEntry = {
    id: crypto.randomUUID(),
    symbol: options.symbol.toUpperCase(),
    direction: options.direction as Direction,
    entry: entryPrice,
    exit: exitPrice,
    stop: stopPrice,
    target: targetPrice,
    setup: options.setup ?? "",
    emotion: options.emotion ?? "",
    notes: options.notes ?? "",
    createdAt: new Date().toISOString(),
  };

  const config = loadConfig();
  const store = new SqliteStore(config.dbPath);
  try {
    store.addJournalEntry(entry);
    console.log(chalk.green(`✔ Logged trade ${entry.symbol} (${entry.direction}).`));

    const result = await runJournalAgent({ entry, modelConfig: getActiveModelConfig(config) });
    store.saveJournalReview(result.data.review);
    const reviewPath = writeJournalReviewMarkdown(entry, result.data.review);

    console.log("");
    console.log(chalk.bold.underline("Trade Review"));
    console.log(`Planned R:R — ${result.data.review.riskRewardPlanned ?? "n/a"}`);
    console.log(`Realized R:R — ${result.data.review.riskRewardRealized ?? "n/a"}`);
    console.log("");
    console.log(chalk.bold("What went well:"));
    result.data.review.whatWentWell.forEach((s) => console.log(`  - ${s}`));
    console.log(chalk.bold("What went wrong:"));
    result.data.review.whatWentWrong.forEach((s) => console.log(`  - ${s}`));
    if (result.data.review.ruleViolations.length) {
      console.log(chalk.bold.red("Rule violations:"));
      result.data.review.ruleViolations.forEach((s) => console.log(`  - ${s}`));
    }
    console.log(chalk.bold("Improvement for next time:"));
    result.data.review.improvementForNextTime.forEach((s) => console.log(`  - ${s}`));
    console.log("");
    console.log(chalk.dim(`Full review saved to: ${reviewPath}`));
  } finally {
    store.close();
  }
}

export function journalListCommand(): void {
  const config = loadConfig();
  const store = new SqliteStore(config.dbPath);
  try {
    const entries = store.listJournalEntries();
    console.log(chalk.bold.underline("Journal"));
    console.log("");
    if (entries.length === 0) {
      console.log(chalk.gray("No trades logged yet. Add one with: bout journal add --symbol NQ --direction long ..."));
      return;
    }
    for (const e of entries) {
      const review = store.getJournalReview(e.id);
      const rrLabel = review?.riskRewardRealized != null ? `R:R ${review.riskRewardRealized}` : "no review";
      console.log(
        `${chalk.dim(e.createdAt.slice(0, 16).replace("T", " "))}  ${chalk.bold(e.symbol.padEnd(8))} ${e.direction.padEnd(6)} entry ${e.entry} → exit ${e.exit}  (${rrLabel})`
      );
    }
  } finally {
    store.close();
  }
}

function printUsage(): void {
  console.log("");
  console.log(chalk.dim("Usage:"));
  console.log(
    chalk.dim(
      "  bout journal add --symbol NQ --direction long --entry 19800 --exit 19850 --stop 19770 --target 19880 --setup \"VWAP reclaim\" --emotion calm --notes \"...\""
    )
  );
}
