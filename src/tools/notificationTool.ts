/**
 * Notification tool.
 *
 * MVP: prints alerts to the terminal only.
 * Future: SMS (Twilio), Telegram bot, Discord webhook — see stub functions
 * below. Each stub documents exactly what it will need (env vars, payload
 * shape) so wiring them up later is a small, contained change.
 */
import chalk from "chalk";

export type AlertSeverity = "info" | "warning" | "critical";

export interface AlertPayload {
  title: string;
  message: string;
  severity: AlertSeverity;
}

export function sendTerminalAlert(alert: AlertPayload): void {
  const color =
    alert.severity === "critical" ? chalk.bgRed.white.bold : alert.severity === "warning" ? chalk.yellow.bold : chalk.cyan.bold;

  console.log("");
  console.log(color(` ⚡ BOUT ALERT [${alert.severity.toUpperCase()}] `));
  console.log(chalk.bold(alert.title));
  console.log(alert.message);
  console.log("");
}

/**
 * FUTURE: Telegram bot alert.
 * Needs: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID env vars.
 * Would POST to https://api.telegram.org/bot<token>/sendMessage
 */
export async function sendTelegramAlert(_alert: AlertPayload): Promise<void> {
  throw new Error("Telegram alerts are not implemented yet. Planned for a future BOUT release.");
}

/**
 * FUTURE: Discord webhook alert.
 * Needs: DISCORD_WEBHOOK_URL env var.
 * Would POST a JSON payload { content: string } to the webhook URL.
 */
export async function sendDiscordAlert(_alert: AlertPayload): Promise<void> {
  throw new Error("Discord alerts are not implemented yet. Planned for a future BOUT release.");
}

/**
 * FUTURE: SMS alert via Twilio.
 * Needs: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER, TWILIO_TO_NUMBER.
 */
export async function sendSmsAlert(_alert: AlertPayload): Promise<void> {
  throw new Error("SMS alerts are not implemented yet. Planned for a future BOUT release.");
}
