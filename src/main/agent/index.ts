import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { URL } from "node:url";
import { executeAgent, type AgentRequest, type AgentResponse } from "./runtime";

export type { AgentIntent, AgentRequest, AgentResponse } from "./runtime";

let server: Server | null = null;

function json(
  response: ServerResponse,
  statusCode: number,
  body: unknown,
): void {
  response.writeHead(statusCode, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

function getRequestBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function extractMessage(body: Record<string, unknown>): string {
  if (typeof body.message === "string") return body.message;
  if (typeof body.text === "string") return body.text;
  if (Array.isArray(body.content)) {
    return body.content
      .map((item) => {
        if (typeof item === "string") return item;
        if (
          item &&
          typeof item === "object" &&
          typeof (item as { text?: unknown }).text === "string"
        ) {
          return (item as { text: string }).text;
        }
        return "";
      })
      .join(" ")
      .trim();
  }
  return "";
}

function normalizeBody(body: Record<string, unknown>): AgentRequest {
  if (typeof body.intent === "string") {
    return {
      intent: body.intent as AgentRequest["intent"],
      user_id:
        typeof body.user_id === "string"
          ? body.user_id
          : typeof body.userId === "string"
            ? body.userId
            : null,
      context:
        body.context &&
        typeof body.context === "object" &&
        !Array.isArray(body.context)
          ? (body.context as Record<string, unknown>)
          : body.payload &&
              typeof body.payload === "object" &&
              !Array.isArray(body.payload)
            ? (body.payload as Record<string, unknown>)
            : {},
      message: extractMessage(body),
    };
  }

  return {
    intent: "chat",
    user_id: typeof body.sender === "string" ? body.sender : null,
    context: {},
    message: extractMessage(body),
  };
}

function hasValidBearer(
  req: IncomingMessage,
  body: Record<string, unknown>,
): boolean {
  const expectedBearer = import.meta.env.AGENT_BEARER;
  if (!expectedBearer) return true;

  const authHeader = req.headers.authorization;
  if (
    typeof authHeader === "string" &&
    authHeader === `Bearer ${expectedBearer}`
  )
    return true;
  if (typeof body.auth === "string" && body.auth === expectedBearer)
    return true;
  return false;
}

export async function queryAgent(
  request: AgentRequest,
): Promise<AgentResponse> {
  return executeAgent(request);
}

export function startAgentServer(): void {
  if (server) return;

  const portRaw = import.meta.env.AGENT_PORT;
  const port = Number.parseInt(portRaw || "8001", 10);
  if (!Number.isFinite(port) || port <= 0) return;

  server = createServer(async (req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");

    if (req.method === "GET" && url.pathname === "/healthz") {
      json(res, 200, { ok: true });
      return;
    }

    if (
      req.method === "POST" &&
      (url.pathname === "/chat" ||
        url.pathname === "/agentverse/chat" ||
        url.pathname === "/submit")
    ) {
      try {
        const bodyText = await getRequestBody(req);
        const parsed = JSON.parse(bodyText) as Record<string, unknown>;
        if (!hasValidBearer(req, parsed)) {
          json(res, 401, { text: "agent unavailable", error: "unauthorized" });
          return;
        }
        const response = await executeAgent(normalizeBody(parsed));
        json(res, 200, response);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        json(res, 400, { text: "agent unavailable", error: message });
      }
      return;
    }

    json(res, 404, { error: "not found" });
  });

  server.on("error", (error) => {
    console.warn("[agent] local server failed to start:", error);
    server = null;
  });

  server.listen(port, "127.0.0.1", () => {
    console.log(`[agent] listening on http://127.0.0.1:${port}`);
  });
}

export function stopAgentServer(): void {
  if (!server) return;
  server.close();
  server = null;
}
