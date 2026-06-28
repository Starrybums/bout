import chalk from "chalk";
import { initConfig, isInitialized } from "../../../src/config/defaultConfig";

export function initCommand(): void {
  const alreadyInitialized = isInitialized();
  const config = initConfig();

  if (alreadyInitialized) {
    console.log(chalk.yellow("BOUT was already initialized. Config reloaded, nothing was overwritten."));
  } else {
    console.log(chalk.green("✔ BOUT initialized."));
  }

  console.log("");
  console.log(`Model provider: ${chalk.bold(config.modelProvider)}`);
  console.log(`Local database: ${config.dbPath}`);
  console.log(`Reports directory: ${config.reportsDir}`);
  console.log("");
  console.log("Try these next:");
  console.log("  bout brief today");
  console.log("  bout watch add NQ");
  console.log("  bout model list");
}
