import chalk from "chalk";
import { getEventsForToday, getUpcomingEvents } from "../../../src/tools/calendarTool";
import type { EconomicEvent } from "../../../src/types/index";

const IMPACT_COLOR = {
  high: chalk.red.bold,
  medium: chalk.yellow.bold,
  low: chalk.gray,
};

function printEvent(event: EconomicEvent): void {
  const color = IMPACT_COLOR[event.impactLevel];
  const localTime = new Date(event.time).toISOString().replace("T", " ").slice(0, 16) + " UTC";
  console.log(`${color(`[${event.impactLevel.toUpperCase()}]`)} ${chalk.bold(event.title)}  ${chalk.dim(localTime)}`);
  console.log(`   ${event.country} · affects: ${event.affectedAssets.join(", ")}`);
  console.log(`   ${event.explanation}`);
  console.log("");
}

export function calendarTodayCommand(): void {
  const events = getEventsForToday();
  console.log(chalk.bold.underline("Economic Calendar — Today"));
  console.log("");
  if (events.length === 0) {
    console.log(chalk.gray("No events found."));
    return;
  }
  events.forEach(printEvent);
}

export function calendarUpcomingCommand(days: number): void {
  const events = getUpcomingEvents(days);
  console.log(chalk.bold.underline(`Economic Calendar — Next ${days} day(s)`));
  console.log("");
  if (events.length === 0) {
    console.log(chalk.gray("No events found."));
    return;
  }
  events.forEach(printEvent);
}
