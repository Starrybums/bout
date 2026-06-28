/**
 * Volume Analysis Module — MOCK / PLACEHOLDER.
 *
 * No live volume or volume-by-price feed is connected yet. Every reading is
 * structured, deterministic mock data (see mockSignal.ts). Educational
 * framing only — describes conditions to monitor, not a trade signal.
 */
import { dailySeed, pick } from "./mockSignal";

export type VolumeTag = "supportive" | "cautionary" | "neutral";
export type VolumeCondition = "expanding" | "contracting" | "spiking" | "exhausting" | "average";
export type MoveConfirmation = "confirms" | "rejects" | "unclear";

export interface VolumeConceptReading {
  concept: string;
  reading: string;
  tag: VolumeTag;
}

export interface VolumeResult {
  symbol: string;
  generatedAt: string;
  volumeCondition: VolumeCondition;
  confirmsMove: MoveConfirmation;
  conceptReadings: VolumeConceptReading[];
  structuralNotes: string[];
  cautionNotes: string[];
  explanation: string;
  dataNote: string;
  isMock: true;
}

interface ConceptOptionSet {
  concept: string;
  supportive: string;
  cautionary: string;
  neutral: string;
}

// Concepts that feed the "does volume confirm the move" tally.
const CONFIRMATION_CONCEPTS: ConceptOptionSet[] = [
  {
    concept: "Relative volume",
    supportive: "Mock read: relative volume running above its recent average — participation is up",
    cautionary: "Mock read: relative volume running below its recent average — participation is thin",
    neutral: "Mock read: relative volume near its recent average",
  },
  {
    concept: "Volume spikes",
    supportive: "Mock read: a volume spike accompanied the recent move — participation supports it",
    cautionary: "Mock read: a volume spike occurred with little price follow-through — possible trap",
    neutral: "Mock read: no notable volume spike in this sample window",
  },
  {
    concept: "Volume exhaustion",
    supportive: "Mock read: no exhaustion signature — volume building steadily into the move",
    cautionary: "Mock read: a climactic volume spike followed by stalling price — classic exhaustion signature",
    neutral: "Mock read: exhaustion read unclear in this sample window",
  },
  {
    concept: "Volume confirmation",
    supportive: "Mock read: volume rising alongside the directional move (confirmation)",
    cautionary: "Mock read: volume fading on the recent directional move (non-confirmation)",
    neutral: "Mock read: volume roughly flat relative to the recent move",
  },
  {
    concept: "Volume divergence",
    supportive: "Mock read: no divergence — price and volume trends are aligned",
    cautionary: "Mock read: price pressing a new extreme on falling volume (divergence)",
    neutral: "Mock read: divergence read unclear in this sample window",
  },
];

// Concepts that describe volume *location*, not move confirmation — informational only.
const STRUCTURAL_CONCEPTS: ConceptOptionSet[] = [
  {
    concept: "High-volume nodes",
    supportive: "Mock read: a high-volume node sits just below current mock price — potential support shelf",
    cautionary: "Mock read: a high-volume node sits just above current mock price — potential resistance shelf",
    neutral: "Mock read: high-volume nodes fairly even on both sides",
  },
  {
    concept: "Low-volume areas",
    supportive: "Mock read: a low-volume area sits just below — price has tended to move quickly through areas like this",
    cautionary: "Mock read: a low-volume area sits just above — could see a fast move if price reaches it",
    neutral: "Mock read: no notable low-volume area flagged nearby",
  },
];

const VOLUME_PROFILE_PLACEHOLDER_NOTE =
  "Volume profile placeholder — no real intraday volume-by-price feed is connected yet. " +
  "Wire one into volumeAnalysis.ts to replace this placeholder with an actual profile.";

const VOLUME_CONDITIONS: readonly VolumeCondition[] = ["expanding", "contracting", "spiking", "exhausting", "average"];

export function runVolumeAnalysis(symbol: string, referenceDate: Date = new Date()): VolumeResult {
  const upper = symbol.toUpperCase();
  const seedBase = `volume-${upper}-${dailySeed(referenceDate)}`;

  const conceptReadings: VolumeConceptReading[] = CONFIRMATION_CONCEPTS.map((set, i) => {
    const tag = pick(`${seedBase}-confirm-${i}-${set.concept}`, ["supportive", "cautionary", "neutral"] as const);
    return { concept: set.concept, reading: set[tag], tag };
  });

  const structuralNotes = STRUCTURAL_CONCEPTS.map((set, i) => {
    const tag = pick(`${seedBase}-structural-${i}-${set.concept}`, ["supportive", "cautionary", "neutral"] as const);
    return set[tag];
  });
  structuralNotes.push(VOLUME_PROFILE_PLACEHOLDER_NOTE);

  const supportiveCount = conceptReadings.filter((r) => r.tag === "supportive").length;
  const cautionaryCount = conceptReadings.filter((r) => r.tag === "cautionary").length;

  let confirmsMove: MoveConfirmation = "unclear";
  if (supportiveCount > cautionaryCount) confirmsMove = "confirms";
  else if (cautionaryCount > supportiveCount) confirmsMove = "rejects";

  const volumeCondition = pick(`${seedBase}-condition`, VOLUME_CONDITIONS);
  const cautionNotes = conceptReadings.filter((r) => r.tag === "cautionary").map((r) => r.reading);

  const explanation =
    `For ${upper}, ${supportiveCount} of ${conceptReadings.length} sampled volume concepts read supportive and ` +
    `${cautionaryCount} read cautionary, putting the overall volume condition at "${volumeCondition}" and the ` +
    `move-confirmation read at "${confirmsMove}". This is a confluence read across mock concept readings — ` +
    "conditions to monitor, not a trade signal.";

  return {
    symbol: upper,
    generatedAt: new Date().toISOString(),
    volumeCondition,
    confirmsMove,
    conceptReadings,
    structuralNotes,
    cautionNotes: cautionNotes.length ? cautionNotes : ["No specific caution notes flagged in this sample read."],
    explanation,
    dataNote:
      "All readings above are structured mock/placeholder data demonstrating this module's interface — not a connected live volume feed.",
    isMock: true,
  };
}
