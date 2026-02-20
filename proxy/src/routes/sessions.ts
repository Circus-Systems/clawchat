import type { FastifyInstance } from 'fastify';
import fs from 'fs/promises';
import path from 'path';
import readline from 'readline';
import { createReadStream } from 'fs';
import { resolveAgentPath } from '../openclaw-home.js';

export default async function sessionRoutes(app: FastifyInstance) {
  // List sessions for an agent
  app.get<{ Params: { id: string } }>('/api/agents/:id/sessions', async (req) => {
    const { id } = req.params;
    const sessionsDir = resolveAgentPath(id, 'sessions');

    try {
      const entries = await fs.readdir(sessionsDir);
      const sessions = [];

      // Read sessions.json if it exists
      const sessionsJsonPath = path.join(sessionsDir, 'sessions.json');
      let sessionsIndex: Record<string, unknown> = {};
      try {
        sessionsIndex = JSON.parse(await fs.readFile(sessionsJsonPath, 'utf-8'));
      } catch {}

      // List JSONL files as sessions
      for (const entry of entries) {
        if (!entry.endsWith('.jsonl')) continue;
        const key = entry.replace('.jsonl', '');
        const filePath = path.join(sessionsDir, entry);
        const stat = await fs.stat(filePath);

        // Count lines (messages)
        let lineCount = 0;
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          lineCount = content.split('\n').filter(l => l.trim()).length;
        } catch {}

        sessions.push({
          key,
          file: entry,
          messageCount: lineCount,
          lastActive: stat.mtime.toISOString(),
          size: stat.size,
        });
      }

      return { sessions, index: sessionsIndex };
    } catch {
      return { sessions: [], index: {} };
    }
  });

  // Get session history
  app.get<{
    Params: { id: string; key: string };
    Querystring: { limit?: string; cursor?: string };
  }>('/api/agents/:id/sessions/:key/history', async (req, reply) => {
    const { id, key } = req.params;
    const limit = parseInt(req.query.limit || '100', 10);

    const sessionsDir = resolveAgentPath(id, 'sessions');
    // The key might be URL-encoded, handle colons
    const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
    const jsonlPath = path.join(sessionsDir, `${safeKey}.jsonl`);

    try {
      await fs.access(jsonlPath);
    } catch {
      return { messages: [], hasMore: false };
    }

    const messages: unknown[] = [];
    const rl = readline.createInterface({
      input: createReadStream(jsonlPath),
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      if (!line.trim()) continue;
      try {
        messages.push(JSON.parse(line));
      } catch {}
    }

    // Return last N messages
    const start = Math.max(0, messages.length - limit);
    return {
      messages: messages.slice(start),
      hasMore: start > 0,
      total: messages.length,
    };
  });

  // Get history for selected agent (UI convenience)
  app.get<{ Querystring: { agentId: string; limit?: string } }>('/api/ui/chat/history', async (req, reply) => {
    const { agentId } = req.query;
    if (!agentId) {
      reply.code(400).send({ error: 'agentId required' });
      return;
    }
    const limit = parseInt(req.query.limit || '100', 10);

    const sessionsDir = resolveAgentPath(agentId, 'sessions');
    const sessionsJsonPath = path.join(sessionsDir, 'sessions.json');
    const sessionKey = `agent:${agentId}:main`;

    let sessionId: string | undefined;
    try {
      const content = await fs.readFile(sessionsJsonPath, 'utf-8');
      const sessionsIndex = JSON.parse(content);
      sessionId = (sessionsIndex as Record<string, any>)[sessionKey]?.sessionId;
    } catch {}

    if (!sessionId) {
      return { messages: [], hasMore: false };
    }

    const jsonlPath = path.join(sessionsDir, `${sessionId}.jsonl`);

    try {
      await fs.access(jsonlPath);
    } catch {
      return { messages: [], hasMore: false };
    }

    const messages: unknown[] = [];
    const rl = readline.createInterface({
      input: createReadStream(jsonlPath),
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      if (!line.trim()) continue;
      try {
        messages.push(JSON.parse(line));
      } catch {}
    }

    // Return last N messages
    const start = Math.max(0, messages.length - limit);
    return {
      messages: messages.slice(start),
      hasMore: start > 0,
      total: messages.length,
    };
  });
}
