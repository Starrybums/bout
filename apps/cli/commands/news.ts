import chalk from "chalk";
import { getRecentNews } from "../../../src/tools/newsTool";
import { runNewsAgent } from "../../../src/agents/newsAgent";
import type { ImpactCard, ImpactLevel } from "../../../src/types/index";

const IMPORTANCE_COLOR: Record<ImpactLevel, (s: string) => string> = {
  high: (s) => chalk.red.bold(s),
  medium: (s) => chalk.yellow.bold(s),
  low: (s) => chalk.gray(s),
};

function printCard(card: ImpactCard): void {
  const color = IMPORTANCE_COLOR[card.importance];
  console.log(`${color(`[${card.importance.toUpperCase()}]`)} ${chalk.bold(card.headline)}`);
  console.log(`   ${card.summary}`);
  console.log(
    `   ${chalk.dim(`${card.sourceName} · ${card.category} · ${card.region} · affects: ${card.affectedAssets.join(", ")}`)}`
  );
  console.log(`   ${chalk.dim(card.sourceUrl)}`);
  console.log("");
}

export async function newsScanCommand(hours: number): Promise<void> {
  const items = getRecentNews(hours);
  const result = await runNewsAgent({ items });

  console.log(chalk.bold.underline(`News Scan — last ${hours}h (sample data)`));
  console.log("");
  if (result.data.impactCards.length === 0) {
    console.log(chalk.gray("No headlines found."));
    return;
  }
  result.data.impactCards.forEach(printCard);
  if (result.notes?.length) {
    console.log(chalk.dim(`Note: ${result.notes.join(" ")}`));
  }
}
