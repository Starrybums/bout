import type { ModelProvider, ModelProviderConfig, ModelRequest, ModelResponse } from "./types/index";

// ---------------------------------------------------------------------------
// Claude (Anthropic) — placeholder. Wire-format is correct; requires
// ANTHROPIC_API_KEY to actually call out.
// ---------------------------------------------------------------------------

async function callClaude(request: ModelRequest, config: ModelProviderConfig): Promise<ModelResponse> {
  if (!config.apiKey) {
    throw new Error(
      "No ANTHROPIC_API_KEY found. Add one to your .env file, then run `bout model set claude`."
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
      model: config.model || "claude-sonnet-5",
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

  return { provider: "claude", model: config.model || "claude-sonnet-5", text };
}

// ---------------------------------------------------------------------------
// OpenAI — placeholder. Requires OPENAI_API_KEY to actually call out.
// ---------------------------------------------------------------------------

async function callOpenAI(request: ModelRequest, config: ModelProviderConfig): Promise<ModelResponse> {
  if (!config.apiKey) {
    throw new Error(
      "No OPENAI_API_KEY found. Add one to your .env file, then run `bout model set openai`."
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
    case "claude":
    case "openai":
      return Boolean(config.apiKey);
    case "ollama":
      return Boolean(config.baseUrl);
    default:
      return false;
  }
}

export const ALL_PROVIDERS: ModelProvider[] = ["claude", "openai", "ollama"];
