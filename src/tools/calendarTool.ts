import * as fs from "node:fs";
import type { EconomicEvent } from "../types/index";
import { SAMPLE_CALENDAR_PATH } from "../config/defaultConfig";

let cache: EconomicEvent[] | null = null;

export function loadCalendarEvents(): EconomicEvent[] {
  if (cache) return cache;
  const raw = fs.readFileSync(SAMPLE_CALENDAR_PATH, "utf-8");
  cache = JSON.parse(raw) as EconomicEvent[];
  return cache;
}

/**
 * Returns events whose `time` falls on the same UTC calendar day as `referenceDate`.
 * Falls back to "next 24h from reference" if nothing matches the same UTC day —
 * keeps the sample data useful even when run on a different date than the demo data.
 */
export function getEventsForToday(referenceDate: Date = new Date()): EconomicEvent[] {
  const events = loadCalendarEvents();
  const refDay = referenceDate.toISOString().slice(0, 10);
  const sameDay = events.filter((e) => e.time.slice(0, 10) === refDay);
  if (sameDay.length > 0) return sortByTime(sameDay);

  const windowEnd = new Date(referenceDate.getTime() + 24 * 60 * 60 * 1000);
  const upcoming = events.filter((e) => {
    const t = new Date(e.time).getTime();
    return t >= referenceDate.getTime() && t <= windowEnd.getTime();
  });
  if (upcoming.length > 0) return sortByTime(upcoming);

  // Final fallback: show the soonest events in the sample set so `brief today`
  // and `calendar today` are never empty when exploring with sample data.
  return sortByTime(events).slice(0, 3);
}

export function getUpcomingEvents(days = 7, referenceDate: Date = new Date()): EconomicEvent[] {
  const events = loadCalendarEvents();
  const windowEnd = new Date(referenceDate.getTime() + days * 24 * 60 * 60 * 1000);
  return sortByTime(
    events.filter((e) => {
      const t = new Date(e.time).getTime();
      return t >= referenceDate.getTime() && t <= windowEnd.getTime();
    })
  );
}

export function getHighImpactEvents(events: EconomicEvent[]): EconomicEvent[] {
  return events.filter((e) => e.impactLevel === "high");
}

function sortByTime(events: EconomicEvent[]): EconomicEvent[] {
  return [...events].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
}
