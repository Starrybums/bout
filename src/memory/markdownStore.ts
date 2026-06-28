import * as fs from "node:fs";
import * as path from "node:path";
import type { DailyBrief, JournalEntry, JournalReview } from "../types/index";
import type { ConfluenceResult } from "../analysis/confluenceEngine";
import { JOURNAL_MARKDOWN_DIR, REPORTS_DIR } from "../config/defaultConfig";

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Writes a daily briefing to reports/brief-YYYY-MM-DD.md and returns the file path.
 */
export function writeBriefMarkdown(brief: DailyBrief): string {
  ensureDir(REPORTS_DIR);
  const fileName = `brief-${brief.date}.md`;
  const filePath = path.join(REPORTS_DIR, fileName);

  const lines: string[] = [];
  lines.push(`# BOUT Daily Brief — ${brief.date}`);
  lines.push("");
  lines.push(`**Risk level:** ${brief.riskLevel.toUpperCase()}`);
  lines.push("");
  lines.push("## Top Macro Events");
  if (brief.topMacroEvents.length === 0) {
    lines.push("- No high/medium impact events found for today's window.");
  } else {
    for (const ev of brief.topMacroEvents) {
      lines.push(`- **${ev.title}** (${ev.impactLevel}, ${ev.time}) — ${ev.explanation}`);
    }
  }
  lines.push("");
  lines.push("## Top News Impact Cards");
  if (brief.topImpactCards.length === 0) {
    lines.push("- No notable headlines in the sample feed for today.");
  } else {
    for (const card of brief.topImpactCards) {
      lines.push(`- **${card.headline}** (${card.importance}) — ${card.summary} [source: ${card.sourceName}]`);
    }
  }
  lines.push("");
  lines.push("## Affected Assets");
  lines.push(brief.affectedAssets.length ? brief.affectedAssets.join(", ") : "None flagged.");
  lines.push("");
  lines.push("## Watchlist");
  lines.push(brief.watchlist.length ? brief.watchlist.map((w) => w.symbol).join(", ") : "Watchlist is empty.");
  lines.push("");
  lines.push("## Risk Warnings");
  if (brief.riskWarnings.length === 0) {
    lines.push("- None flagged.");
  } else {
    for (const w of brief.riskWarnings) {
      lines.push(`- (${w.level}) ${w.reason}`);
    }
  }
  lines.push("");
  lines.push("## Things To Avoid Today");
  lines.push(brief.thingsToAvoid.length ? brief.thingsToAvoid.map((t) => `- ${t}`).join("\n") : "- Nothing specific flagged.");
  lines.push("");
  if (brief.confluenceSnapshot) {
    const s = brief.confluenceSnapshot;
    lines.push("## Confluence Snapshot");
    lines.push(`- **Macro bias:** ${s.macroBias}`);
    lines.push(`- **News bias:** ${s.newsBias}`);
    lines.push(`- **Rhythm state:** ${s.rhythmState}`);
    lines.push(`- **Order flow summary:** ${s.orderFlowSummary}`);
    lines.push(`- **Volume summary:** ${s.volumeSummary}`);
    lines.push(`- **Heat map tone:** ${s.heatMapTone}`);
    lines.push(`- **Strategy watchlist:** ${s.strategyWatchlist}`);
    lines.push(`- **Risk warning:** ${s.riskWarning}`);
    lines.push("");
  }
  lines.push("## Source Trail");
  lines.push(brief.sourceTrail.map((s) => `- ${s}`).join("\n"));
  lines.push("");
  lines.push("---");
  lines.push(brief.disclaimer);
  lines.push("");

  fs.writeFileSync(filePath, lines.join("\n"), "utf-8");
  return filePath;
}

/**
 * Writes a journal review to reports/journal/<entryId>.md and returns the file path.
 */
