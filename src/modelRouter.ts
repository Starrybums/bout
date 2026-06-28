import type { ModelProvider, ModelProviderConfig, ModelRequest, ModelResponse } from "./types/index";

// ---------------------------------------------------------------------------
// Mock model — works with zero API keys, zero network calls.
// This is the default provider so the whole CLI is usable immediately.
// ---------------------------------------------------------------------------

function callMockModel(request: ModelRequest): ModelResponse {
  const lastUser = [...request.messages].reverse().find((m) => m.role === "user");
  const topic = (request.context?.topic as string) || "general";

  const canned: Record<string, string> = {
    "daily-brief":
      "Mock model summary: today's calendar and headlines suggest elevated event risk. " +
      "This is a templated placeholder response — connect a real model provider " +
      "(claude, openai, or ollama) with `bout model set <provider>` for live AI summaries.",
    "journal-review":
      "Mock model summary: based on the entry details provided, consider whether the " +
      "stop and target were sized consistently with your stated setup. This is a templated " +
      "placeholder response — connect a real model provider for deeper, personalized review text.",
    "risk-check":
      "Mock model summary: one or more high-impact events are on today's calendar. " +
      "Reduce size or sit out the immediate post-release window if you tend to overtrade volatility.",
    confluence:
      "Mock model summary: today's rhythm, heat map, and order-flow/ICT reads combine into mixed contextual bias across " +
      "the analyzed basket — conditions to monitor, several setups requiring confirmation rather than a clean directional " +
      "picture. This is a templated placeholder response — connect a real model provider " +
      "(claude, openai, or ollama) with `bout model set <provider>` for live AI synthesis. Research and market context only, not financial advice.",
    general:
      "Mock model response: no live AI provider is configured, so this is a static placeholder. " +
      `Your message was: "${(lastUser?.content || "").slice(0, 160)}"`,
  };

  return {
    provider: "mock",
    model: "bout-mock-v1",
    text: canned[topic] || canned.general,
  };
}

// ---------------------------------------------------------------------------
// Claude (Anthropic) — placeholder. Wire-format is correct; requires
// ANTHROPIC_API_KEY to actually call out.
// ---------------------------------------------------------------------------

async function callClaude(request: ModelRequest, config: ModelProviderConfig): Promise<ModelResponse> {
  if (!config.apiKey) {
    throw new Error(
      "No ANTHROPIC_API_KEY found. Add one to your .env file, or run `bout model set mock` to keep using the offline mock model."
    );
  }

  const systemMessages = request.messages.filter((m) => m.role === "system").map((m) => m.content);
  const conversation = request.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role, content: m.content }));

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.model || "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemMessages.join("\n\n") || undefined,
      messages: conversation,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Claude API error (${response.status}): ${body}`);
  }

  const data = (await response.json()) as { content: Array<{ type: string; text?: string }> };
  const text = data.content
    .filter((block) => block.type === "text" && block.text)
    .map((block) => block.text)
    .join("\n");

  return { provider: "claude", model: config.model || "claude-sonnet-4-6", text };
}

// ---------------------------------------------------------------------------
// OpenAI — placeholder. Requires OPENAI_API_KEY to actually call out.
// ---------------------------------------------------------------------------

async function callOpenAI(request: ModelRequest, config: ModelProviderConfig): Promise<ModelResponse> {
  if (!config.apiKey) {
    throw new Error(
      "No OPENAI_API_KEY found. Add one to your .env file, or run `bout model set mock` to keep using the offline mock model."
    );
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model || "gpt-4o-mini",
      messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${body}`);
  }

  const data = (await response.json()) as { choices: Array<{ message: { content: string } }> };
  const text = data.choices[0]?.message?.content ?? "";

  return { provider: "openai", model: config.model || "gpt-4o-mini", text };
}

// ---------------------------------------------------------------------------
// Ollama (local) — placeholder. No API key required, just a running local
// server and a pulled model.
// ---------------------------------------------------------------------------

async function callOllama(request: ModelRequest, config: ModelProviderConfig): Promise<ModelResponse> {
  const baseUrl = config.baseUrl || "http://localhost:11434";
  const model = config.model || "llama3.1";

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
        stream: false,
      }),
    });
  } catch (err) {
    throw new Error(
      `Could not reach Ollama at ${baseUrl}. Is it running locally? (Original error: ${(err as Error).message})`
    );
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Ollama API error (${response.status}): ${body}`);
  }

  const data = (await response.json()) as { message?: { content: string } };
  const text = data.message?.content ?? "";

  return { provider: "ollama", model, text };
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export async function callModel(request: ModelRequest, config: ModelProviderConfig): Promise<ModelResponse> {
  switch (config.provider) {
    case "mock":
      return callMockModel(request);
    case "claude":
      return callClaude(request, config);
    case "openai":
      return callOpenAI(request, config);
    case "ollama":
      return callOllama(request, config);
    default:
      throw new Error(`Unknown model provider: ${String((config as ModelProviderConfig).provider)}`);
  }
}

export function isProviderConfigured(config: ModelProviderConfig): boolean {
  switch (config.provider) {
    case "mock":
      return true;
    case "claude":
    case "openai":
      return Boolean(config.apiKey);
    case "ollama":
      return Boolean(config.baseUrl);
    default:
      return false;
  }
}

export const ALL_PROVIDERS: ModelProvider[] = ["mock", "claude", "openai", "ollama"];
