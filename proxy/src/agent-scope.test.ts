/**
 * agent-scope.test.ts
 *
 * Unit tests for the agent file scope filter.
 * Run with: node --test --experimental-strip-types src/agent-scope.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isAgentFile, isMemoryNote, AGENT_SCAFFOLD_FILES, AGENT_SCAFFOLD_LIST } from './agent-scope.js';

describe('AGENT_SCAFFOLD_FILES', () => {
  it('contains all 8 expected scaffold files', () => {
    const expected = ['AGENTS.md', 'BOOTSTRAP.md', 'HEARTBEAT.md', 'IDENTITY.md', 'MEMORY.md', 'SOUL.md', 'TOOLS.md', 'USER.md'];
    for (const f of expected) {
      assert(AGENT_SCAFFOLD_FILES.has(f), `Expected ${f} in AGENT_SCAFFOLD_FILES`);
    }
    assert.equal(AGENT_SCAFFOLD_FILES.size, 8);
  });

  it('AGENT_SCAFFOLD_LIST is sorted', () => {
    const sorted = [...AGENT_SCAFFOLD_LIST].sort();
    assert.deepEqual(AGENT_SCAFFOLD_LIST, sorted);
  });
});

describe('isMemoryNote', () => {
  it('matches valid memory note paths', () => {
    assert(isMemoryNote('memory/2026-02-20.md'));
    assert(isMemoryNote('memory/2024-01-01.md'));
    assert(isMemoryNote('memory/9999-12-31.md'));
  });

  it('rejects paths without memory/ prefix', () => {
    assert(!isMemoryNote('2026-02-20.md'));
    assert(!isMemoryNote('notes/2026-02-20.md'));
  });

  it('rejects wrong date format', () => {
    assert(!isMemoryNote('memory/20260220.md'));
    assert(!isMemoryNote('memory/2026-2-20.md'));
    assert(!isMemoryNote('memory/2026-02-20.txt'));
    assert(!isMemoryNote('memory/notes.md'));
    assert(!isMemoryNote('memory/'));
    assert(!isMemoryNote('memory/2026-02-20'));
  });

  it('rejects path traversal attempts', () => {
    assert(!isMemoryNote('memory/../SOUL.md'));
    assert(!isMemoryNote('memory/../../openclaw.json'));
  });
});

describe('isAgentFile', () => {
  it('shows all scaffold files', () => {
    for (const f of AGENT_SCAFFOLD_FILES) {
      assert(isAgentFile(f), `Expected ${f} to pass isAgentFile`);
    }
  });

  it('shows valid memory notes', () => {
    assert(isAgentFile('memory/2026-02-20.md'));
    assert(isAgentFile('memory/2024-12-31.md'));
  });

  it('hides user-created project .md files', () => {
    assert(!isAgentFile('ClawChatAccess.md'));
    assert(!isAgentFile('OpenClawDeploymentProcess.md'));
    assert(!isAgentFile('clawchat-bugfix-brief.md'));
    assert(!isAgentFile('README.md'));
    assert(!isAgentFile('notes.md'));
  });

  it('hides config/json files', () => {
    assert(!isAgentFile('auth.json'));
    assert(!isAgentFile('auth-profiles.json'));
    assert(!isAgentFile('openclaw.json'));
  });

  it('hides non-date memory entries', () => {
    assert(!isAgentFile('memory/notes.md'));
    assert(!isAgentFile('memory/index.md'));
    assert(!isAgentFile('memory/heartbeat-state.json'));
  });

  it('renders empty list gracefully — no entries means no crash (filter returns [])', () => {
    const noFiles: string[] = [];
    const result = noFiles.filter(isAgentFile);
    assert.deepEqual(result, []);
  });
});
