import { chatWithGemma, type ChatMessage } from './gemma';
import { runTool, toolSpecs } from './tools';

export type AgentIntent = 'dashboard_insight' | 'session_postmortem' | 'chat';

export interface AgentRequest {
  intent: AgentIntent;
  userId?: string | null;
  user_id?: string | null;
  context?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  message?: string;
}

export interface ToolTrace {
  name: string;
  args: Record<string, unknown>;
  result: unknown;
}

export interface AgentResponse {
  text: string;
  tool_trace?: ToolTrace[];
  error?: string;
}

interface NormalizedRequest {
  intent: AgentIntent;
  userId: string | null;
  context: Record<string, unknown>;
  message: string;
}

const MAX_STEPS = 4;

const INTENT_INSTRUCTIONS: Record<AgentIntent, string> = {
  dashboard_insight:
    'Generate one short, concrete dashboard insight in 2 sentences or less. Be specific about a pattern you notice from the data provided. Focus on actionable observations, not generic compliments.',
  session_postmortem:
    'Write a 3-4 sentence postmortem for the requested session. Mention what the user worked on, friction signals (pauses, distractions), and one specific next-step suggestion.',
  chat:
    'Answer the user question using the available tools when needed.',
};

function systemPrompt(intent: AgentIntent): string {
  return [
    'You are Cohort, an agent that helps a user reflect on their focus sessions, calendar rhythm, and on-screen activity.',
    'Be concise, specific, and evidence-based.',
    'Prefer to give direct answers over asking for more information.',
    `Current intent: ${intent}.`,
    INTENT_INSTRUCTIONS[intent],
  ].join(' ');
}

function normalizeRequest(request: AgentRequest): NormalizedRequest {
  return {
    intent: request.intent,
    userId: request.userId ?? request.user_id ?? null,
    context: request.context ?? request.payload ?? {},
    message: request.message ?? '',
  };
}

function todayLocalDate(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function executeAgent(rawRequest: AgentRequest): Promise<AgentResponse> {
  console.log('[agent] executeAgent called with:', rawRequest);
  const request = normalizeRequest(rawRequest);
  console.log('[agent] normalized request:', request);

  // For dashboard_insight with insufficient context, return a default message
  if (request.intent === 'dashboard_insight') {
    const context = request.context as Record<string, unknown>;
    const recentSessionCount = context.recent_session_count as number;
    if (recentSessionCount < 2) {
      return {
        text: 'Complete a few sessions to receive personalized insights.',
        tool_trace: [],
      };
    }
  }

  const userEnvelope = {
    intent: request.intent,
    user_id: request.userId,
    context: request.context,
    message: request.message,
    today_local_date: todayLocalDate(),
  };

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt(request.intent) },
    { role: 'user', content: JSON.stringify(userEnvelope) },
  ];

  const toolTrace: ToolTrace[] = [];

  // For dashboard_insight, don't use tools — just get a direct insight
  const tools = request.intent === 'dashboard_insight' ? [] : toolSpecs();

  for (let step = 0; step < MAX_STEPS; step += 1) {
    console.log(`[agent] Step ${step}: calling chatWithGemma`);
    const response = await chatWithGemma(messages, tools);
    console.log(`[agent] Step ${step}: chatWithGemma response:`, { ok: response.ok, text: response.text?.slice(0, 100), error: response.error });

    // Add delay between requests to avoid overwhelming the server
    if (step < MAX_STEPS - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (!response.ok) {
      console.log('[agent] chatWithGemma failed, returning error');
      return {
        text: 'agent unavailable',
        tool_trace: toolTrace,
        error: response.error,
      };
    }

    if (response.toolCalls.length === 0) {
      return {
        text: response.text || 'agent unavailable',
        tool_trace: toolTrace,
      };
    }

    messages.push({
      role: 'assistant',
      content: response.text || '',
      tool_calls: response.toolCalls,
    });

    for (const call of response.toolCalls) {
      const toolName = call.function?.name ?? '';
      const rawArgs = call.function?.arguments ?? '{}';
      let parsedArgs: Record<string, unknown> = {};

      try {
        const decoded = JSON.parse(rawArgs) as unknown;
        if (decoded && typeof decoded === 'object' && !Array.isArray(decoded)) {
          parsedArgs = decoded as Record<string, unknown>;
        }
      } catch {
        parsedArgs = {};
      }

      const result = await runTool(toolName, parsedArgs);
      toolTrace.push({
        name: toolName,
        args: parsedArgs,
        result,
      });

      messages.push({
        role: 'tool',
        tool_call_id: call.id ?? '',
        name: toolName,
        content: JSON.stringify(result),
      });
    }
  }

  return {
    text: 'agent max steps reached',
    tool_trace: toolTrace,
  };
}
