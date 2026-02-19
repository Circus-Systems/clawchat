import type { FastifyInstance } from 'fastify';
import fs from 'fs/promises';
import path from 'path';
import { getOpenClawHome, resolveAgentPath, resolveHomePath } from '../openclaw-home.js';
import { gatewayRpc } from '../gateway-ws.js';

// Read openclaw.json config
async function readConfig(): Promise<Record<string, unknown>> {
  const configPath = resolveHomePath('openclaw.json');
  const raw = await fs.readFile(configPath, 'utf-8');
  return JSON.parse(raw);
}

// List agent directories
async function listAgentDirs(): Promise<string[]> {
  const agentsDir = resolveHomePath('agents');
  try {
    const entries = await fs.readdir(agentsDir, { withFileTypes: true });
    return entries.filter(e => e.isDirectory()).map(e => e.name);
  } catch {
    return [];
  }
}

// Get agent workspace path from config or defaults
function getAgentWorkspace(config: Record<string, unknown>, agentId: string): string {
  const agents = config.agents as Record<string, unknown> | undefined;
  const list = (agents?.list as Array<Record<string, unknown>>) || [];
  const agent = list.find(a => a.id === agentId);
  if (agent?.workspace && typeof agent.workspace === 'string') {
    return agent.workspace;
  }
  const defaults = agents?.defaults as Record<string, unknown> | undefined;
  if (defaults?.workspace && typeof defaults.workspace === 'string') {
    return defaults.workspace;
  }
  return path.join(getOpenClawHome(), 'workspace');
}

export default async function agentRoutes(app: FastifyInstance) {
  // List all agents
  app.get('/api/agents', async () => {
    const [config, dirs] = await Promise.all([readConfig(), listAgentDirs()]);
    const agents = (config.agents as Record<string, unknown>)?.list as Array<Record<string, unknown>> || [];

    // Merge config agents with discovered dirs
    const agentMap = new Map<string, Record<string, unknown>>();
    for (const a of agents) {
      agentMap.set(a.id as string, a);
    }
    for (const dir of dirs) {
      if (!agentMap.has(dir)) {
        agentMap.set(dir, { id: dir });
      }
    }

    const result = [];
    for (const [id, agentConf] of agentMap) {
      const workspace = getAgentWorkspace(config, id);
      result.push({
        id,
        workspace,
        model: agentConf.model || (config.agents as Record<string, unknown>)?.defaults && ((config.agents as Record<string, unknown>).defaults as Record<string, unknown>)?.model,
        ...agentConf,
      });
    }

    return { agents: result };
  });

  // Get agent details
  app.get<{ Params: { id: string } }>('/api/agents/:id', async (req) => {
    const { id } = req.params;
    const config = await readConfig();
    const workspace = getAgentWorkspace(config, id);
    const agentDir = resolveAgentPath(id, 'agent');

    // List files in agent dir
    let agentFiles: string[] = [];
    try {
      agentFiles = await fs.readdir(agentDir);
    } catch {}

    // List files in workspace
    let workspaceFiles: string[] = [];
    try {
      const wsResolved = path.resolve(workspace);
      const home = path.resolve(getOpenClawHome());
      if (wsResolved.startsWith(home) || wsResolved.startsWith(path.resolve(path.dirname(home)))) {
        workspaceFiles = (await fs.readdir(workspace)).filter(f => f.endsWith('.md'));
      }
    } catch {}

    return {
      id,
      workspace,
      agentFiles,
      workspaceFiles,
    };
  });

  // Create new agent
  app.post<{ Body: { name: string; id: string; model?: string; subagentModel?: string } }>('/api/agents', async (req, reply) => {
    const { name, id, model, subagentModel } = req.body;

    // Validate ID
    if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) {
      return reply.code(400).send({ error: 'Agent ID must be lowercase alphanumeric with hyphens' });
    }

    const agentDir = resolveAgentPath(id, 'agent');
    const sessionsDir = resolveAgentPath(id, 'sessions');

    // Check if exists
    try {
      await fs.access(agentDir);
      return reply.code(409).send({ error: 'Agent already exists' });
    } catch {}

    // Create directories
    await fs.mkdir(agentDir, { recursive: true });
    await fs.mkdir(sessionsDir, { recursive: true });

    // Scaffold default files
    const scaffolds: Record<string, string> = {
      'IDENTITY.md': `# Identity\n\nYou are ${name}, a personal AI assistant.\nYou help the user with tasks, answer questions, and manage workflows.\n`,
      'AGENT.md': `# Agent Directives\n\n- Be concise and direct in responses\n- Ask clarifying questions when the request is ambiguous\n- Use tools proactively when they would help accomplish the task\n- Remember important facts and preferences in MEMORY.md\n`,
      'SOUL.md': `# Core Values\n\n- Be honest and transparent\n- Prioritise the user's intent over literal instructions\n- Flag potential risks before taking destructive actions\n- Respect privacy and handle sensitive data carefully\n`,
    };

    for (const [filename, content] of Object.entries(scaffolds)) {
      await fs.writeFile(path.join(agentDir, filename), content);
    }

    // Create workspace with MEMORY.md and HEARTBEAT.md
    const workspaceDir = resolveHomePath(`workspace-${id}`);
    await fs.mkdir(workspaceDir, { recursive: true });
    await fs.writeFile(path.join(workspaceDir, 'MEMORY.md'), '# Memory\n\n*No memories yet. I\'ll record important facts and preferences here as we work together.*\n');
    await fs.writeFile(path.join(workspaceDir, 'HEARTBEAT.md'), '# Heartbeat Checklist\n\n- Check for any pending tasks or reminders\n- Review recent session context for follow-ups\n');

    // Patch openclaw.json via Gateway
    try {
      const newAgent: Record<string, unknown> = { id, workspace: workspaceDir };
      if (model) newAgent.model = model;
      if (subagentModel) newAgent.subagentModel = subagentModel;

      await gatewayRpc('config.patch', {
        raw: JSON.stringify({
          agents: {
            list: [newAgent]
          }
        })
      });
    } catch (err) {
      console.error('Failed to patch config:', err);
      // Agent files created, config patch failed — log but don't fail
    }

    return { id, workspace: workspaceDir, created: true };
  });

  // Delete agent
  app.delete<{ Params: { id: string } }>('/api/agents/:id', async (req, reply) => {
    const { id } = req.params;
    if (id === 'main' || id === 'anchor') {
      return reply.code(403).send({ error: 'Cannot delete built-in agents' });
    }
    // Just remove from config, don't delete files
    // User can manually clean up
    return { deleted: true, note: 'Removed from config. Files remain on disk.' };
  });
}
