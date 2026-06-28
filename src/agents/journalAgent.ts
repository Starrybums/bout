import type { AgentResult, Direction, JournalEntry, JournalReview, ModelProviderConfig } from "../types/index";
import { callModel } from "../modelRouter";

export interface JournalAgentInput {
  entry: JournalEntry;
  modelConfig: ModelProviderConfig;
}

export interface JournalAgentOutput {
  review: JournalReview;
}

const AGENT_NAME = "JournalAgent";

const EMOTION_RED_FLAGS = ["fomo", "revenge", "angry", "anxious", "fear", "greedy", "impatient", "bored", "tilt"];

function computeRiskReward(entry: JournalEntry): { planned: number | null; realized: number | null } {
  const isLong: boolean = entry.direction === ("long" as Direction);

  const risk = isLong ? entry.entry - entry.stop : entry.stop - entry.entry;
  const plannedReward = isLong ? entry.target - entry.entry : entry.entry - entry.target;
  const realizedReward = isLong ? entry.exit - entry.entry : entry.entry - entry.exit;

  if (!Number.isFinite(risk) || risk <= 0) {
    return { planned: null, realized: null };
  }

  return {
    planned: Number((plannedReward / risk).toFixed(2)),
    realized: Number((realizedReward / risk).toFixed(2)),
  };
}

function heuristicReview(entry: JournalEntry, rr: { planned: number | null; realized: number | null }): JournalReview {
  const whatWentWell: string[] = [];
  const whatWentWrong: string[] = [];
  const ruleViolations: string[] = [];
  const improvementForNextTime: string[] = [];

  const isLong = entry.direction === "long";

  if (rr.realized !== null) {
    if (rr.realized >= (rr.planned ?? 0) && rr.realized > 0) {
      whatWentWell.push("Trade hit or exceeded the planned reward-to-risk ratio.");
    } else if (rr.realized > 0) {
      whatWentWell.push("Trade closed profitably, even if below the original target.");
    } else {
      whatWentWrong.push("Trade closed at a loss relative to entry.");
    }
  }

  const exitBeyondStop = isLong ? entry.exit < entry.stop : entry.exit > entry.stop;
  if (exitBeyondStop) {
    ruleViolations.push(
      "Exit price is beyond the planned stop level — worth checking whether the stop order was actually placed/honored."
    );
    improvementForNextTime.push("Consider using a hard stop order instead of a mental stop if this keeps happening.");
  }

  const emotionLower = (entry.emotion || "").toLowerCase();
  const flaggedEmotions = EMOTION_RED_FLAGS.filter((flag) => emotionLower.includes(flag));
  if (flaggedEmotions.length > 0) {
    whatWentWrong.push(`Logged emotion(s) suggest this trade may have been emotionally driven: ${flaggedEmotions.join(", ")}.`);
    improvementForNextTime.push("Before entering, consider a brief checklist pass to separate plan-driven entries from emotional ones.");
  } else if (entry.emotion) {
    whatWentWell.push(`Logged emotional state ("${entry.emotion}") suggests reasonable self-awareness going into the trade.`);
  }

  if (!entry.setup) {
    whatWentWrong.push("No setup/rationale was logged for this trade.");
    improvementForNextTime.push("Log the specific setup name or rationale next time — it makes pattern review much easier later.");
  }

  if (whatWentWell.length === 0) whatWentWell.push("Trade was logged with full entry/exit/stop/target detail — good record-keeping.");
  if (improvementForNextTime.length === 0) improvementForNextTime.push("No specific red flags found — keep reinforcing this process.");

  return {
    entryId: entry.id,
    whatWentWell,
    whatWentWrong,
    riskRewardPlanned: rr.planned,
    riskRewardRealized: rr.realized,
    ruleViolations,
    improvementForNextTime,
  };
}

export async function runJournalAgent(input: JournalAgentInput): Promise<AgentResult<JournalAgentOutput>> {
  const { entry } = input;
  const rr = computeRiskReward(entry);
  const review = heuristicReview(entry, rr);
  const notes: string[] = ["Risk/reward and rule-violation checks are heuristic, not AI-generated."];

  try {
    const response = await callModel(
      {
        messages: [
          {
            role: "system",
            content:
              "You are a trading journal coach. Given trade details, add ONE short, concrete coaching observation " +
              "(max 2 sentences). Do not give financial advice or predict future prices — focus on process and discipline.",
          },
          {
            role: "user",
            content: `Symbol: ${entry.symbol}, Direction: ${entry.direction}, Entry: ${entry.entry}, Exit: ${entry.exit}, Stop: ${entry.stop}, Target: ${entry.target}, Setup: ${entry.setup}, Emotion: ${entry.emotion}, Notes: ${entry.notes}`,
          },
        ],
        context: { topic: "journal-review" },
      },
      input.modelConfig
    );
    review.improvementForNextTime.push(`AI coaching note: ${response.text}`);
    if (response.provider === "mock") {
      notes.push("AI coaching note generated with the mock model — connect a real provider for personalized coaching.");
    }
  } catch (err) {
    notes.push(`AI coaching note skipped (model call failed: ${(err as Error).message}).`);
  }

  return {
    agent: AGENT_NAME,
    generatedAt: new Date().toISOString(),
    data: { review },
    notes,
  };
}
