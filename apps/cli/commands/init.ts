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
  if (config.modelProvider) {
    console.log(`Model provider: ${chalk.bold(config.modelProvider)}`);
  } else {
    console.log(chalk.yellow("Model provider: not configured"));
    console.log(
      chalk.dim(
        "  BOUT has no offline/mock AI mode. Add an API key to .env (Claude, OpenAI, or a local Ollama server), " +
          "then run `bout model set <claude|openai|ollama>` before using `bout brief` or `bout confluence`."
      )
    );
  }
  console.log(`Local database: ${config.dbPath}`);
  console.log(`Reports directory: ${config.reportsDir}`);
  console.log("");
  console.log("Try these next:");
  console.log("  bout model list");
  console.log("  bout watch add NQ");
  console.log("  bout brief today   (requires a configured AI provider)");
}
