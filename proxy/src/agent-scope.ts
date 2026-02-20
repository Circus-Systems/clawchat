/**
 * agent-scope.ts
 *
 * Single source of truth for which workspace files "belong" to an agent.
 * Mirrors the set defined in the OpenClaw runtime (agent-scope-CrP-i2MF.js).
 * Update here when OpenClaw adds or renames scaffold files.
 */

export const AGENT_SCAFFOLD_FILES = new Set([
  'AGENTS.md',
  'BOOTSTRAP.md',
  'HEARTBEAT.md',
  'IDENTITY.md',
  'MEMORY.md',
  'SOUL.md',
  'TOOLS.md',
  'USER.md',
]);

/** Sorted array for stable API responses */
export const AGENT_SCAFFOLD_LIST: string[] = [...AGENT_SCAFFOLD_FILES].sort();

/**
 * Returns true if the filename matches the daily memory note pattern.
 * Expected format: `memory/YYYY-MM-DD.md`
 */
export const isMemoryNote = (filename: string): boolean =>
  /^memory\/\d{4}-\d{2}-\d{2}\.md$/.test(filename);

/**
 * Returns true if the given filename is an agent-owned file that should
 * appear in the Identity Files sidebar panel.
 *
 * Accepts both top-level scaffold files and daily memory notes.
 */
export const isAgentFile = (filename: string): boolean =>
  AGENT_SCAFFOLD_FILES.has(filename) || isMemoryNote(filename);
