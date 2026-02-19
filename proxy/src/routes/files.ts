import type { FastifyInstance } from 'fastify';
import fs from 'fs/promises';
import path from 'path';
import { getOpenClawHome, resolveAgentPath } from '../openclaw-home.js';

// Validate path is within OpenClaw home
function validatePath(filePath: string): string {
  const home = path.resolve(getOpenClawHome());
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(home)) {
    throw new Error('Path traversal detected');
  }
  return resolved;
}

// Resolve file location — check agent dir first, then workspace
async function resolveFilePath(agentId: string, filename: string): Promise<string> {
  // Sanitize filename
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    throw new Error('Invalid filename');
  }

  // Check agent/agent/ dir first
  const agentFile = resolveAgentPath(agentId, 'agent', filename);
  try {
    await fs.access(agentFile);
    return validatePath(agentFile);
  } catch {}

  // Check workspace
  // Read config to find workspace
  const home = getOpenClawHome();
  const configPath = path.join(home, 'openclaw.json');
  try {
    const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
    const agents = config.agents?.list || [];
    const agent = agents.find((a: Record<string, unknown>) => a.id === agentId);
    const workspace = agent?.workspace || config.agents?.defaults?.workspace || path.join(home, 'workspace');
    const wsFile = path.join(workspace, filename);
    return validatePath(wsFile);
  } catch {
    // Fallback to default workspace
    const wsFile = path.join(home, 'workspace', filename);
    return validatePath(wsFile);
  }
}

export default async function fileRoutes(app: FastifyInstance) {
  // List files for an agent
  app.get<{ Params: { id: string } }>('/api/agents/:id/files', async (req) => {
    const { id } = req.params;
    const home = getOpenClawHome();
    const agentDir = resolveAgentPath(id, 'agent');
    const files: Array<{ name: string; path: string; modified: string; size: number; location: string }> = [];

    // Agent dir files
    try {
      const entries = await fs.readdir(agentDir);
      for (const name of entries) {
        if (!name.endsWith('.md') && !name.endsWith('.json')) continue;
        const filePath = path.join(agentDir, name);
        const stat = await fs.stat(filePath);
        files.push({
          name,
          path: filePath,
          modified: stat.mtime.toISOString(),
          size: stat.size,
          location: 'agent',
        });
      }
    } catch {}

    // Workspace files
    try {
      const configPath = path.join(home, 'openclaw.json');
      const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
      const agents = config.agents?.list || [];
      const agent = agents.find((a: Record<string, unknown>) => a.id === id);
      const workspace = agent?.workspace || config.agents?.defaults?.workspace || path.join(home, 'workspace');

      const entries = await fs.readdir(workspace);
      for (const name of entries) {
        if (!name.endsWith('.md')) continue;
        const filePath = path.join(workspace, name);
        const stat = await fs.stat(filePath);
        // Don't duplicate if already found in agent dir
        if (!files.some(f => f.name === name)) {
          files.push({
            name,
            path: filePath,
            modified: stat.mtime.toISOString(),
            size: stat.size,
            location: 'workspace',
          });
        }
      }
    } catch {}

    return { files };
  });

  // Read a file
  app.get<{ Params: { id: string; filename: string } }>('/api/agents/:id/files/:filename', async (req, reply) => {
    const { id, filename } = req.params;
    try {
      const filePath = await resolveFilePath(id, filename);
      const content = await fs.readFile(filePath, 'utf-8');
      const stat = await fs.stat(filePath);
      return { content, modified: stat.mtime.toISOString(), size: stat.size };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return reply.code(404).send({ error: `File not found: ${message}` });
    }
  });

  // Write a file
  app.put<{ Params: { id: string; filename: string }; Body: { content: string; expectedModified?: string } }>(
    '/api/agents/:id/files/:filename',
    async (req, reply) => {
      const { id, filename } = req.params;
      const { content, expectedModified } = req.body;

      try {
        const filePath = await resolveFilePath(id, filename);

        // Conflict detection
        if (expectedModified) {
          try {
            const stat = await fs.stat(filePath);
            const currentModified = stat.mtime.toISOString();
            if (currentModified !== expectedModified) {
              return reply.code(409).send({
                error: 'File was modified externally',
                currentModified,
                expectedModified,
              });
            }
          } catch {} // File doesn't exist yet, that's fine
        }

        await fs.writeFile(filePath, content, 'utf-8');
        const stat = await fs.stat(filePath);
        return { written: true, modified: stat.mtime.toISOString() };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return reply.code(500).send({ error: message });
      }
    }
  );
}
