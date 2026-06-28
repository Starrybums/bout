/**
 * Market Rhythm Module.
 *
 * Rhythm theory here means market TIMING and BEHAVIOR PATTERNS — not magic
 * prediction. Two different kinds of data are mixed deliberately:
 *   - `currentSession` is REAL: derived from the actual clock (US Eastern
 *     Time), since session windows (premarket, lunch, power hour, etc.) are
 *     simply facts about the time of day.
 *   - `rhythmState` / `volatilityState` are MOCK/illustrative, deterministic
 *     per day, EXCEPT for one real rule: if a high-impact macro event is on
 *     today's calendar, the day is treated as "event-driven" outright, since
 *     that's a defensible, explainable rule rather than a guess.
 *
 * Nothing here predicts what the market will do — it describes typical
 * session behavior patterns and flags conditions to monitor.
 */
import type { EconomicEvent } from "../types/index";
import { dailySeed, chance } from "./mockSignal";

export type RhythmState = "trending" | "ranging" | "choppy" | "event-driven";
export type VolatilityState = "expansion" | "contraction";

export interface RhythmResult {
  date: string;
  generatedAt: string;
  currentSession: string;
  sessionBucket: string;
  rhythmState: RhythmState;
  volatilityState: VolatilityState;
  bestWindowToObserve: string;
  dangerZones: string[];
  explanation: string;
  isMock: true;
}

interface SessionInfo {
  bucket: string;
  label: string;
  isWeekend: boolean;
}

function getEasternTimeParts(referenceDate: Date): { totalMinutes: number; weekday: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  }).formatToParts(referenceDate);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const hour = Number(get("hour"));
  const minute = Number(get("minute"));
  const weekday = get("weekday");

  return { totalMinutes: hour * 60 + minute, weekday };
}

function getSessionInfo(referenceDate: Date): SessionInfo {
  const { totalMinutes, weekday } = getEasternTimeParts(referenceDate);
  const isWeekend = weekday === "Sat" || weekday === "Sun";

  if (isWeekend) {
    return { bucket: "weekend", label: "Weekend — US cash equity/futures session closed (crypto/FX continue trading)", isWeekend: true };
  }
  if (totalMinutes < 4 * 60) return { bucket: "overnight", label: "Overnight (00:00–04:00 ET)", isWeekend: false };
  if (totalMinutes < 9 * 60 + 30) return { bucket: "premarket", label: "Premarket (04:00–09:30 ET)", isWeekend: false };
  if (totalMinutes < 10 * 60) return { bucket: "opening_range", label: "Opening range (09:30–10:00 ET)", isWeekend: false };
  if (totalMinutes < 11 * 60 + 30) return { bucket: "morning_trend", label: "Morning trend window (10:00–11:30 ET)", isWeekend: false };
  if (totalMinutes < 13 * 60 + 30) return { bucket: "lunch_chop", label: "Lunch chop (11:30–13:30 ET)", isWeekend: false };
  if (totalMinutes < 15 * 60) return { bucket: "early_afternoon", label: "Early afternoon (13:30–15:00 ET)", isWeekend: false };
  if (totalMinutes < 16 * 60) return { bucket: "power_hour", label: "Power hour (15:00–16:00 ET)", isWeekend: false };
  if (totalMinutes < 20 * 60) return { bucket: "after_hours", label: "After hours (16:00–20:00 ET)", isWeekend: false };
  return { bucket: "overnight", label: "Overnight (20:00–24:00 ET)", isWeekend: false };
}

function resolveRhythmState(bucket: string, hasHighImpactEventToday: boolean, seedBase: string): RhythmState {
  if (hasHighImpactEventToday) return "event-driven";

  switch (bucket) {
    case "weekend":
    case "overnight":
    case "after_hours":
    case "premarket":
    case "lunch_chop":
      return "choppy";
    case "opening_range":
      return chance(`${seedBase}-opening`, 0.5) ? "trending" : "ranging";
    case "morning_trend":
      return chance(`${seedBase}-morning`, 0.7) ? "trending" : "ranging";
    case "early_afternoon":
      return chance(`${seedBase}-afternoon`, 0.5) ? "trending" : "ranging";
    case "power_hour":
      return pick3(seedBase);
    default:
      return "ranging";
  }
}

function pick3(seedBase: string): RhythmState {
  const r = chance(`${seedBase}-power-a`, 0.34) ? "trending" : chance(`${seedBase}-power-b`, 0.5) ? "ranging" : "choppy";
  return r as RhythmState;
}

function bestWindowFor(state: RhythmState): string {
  switch (state) {
    case "trending":
      return "Morning trend window (10:00–11:30 ET) often shows continuation of the open's directional bias — general session-timing context, not specific to today's price action.";
    case "ranging":
      return "Consider waiting for a clean break of the opening range (09:30–10:00 ET) before treating either side as resolved.";
    case "choppy":
      return "Lower-quality window for directional decisions — many traders simply observe through choppy stretches like lunch (11:30–13:30 ET) rather than press trades.";
    case "event-driven":
      return "The 30–60 minutes around today's scheduled high-impact release(s) is typically the highest-information window — also the highest-volatility one.";
  }
}

function formatEventTimeET(event: EconomicEvent): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(event.time));
}

export function runMarketRhythmAnalysis(events: EconomicEvent[], referenceDate: Date = new Date()): RhythmResult {
  const date = dailySeed(referenceDate);
  const seedBase = `rhythm-${date}`;
  const session = getSessionInfo(referenceDate);

  const highImpactEvents = events.filter((e) => e.impactLevel === "high");
  const rhythmState = resolveRhythmState(session.bucket, highImpactEvents.length > 0, seedBase);
  const volatilityState: VolatilityState = rhythmState === "trending" || rhythmState === "event-driven" ? "expansion" : "contraction";

  const dangerZones: string[] = [
    "First 5 minutes of the session — wide spreads, fast moves",
    "Lunch chop window (11:30–13:30 ET) — typically the lowest-quality signals of the day",
    "Last 10 minutes before the power-hour close — late repositioning can whip price",
  ];
  for (const ev of highImpactEvents) {
    dangerZones.push(`${ev.title} around ${formatEventTimeET(ev)} ET — expect a volatility spike around the release`);
  }

  const explanation =
    `Current session: ${session.label}. Rhythm state read as "${rhythmState}" ` +
    `(${highImpactEvents.length > 0 ? "driven by today's high-impact calendar event(s)" : "an illustrative mock read for the current session bucket"}), ` +
    `volatility state "${volatilityState}". Session timing itself reflects the real clock; the trending/ranging/choppy ` +
    "read is illustrative mock data demonstrating this module's interface, not a live volatility calculation.";

  return {
    date,
    generatedAt: new Date().toISOString(),
    currentSession: session.label,
    sessionBucket: session.bucket,
    rhythmState,
    volatilityState,
    bestWindowToObserve: bestWindowFor(rhythmState),
    dangerZones,
    explanation,
    isMock: true,
  };
}
