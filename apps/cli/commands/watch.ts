import chalk from "chalk";
import { loadConfig } from "../../../src/config/defaultConfig";
import { SqliteStore } from "../../../src/memory/sqliteStore";
import { getMockQuote } from "../../../src/tools/marketDataTool";

const VALID_SYMBOLS = new Set(["NQ", "ES", "GC", "CL", "DXY", "EURUSD", "BTC"]);

export function watchAddCommand(symbol: string): void {
  const upper = symbol.toUpperCase();
  if (!VALID_SYMBOLS.has(upper)) {
    console.log(
      chalk.yellow(
        `"${upper}" isn't in the default sample symbol set (${[...VALID_SYMBOLS].join(", ")}), but adding it anyway — ` +
          "mock pricing will just use a generic base price."
      )
    );
  }

  const config = loadConfig();
  const store = new SqliteStore(config.dbPath);
  try {
    store.addWatchlistItem({ symbol: upper, addedAt: new Date().toISOString() });
    console.log(chalk.green(`✔ Added ${upper} to your watchlist.`));
  } finally {
    store.close();
  }
}

export function watchListCommand(): void {
  const config = loadConfig();
  const store = new SqliteStore(config.dbPath);
  try {
    const items = store.listWatchlist();
    console.log(chalk.bold.underline("Watchlist"));
    console.log("");
    if (items.length === 0) {
      console.log(chalk.gray("Your watchlist is empty. Add a symbol with: bout watch add NQ"));
      return;
    }
    for (const item of items) {
      const quote = getMockQuote(item.symbol);
      const changeColor = quote.changePct >= 0 ? chalk.green : chalk.red;
      const sign = quote.changePct >= 0 ? "+" : "";
      console.log(
        `${chalk.bold(item.symbol.padEnd(8))} ${quote.price.toString().padEnd(10)} ${changeColor(`${sign}${quote.changePct}%`)} ${chalk.dim("(mock price)")}`
      );
    }
  } finally {
    store.close();
  }
}
