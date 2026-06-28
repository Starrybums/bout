import chalk from "chalk";
import { loadConfig, saveConfig } from "../../../src/config/defaultConfig";
import { ALL_PROVIDERS, isProviderConfigured } from "../../../src/modelRouter";
import type { ModelProvider } from "../../../src/types/index";

export function modelListCommand(): void {
  const config = loadConfig();
  console.log(chalk.bold.underline("Model Providers"));
  console.log("");
  for (const provider of ALL_PROVIDERS) {
    const providerConfig = config.models[provider];
    const configured = isProviderConfigured(providerConfig);
    const active = provider === config.modelProvider;
    const marker = active ? chalk.green("● active ") : "         ";
    const status = configured ? chalk.green("configured") : chalk.gray("not configured");
    console.log(`${marker} ${chalk.bold(provider.padEnd(8))} model: ${(providerConfig.model || "n/a").padEnd(22)} [${status}]`);
  }
  console.log("");
  console.log(chalk.dim("Switch providers with: bout model set <mock|claude|openai|ollama>"));
}

export function modelSetCommand(provider: string): void {
  if (!ALL_PROVIDERS.includes(provider as ModelProvider)) {
    console.log(chalk.red(`Unknown provider "${provider}". Valid options: ${ALL_PROVIDERS.join(", ")}`));
    return;
  }

  const config = loadConfig();
  const providerConfig = config.models[provider as ModelProvider];
  if (!isProviderConfigured(providerConfig) && provider !== "mock") {
    console.log(
      chalk.yellow(
        `Warning: "${provider}" doesn't look fully configured yet (missing API key / connection info in .env). ` +
          "Saving the preference anyway — calls will fail with a clear error until it's configured."
      )
    );
  }

  config.modelProvider = provider as ModelProvider;
  saveConfig(config);
  console.log(chalk.green(`✔ Model provider set to "${provider}".`));
}
