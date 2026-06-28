import * as fs from "node:fs";
import * as path from "node:path";
import chalk from "chalk";
import { loadConfig, REPORTS_DIR, DISCLAIMER } from "../../../src/config/defaultConfig";
import { SqliteStore } from "../../../src/memory/sqliteStore";

export function reportDailyCommand(): void {
  const config = loadConfig();
  const store = new SqliteStore(config.dbPath);
  try {
    const today = new Date().toISOString().slice(0, 10);
    const allEntries = store.listJournalEntries();
    const todaysEntries = allEntries.filter((e) => e.createdAt.slice(0, 10) === today);
    const watchlist = store.listWatchlist();

    const reviews = todaysEntries.map((e) => ({ entry: e, review: store.getJournalReview(e.id) }));
    const realizedRRs = reviews.map((r) => r.review?.riskRewardRealized).filter((v): v is number => v != null);
    const wins = realizedRRs.filter((v) => v > 0).length;
    const losses = realizedRRs.filter((v) => v <= 0).length;
    const avgRR = realizedRRs.length ? Number((realizedRRs.reduce((a, b) => a + b, 0) / realizedRRs.length).toFixed(2)) : null;

    console.log(chalk.bold.underline(`Daily Report — ${today}`));
    console.log("");
    console.log(`Trades logged today: ${todaysEntries.length}`);
    console.log(`Wins / Losses (by realized R:R): ${wins} / ${losses}`);
    console.log(`Average realized R:R: ${avgRR ?? "n/a"}`);
    console.log(`Watchlist size: ${watchlist.length}`);
    console.log("");

    if (todaysEntries.length > 0) {
      console.log(chalk.bold("Today's trades:"));
      for (const { entry, review } of reviews) {
        console.log(`  - ${entry.symbol} ${entry.direction} — R:R ${review?.riskRewardRealized ?? "n/a"}`);
      }
      console.log("");
    }

    const lines: string[] = [];
    lines.push(`# BOUT Daily Report — ${today}`);
    lines.push("");
    lines.push(`- Trades logged today: ${todaysEntries.length}`);
    lines.push(`- Wins / Losses (by realized R:R): ${wins} / ${losses}`);
    lines.push(`- Average realized R:R: ${avgRR ?? "n/a"}`);
    lines.push(`- Watchlist size: ${watchlist.length}`);
    lines.push("");
    if (todaysEntries.length > 0) {
      lines.push("## Today's Trades");
      for (const { entry, review } of reviews) {
        lines.push(`- **${entry.symbol} ${entry.direction}** — entry ${entry.entry}, exit ${entry.exit}, R:R ${review?.riskRewardRealized ?? "n/a"}`);
      }
      lines.push("");
    }
    lines.push("---");
    lines.push(DISCLAIMER);
    lines.push("");

    if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });
    const filePath = path.join(REPORTS_DIR, `report-${today}.md`);
    fs.writeFileSync(filePath, lines.join("\n"), "utf-8");
    console.log(chalk.dim(`Full report saved to: ${filePath}`));
  } finally {
    store.close();
  }
}
