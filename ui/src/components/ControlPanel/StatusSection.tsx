import { useEffect, useRef, useState } from 'react';
import { useConnectionStore } from '../../stores/connection';
import { useErrorsStore, type AgentError } from '../../stores/errors';
import { apiFetch } from '../../lib/auth';
import type { Agent } from '../../stores/agents';

const EMPTY_ERRORS: AgentError[] = [];
const MAX_NAME_LEN = 64;

interface Props {
  agentId: string;
  agent: Agent;
}

export default function StatusSection({ agentId, agent }: Props) {
  const { status: connStatus, request } = useConnectionStore();
  const { agentErrors, toggleLogs } = useErrorsStore();
  const errors = agentErrors[agentId] ?? EMPTY_ERRORS;

  const rawModel = agent.model && typeof agent.model === 'object' && 'primary' in agent.model
    ? (agent.model as { primary: string }).primary
    : agent.model;
  const modelStr = String(rawModel || 'default');
  const model = modelStr.split('/').pop() || 'default';

  const isRunning = connStatus === 'connected';

  // --- Agent name state ---
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch identity on mount / agent change.
  // If Gateway returns the default "Assistant", try to recover the real name
  // from IDENTITY.md (which is scaffolded with the user-entered name at creation).
  useEffect(() => {
    setDisplayName(null);
    setIsEditing(false);
    setNameError(null);

    let cancelled = false;

    async function loadName() {
      try {
        const res = await request('agent.identity.get', { agentId });
        if (cancelled) return;
        const r = res as Record<string, unknown>;
        const gatewayName = typeof r.name === 'string' ? r.name : '';

        if (gatewayName && gatewayName !== 'Assistant') {
          setDisplayName(gatewayName);
          return;
        }

        // Fallback: extract name from IDENTITY.md scaffold
        // Scaffolded content: "You are <Name>, a personal AI assistant."
        try {
          const fileRes = await apiFetch(`/api/agents/${encodeURIComponent(agentId)}/files/IDENTITY.md`);
          if (!fileRes.ok) throw new Error('no file');
          const { content } = await fileRes.json() as { content: string };
          const match = /^You are ([^,\n]+),/.exec(content) || /^#\s+(.+)$/m.exec(content);
          const extracted = match?.[1]?.trim();
          if (extracted && extracted !== 'Assistant' && extracted !== agentId && cancelled === false) {
            // Save it back to Gateway so future loads are fast
            request('agents.update', { agentId, name: extracted }).catch(() => {});
            setDisplayName(extracted);
            return;
          }
        } catch {}

        if (!cancelled) setDisplayName(gatewayName || agentId);
      } catch {
        if (!cancelled) setDisplayName(agentId);
      }
    }

    loadName();
    return () => { cancelled = true; };
  }, [agentId]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing) inputRef.current?.select();
  }, [isEditing]);

  function startEdit() {
    if (!isRunning || isSaving || displayName === null) return;
    setEditValue(displayName);
    setNameError(null);
    setIsEditing(true);
  }

  function cancelEdit() {
    setIsEditing(false);
    setNameError(null);
  }

  async function commitEdit() {
    const trimmed = editValue.trim();
    if (!trimmed) {
      setNameError("Name can't be blank");
      return;
    }
    if (trimmed === displayName) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    setNameError(null);
    const previous = displayName;

    try {
      await request('agents.update', { agentId, name: trimmed });
      setDisplayName(trimmed);
      setIsEditing(false);
    } catch (err: unknown) {
      setDisplayName(previous);
      setNameError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
    if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
  }

  return (
    <div className="p-4">
      <h3 className="text-xs font-semibold text-[#6c757d] uppercase tracking-wider mb-3">
        Status
      </h3>

      <div className="space-y-2 text-sm">
        {/* Name row */}
        <div className="flex justify-between items-center min-h-[1.5rem]">
          <span className="text-[#6c757d] flex-shrink-0">Name</span>

          {isEditing ? (
            <div className="flex flex-col items-end gap-0.5 ml-2 flex-1 min-w-0">
              <input
                ref={inputRef}
                value={editValue}
                onChange={e => { setEditValue(e.target.value.slice(0, MAX_NAME_LEN)); setNameError(null); }}
                onKeyDown={handleKeyDown}
                onBlur={commitEdit}
                disabled={isSaving}
                maxLength={MAX_NAME_LEN}
                className={`w-full bg-[#0d1117] px-2 py-0.5 rounded border text-xs text-[#e0e0e0] focus:outline-none ${
                  nameError
                    ? 'border-[#e74a3b] focus:border-[#e74a3b]'
                    : 'border-[#2a2a4a] focus:border-[#e94560]'
                } ${isSaving ? 'opacity-50' : ''}`}
              />
              {nameError && (
                <span className="text-[10px] text-[#e74a3b]">{nameError}</span>
              )}
            </div>
          ) : (
            <button
              onClick={startEdit}
              disabled={!isRunning || isSaving || displayName === null}
              title={isRunning ? 'Click to rename' : 'Agent must be running to rename'}
              className={`group flex items-center gap-1.5 max-w-[60%] text-right ${
                isRunning && displayName !== null
                  ? 'hover:text-[#e94560] cursor-pointer'
                  : 'cursor-default'
              }`}
            >
              <span className="truncate text-xs font-medium text-[#e0e0e0]">
                {displayName === null ? (
                  <span className="text-[#6c757d] italic">Loading…</span>
                ) : displayName}
              </span>
              {isRunning && displayName !== null && (
                <span className="text-[#6c757d] opacity-0 group-hover:opacity-100 transition-opacity text-[10px] flex-shrink-0">
                  ✎
                </span>
              )}
            </button>
          )}
        </div>

        {/* State row */}
        <div className="flex justify-between">
          <span className="text-[#6c757d]">State</span>
          <span className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${connStatus === 'connected' ? 'bg-[#00d97e]' : 'bg-[#f6c23e]'}`} />
            {connStatus === 'connected' ? 'Running' : connStatus}
          </span>
        </div>

        {/* Model row */}
        <div className="flex justify-between">
          <span className="text-[#6c757d]">Model</span>
          <span className="font-mono text-xs">{model}</span>
        </div>

        {/* Session row */}
        <div className="flex justify-between">
          <span className="text-[#6c757d]">Session</span>
          <span className="font-mono text-xs">agent:{agentId}:main</span>
        </div>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="mt-3 p-2 bg-[#e74a3b]/10 border border-[#e74a3b]/30 rounded-lg">
          <div className="text-xs text-[#e74a3b] font-semibold mb-1">
            ⚠ {errors.length} recent error{errors.length > 1 ? 's' : ''}
          </div>
          <div className="text-xs text-[#e74a3b]/80">
            {errors[errors.length - 1].message}
          </div>
        </div>
      )}

      <button
        onClick={toggleLogs}
        className="mt-3 text-xs text-[#6c757d] hover:text-[#e94560] transition-colors"
      >
        View Gateway Logs →
      </button>
    </div>
  );
}
