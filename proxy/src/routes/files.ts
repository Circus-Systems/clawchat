import type { FastifyInstance } from 'fastify';
import fs from 'fs/promises';
import path from 'path';
import { getOpenClawHome, resolveAgentPath } from '../openclaw-home.js';
import { isAgentFile, isMemoryNote, AGENT_SCAFFOLD_LIST } from '../agent-scope.js';

// Validate path is within OpenClaw home
function validatePath(filePath: string): string {
  const home = path.resolve(getOpenClawHome());
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(home)) {
    throw new Error('Path traversal detected');
  }
  return resolved;
}

/**
 * Validates a filename (or subpath) from a client request.
 * Allows: simple filenames (e.g. "SOUL.md") and memory notes (e.g. "memory/2026-02-20.md").
 * Blocks: path traversal, absolute paths, and any other subdirectory access.
 */
function validateClientFilename(filename: string): void {
  if (filename.includes('..')) throw new Error('Invalid filename: path traversal');
  if (path.isAbsolute(filename)) throw new Error('Invalid filename: absolute path');

  const parts = filename.split('/');
  if (parts.length === 1) return; // simple filename — ok

  // Only allow memory/YYYY-MM-DD.md subpath
  if (parts.length === 2 && isMemoryNote(filename)) return;

  throw new Error('Invalid filename: only memory/YYYY-MM-DD.md subpaths are permitted');
}

// Resolve workspace path for an agent from config
async function resolveWorkspace(agentId: string): Promise<string> {
  const home = getOpenClawHome();
  try {
    const configPath = path.join(home, 'openclaw.json');
    const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
    const agents = config.agents?.list || [];
    const agent = agents.find((a: Record<string, unknown>) => a.id === agentId);
    return agent?.workspace || config.agents?.defaults?.workspace || path.join(home, 'workspace');
  } catch {
    return path.join(home, 'workspace');
  }
}

// Resolve file location — check agent dir first, then workspace
async function resolveFilePath(agentId: string, filename: string): Promise<string> {
  validateClientFilename(filename);

  // Memory notes live only in workspace
  if (isMemoryNote(filename)) {
    const workspace = await resolveWorkspace(agentId);
    return validatePath(path.join(workspace, filename));
  }

  // Check agent/agent/ dir first
  const agentFile = resolveAgentPath(agentId, 'agent', filename);
  try {
    await fs.access(agentFile);
    return validatePath(agentFile);
  } catch {}

  // Fall through to workspace
  const workspace = await resolveWorkspace(agentId);
  return validatePath(path.join(workspace, filename));
}

export default async function fileRoutes(app: FastifyInstance) {
  // List agent-scope files for an agent
  app.get<{ Params: { id: string } }>('/api/agents/:id/files', async (req) => {
    const { id } = req.params;
    const agentDir = resolveAgentPath(id, 'agent');
    const workspace = await resolveWorkspace(id);

    const seen = new Set<string>();
    const files: Array<{ name: string; path: string; modified: string; size: number; location: string }> = [];

    // Helper: push a file entry if it passes the agent-scope filter
    async function pushIfAgent(name: string, filePath: string, location: string) {
      if (!isAgentFile(name)) return;
      if (seen.has(name)) return;
      try {
        const stat = await fs.stat(filePath);
        seen.add(name);
        files.push({ name, path: filePath, modified: stat.mtime.toISOString(), size: stat.size, location });
      } catch {}
    }

    // 1. Agent dir files (e.g. ~/.openclaw/agents/<id>/agent/)
    try {
      const entries = await fs.readdir(agentDir);
      for (const name of entries) {
        await pushIfAgent(name, path.join(agentDir, name), 'agent');
      }
    } catch {}

    // 2. Workspace root files
    try {
      const entries = await fs.readdir(workspace);
      for (const name of entries) {
        await pushIfAgent(name, path.join(workspace, name), 'workspace');
      }
    } catch {}

    // 3. Workspace memory/ subdirectory
    try {
      const memDir = path.join(workspace, 'memory');
      const entries = await fs.readdir(memDir);
      for (const name of entries) {
        const qualified = `memory/${name}`;
        await pushIfAgent(qualified, path.join(memDir, name), 'workspace-memory');
      }
    } catch {}

    // Sort: scaffold files first (alphabetically), then memory notes newest-first
    files.sort((a, b) => {
      const aIsMem = isMemoryNote(a.name);
      const bIsMem = isMemoryNote(b.name);
      if (aIsMem !== bIsMem) return aIsMem ? 1 : -1;
      if (aIsMem && bIsMem) return b.name.localeCompare(a.name); // newest first
      return a.name.localeCompare(b.name);
    });

    return {
      files,
      // Canonical agent-owned file list — frontend uses this to stay in sync
      agentFiles: AGENT_SCAFFOLD_LIST,
    };
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

        // Ensure parent directory exists (for memory notes)
        await fs.mkdir(path.dirname(filePath), { recursive: true });
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
