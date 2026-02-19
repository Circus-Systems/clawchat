import os from 'os';
import path from 'path';

export function getOpenClawHome(): string {
  return process.env.OPENCLAW_HOME || path.join(os.homedir(), '.openclaw');
}

export function resolveAgentPath(agentId: string, ...segments: string[]): string {
  const home = getOpenClawHome();
  const resolved = path.resolve(home, 'agents', agentId, ...segments);
  if (!resolved.startsWith(path.resolve(home))) {
    throw new Error('Path traversal detected');
  }
  return resolved;
}

export function resolveWorkspacePath(agentId: string, ...segments: string[]): string {
  const home = getOpenClawHome();
  // Check if agent has a custom workspace in config, otherwise use default
  const resolved = path.resolve(home, 'workspace', ...segments);
  if (!resolved.startsWith(path.resolve(home))) {
    throw new Error('Path traversal detected');
  }
  return resolved;
}

export function resolveHomePath(...segments: string[]): string {
  const home = getOpenClawHome();
  const resolved = path.resolve(home, ...segments);
  if (!resolved.startsWith(path.resolve(home))) {
    throw new Error('Path traversal detected');
  }
  return resolved;
}
