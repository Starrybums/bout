import type { AgentResult, EconomicEvent, ModelProviderConfig } from "../types/index";
import { callModel } from "../modelRouter";
import { getHighImpactEvents } from "../tools/calendarTool";

export interface MacroAgentInput {
  events: EconomicEvent[];
  modelConfig: ModelProviderConfig;
}

export interface MacroAgentOutput {
  summary: string;
  highImpactEvents: EconomicEvent[];
  allEvents: EconomicEvent[];
}

const AGENT_NAME = "MacroAgent";

export async function runMacroAgent(input: MacroAgentInput): Promise<AgentResult<MacroAgentOutput>> {
  const highImpact = getHighImpactEvents(input.events);
  const notes: string[] = [];

  let summary: string;
  try {
    const eventList = input.events
      .map((e) => `- ${e.title} (${e.impactLevel}, ${e.time}) affecting ${e.affectedAssets.join(", ")}`)
      .join("\n");

    const response = await callModel(
      {
        messages: [
          {
            role: "system",
            content:
              "You are a macro markets research assistant. Summarize the economic calendar context in 3-5 sentences. " +
              "Be factual and neutral. Do not give trade recommendations or price predictions. " +
              "Focus on what could move markets and why.",
          },
          { role: "user", content: `Today's economic calendar:\n${eventList || "No events scheduled."}` },
        ],
        context: { topic: "daily-brief" },
      },
      input.modelConfig
    );
    summary = response.text;
    if (response.provider === "mock") {
      notes.push("Generated with the mock model — connect a real provider for live AI summaries.");
    }
  } catch (err) {
    summary =
      `Could not generate an AI summary (${(err as Error).message}). ` +
      `Falling back to a structural summary: ${highImpact.length} high-impact event(s) scheduled today.`;
    notes.push("Model call failed; used fallback summary.");
  }

  return {
    agent: AGENT_NAME,
    generatedAt: new Date().toISOString(),
    data: {
      summary,
      highImpactEvents: highImpact,
      allEvents: input.events,
    },
    notes,
  };
}
