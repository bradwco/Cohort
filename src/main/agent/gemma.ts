type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
};

export type ToolCall = {
  id?: string;
  function?: {
    name?: string;
    arguments?: string;
  };
};

export type ToolSpec = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export interface ChatResponse {
  ok: boolean;
  text: string;
  toolCalls: ToolCall[];
  error?: string;
  raw?: unknown;
}

interface OpenAiChoiceMessage {
  content?: string | Array<{ text?: string; type?: string }>;
  tool_calls?: ToolCall[];
}

interface OpenAiResponse {
  choices?: Array<{
    message?: OpenAiChoiceMessage;
  }>;
}

const REQUEST_TIMEOUT_MS = 120_000; // 2 minutes for Gemma inference + network latency

function buildChatUrl(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/$/, "");
  return trimmed.endsWith("/v1")
    ? `${trimmed}/chat/completions`
    : `${trimmed}/v1/chat/completions`;
}

function extractText(content: OpenAiChoiceMessage["content"]): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => part.text ?? "")
    .join("")
    .trim();
}

export async function chatWithGemma(
  messages: ChatMessage[],
  tools: ToolSpec[] = [],
  temperature = 0.2,
): Promise<ChatResponse> {
  const baseUrl = process.env.GEMMA_BASE_URL;
  const bearer = process.env.GEMMA_BEARER;
  const model = process.env.GEMMA_MODEL || "gemma4:latest";

  if (!baseUrl) {
    return {
      ok: false,
      text: "",
      toolCalls: [],
      error: "GEMMA_BASE_URL not set",
    };
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (bearer) headers.Authorization = `Bearer ${bearer}`;

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature,
  };
  if (tools.length > 0) {
    body.tools = tools;
    body.tool_choice = "auto";
  }

  console.log("[agent] Gemma request body:", JSON.stringify(body, null, 2));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(buildChatUrl(baseUrl), {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      console.error("[agent] Gemma HTTP error:", response.status, errorBody);
      return {
        ok: false,
        text: "",
        toolCalls: [],
        error: `http ${response.status}: ${errorBody.slice(0, 200)}`,
      };
    }

    const data = (await response.json()) as OpenAiResponse;
    console.log("[agent] Gemma raw response:", JSON.stringify(data, null, 2));
    const message = data.choices?.[0]?.message;
    if (!message) {
      console.error("[agent] Gemma response missing message field", data);
    }
    return {
      ok: true,
      text: extractText(message?.content),
      toolCalls: message?.tool_calls ?? [],
      raw: data,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, text: "", toolCalls: [], error: `network: ${message}` };
  } finally {
    clearTimeout(timeout);
  }
}

export type { ChatMessage };