export function writeJournalReviewMarkdown(entry: JournalEntry, review: JournalReview): string {
  ensureDir(JOURNAL_MARKDOWN_DIR);
  const filePath = path.join(JOURNAL_MARKDOWN_DIR, `${entry.id}.md`);

  const lines: string[] = [];
  lines.push(`# Trade Review — ${entry.symbol} (${entry.direction.toUpperCase()})`);
  lines.push("");
  lines.push(`Logged: ${entry.createdAt}`);
  lines.push("");
  lines.push("## Trade Details");
  lines.push(`- Entry: ${entry.entry}`);
  lines.push(`- Exit: ${entry.exit}`);
  lines.push(`- Stop: ${entry.stop}`);
  lines.push(`- Target: ${entry.target}`);
  lines.push(`- Setup: ${entry.setup || "—"}`);
  lines.push(`- Emotion: ${entry.emotion || "—"}`);
  lines.push(`- Notes: ${entry.notes || "—"}`);
  lines.push("");
  lines.push("## Risk / Reward");
  lines.push(`- Planned R:R — ${review.riskRewardPlanned ?? "n/a"}`);
  lines.push(`- Realized R:R — ${review.riskRewardRealized ?? "n/a"}`);
  lines.push("");
  lines.push("## What Went Well");
  lines.push(review.whatWentWell.length ? review.whatWentWell.map((s) => `- ${s}`).join("\n") : "- —");
  lines.push("");
  lines.push("## What Went Wrong");
  lines.push(review.whatWentWrong.length ? review.whatWentWrong.map((s) => `- ${s}`).join("\n") : "- —");
  lines.push("");
  lines.push("## Rule Violations");
  lines.push(review.ruleViolations.length ? review.ruleViolations.map((s) => `- ${s}`).join("\n") : "- None flagged.");
  lines.push("");
  lines.push("## Improvement For Next Time");
  fs.writeFileSync(filePath, lines.join("\n"), "utf-8");
  return filePath;
}

/**
 * Writes a confluence report to reports/confluence-YYYY-MM-DD.md and returns the file path.
 */
export function writeConfluenceMarkdown(result: ConfluenceResult): string {
  ensureDir(REPORTS_DIR);
  const filePath = path.join(REPORTS_DIR, `confluence-${result.date}.md`);

  const lines: string[] = [];
  lines.push(`# BOUT Confluence Report — ${result.date}`);
  lines.push("");
  lines.push("## Overall Market Context");
  lines.push(result.overallMarketContext);
  lines.push("");
  lines.push("## Strongest Bullish Factors");
  lines.push(result.bullishFactors.length ? result.bullishFactors.map((f) => `- ${f}`).join("\n") : "- None flagged.");
  lines.push("");
  lines.push("## Strongest Bearish Factors");
  lines.push(result.bearishFactors.length ? result.bearishFactors.map((f) => `- ${f}`).join("\n") : "- None flagged.");
  lines.push("");
  lines.push("## Conflicting Signals");
  lines.push(result.conflictingSignals.length ? result.conflictingSignals.map((f) => `- ${f}`).join("\n") : "- None flagged.");
  lines.push("");
  lines.push("## Best Assets To Watch");
  lines.push(
    result.bestAssetsToWatch.length
      ? result.bestAssetsToWatch.map((a) => `- **${a.symbol}** (${a.lean}) — ${a.reason}`).join("\n")
      : "- None met the confluence threshold today."
  );
  lines.push("");
  lines.push("## Matching Strategies (setups to watch)");
  lines.push(
    result.matchingStrategies.length
      ? result.matchingStrategies.map((s) => `- **${s.name}** [${s.matchScore}] — ${s.reasons.join(" ")}`).join("\n")
      : "- None."
  );
  lines.push("");
  lines.push("## Strategies To Avoid Today");
  lines.push(
    result.strategiesToAvoid.length
      ? result.strategiesToAvoid.map((s) => `- **${s.name}** — ${s.reasons.join(" ")}`).join("\n")
      : "- None."
  );
  lines.push("");
  lines.push("## Risk Warnings");
  lines.push(result.riskWarnings.length ? result.riskWarnings.map((w) => `- (${w.level}) ${w.reason}`).join("\n") : "- None flagged.");
  lines.push("");
  lines.push("## Source / Data Trail");
  lines.push(result.sourceTrail.map((s) => `- ${s}`).join("\n"));
  lines.push("");
  lines.push("---");
  lines.push(result.disclaimer);
  lines.push("");

  fs.writeFileSync(filePath, lines.join("\n"), "utf-8");
  return filePath;
}
