import chalk from "chalk";
import { loadStrategyTemplates, findStrategy } from "../../../src/tools/strategyTool";

export function strategyListCommand(): void {
  const templates = loadStrategyTemplates();
  console.log(chalk.bold.underline("Strategy Knowledge Base (educational templates — not guaranteed setups)"));
  console.log("");
  for (const t of templates) {
    console.log(`${chalk.bold(t.name)} ${chalk.dim(`(${t.slug})`)}`);
    console.log(`  ${t.description}`);
    console.log(chalk.dim(`  Market: ${t.marketType.join(", ")} · Best window: ${t.bestSessionOrTimeWindow}`));
    console.log("");
  }
  console.log(chalk.dim("Run `bout strategy show <slug>` for full detail on any of the above."));
}

export function strategyShowCommand(query: string): void {
  const template = findStrategy(query);
  if (!template) {
    const templates = loadStrategyTemplates();
    console.log(chalk.red(`No strategy found matching "${query}".`));
    console.log(chalk.dim(`Available slugs: ${templates.map((t) => t.slug).join(", ")}`));
    return;
  }

  console.log(chalk.bold.underline(`${template.name} ${chalk.dim(`(${template.slug})`)}`));
  console.log("");
  console.log(template.description);
  console.log("");
  console.log(chalk.bold("Market type:"), template.marketType.join(", "));
  console.log("");
  console.log(chalk.bold("Required context:"));
  template.requiredContext.forEach((c) => console.log(`  - ${c}`));
  console.log("");
  console.log(chalk.bold("Confirmation signs:"));
  template.confirmationSigns.forEach((c) => console.log(`  - ${c}`));
  console.log("");
  console.log(chalk.bold("Invalidation signs:"));
  template.invalidationSigns.forEach((c) => console.log(`  - ${c}`));
  console.log("");
  console.log(chalk.bold("Risk notes:"));
  console.log(`  ${template.riskNotes}`);
  console.log("");
  console.log(chalk.bold("Best session / time window:"));
  console.log(`  ${template.bestSessionOrTimeWindow}`);
  console.log("");
  console.log(chalk.bold("Avoid conditions:"));
  template.avoidConditions.forEach((c) => console.log(`  - ${c}`));
  console.log("");
  console.log(chalk.italic.dim("This is a setup to watch — educational context, not a guaranteed trade."));
}
