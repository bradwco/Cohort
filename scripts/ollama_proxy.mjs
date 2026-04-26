#!/usr/bin/env node
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadDotEnv() {
  try {
    const content = readFileSync(resolve(process.cwd(), '.env'), 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex < 0) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // .env is optional; explicit shell environment values still work.
  }
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function isAuthorized(req, bearer) {
  if (!bearer) return false;
  return req.headers.authorization === `Bearer ${bearer}`;
}

loadDotEnv();

const port = Number.parseInt(process.env.OLLAMA_PROXY_PORT || '8787', 10);
const ollamaBaseUrl = (process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/$/, '');
const bearer = process.env.OLLAMA_PROXY_BEARER || process.env.GEMMA_BEARER || '';

if (!bearer) {
  console.error('[ollama-proxy] refusing to start: set OLLAMA_PROXY_BEARER in .env');
  process.exit(1);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);

  if (req.method === 'GET' && url.pathname === '/healthz') {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (!isAuthorized(req, bearer)) {
    sendJson(res, 401, { error: 'unauthorized' });
    return;
  }

  if (!['/v1/chat/completions', '/v1/models'].includes(url.pathname)) {
    sendJson(res, 404, { error: 'not found' });
    return;
  }

  if (url.pathname === '/v1/models' && req.method !== 'GET') {
    sendJson(res, 405, { error: 'method not allowed' });
    return;
  }

  if (url.pathname === '/v1/chat/completions' && req.method !== 'POST') {
    sendJson(res, 405, { error: 'method not allowed' });
    return;
  }

  try {
    const body = req.method === 'POST' ? await readBody(req) : undefined;
    const upstream = await fetch(`${ollamaBaseUrl}${url.pathname}`, {
      method: req.method,
      headers: {
        'Content-Type': req.headers['content-type'] || 'application/json',
      },
      body,
    });

    const responseBody = Buffer.from(await upstream.arrayBuffer());
    res.writeHead(upstream.status, {
      'Content-Type': upstream.headers.get('content-type') || 'application/json',
    });
    res.end(responseBody);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    sendJson(res, 502, { error: `ollama upstream failed: ${message}` });
  }
});

server.on('error', (error) => {
  console.error('[ollama-proxy] server error:', error);
  process.exitCode = 1;
});

server.listen(port, '127.0.0.1', () => {
  console.log(`[ollama-proxy] listening on http://127.0.0.1:${port}`);
  console.log(`[ollama-proxy] forwarding to ${ollamaBaseUrl}`);
});

setInterval(() => {}, 2 ** 30);
