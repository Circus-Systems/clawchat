import { useEffect, useRef, useState, useCallback } from 'react';
import { useConnectionStore, onGatewayEvent } from '../../stores/connection';
import { useErrorsStore, type AgentError } from '../../stores/errors';
import { apiFetch } from '../../lib/auth';
import type { Agent } from '../../stores/agents';

const EMPTY_ERRORS: AgentError[] = [];
const MAX_NAME_LEN = 64;
const POLL_INTERVAL_MS = 30_000;

interface TokenInfo {
  used: number;
  limit: number;
  fresh: boolean;
}

interface Props {
  agentId: string;
  agent: Agent;
}

function fmt(n: number) { return n.toLocaleString(); }

function TokenBar({ used, limit, fresh }: TokenInfo) {
  const rawPct = limit > 0 ? (used / limit) * 100 : 0;
  const pct = Math.min(100, Math.round(rawPct));
  const colour =
    pct >= 90 ? 'bg-[#e74a3b]' :
    pct >= 70 ? 'bg-[#f6c23e]' :
    'bg-[#00d97e]';
  const textColour =
    pct >= 90 ? 'text-[#e74a3b]' :
    pct >= 70 ? 'text-[#f6c23e]' :
    'text-[#00d97e]';
  const muted = !fresh;

  return (
    <div className="mt-1 space-y-1">
      <div className={`flex justify-between text-[10px] ${muted ? 'text-[#6c757d]' : textColour}`}>
        <span>{muted ? '~' : ''}{fmt(used)} / {fmt(limit)}</span>
        <span>{pct}%</span>
      </div>
      <div className="w-full h-1.5 bg-[#2a2a4a] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colour} ${muted ? 'opacity-40' : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
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
  const fullModel = modelStr; // keep full id for models.list fallback lookup

  const isRunning = connStatus === 'connected';

  // --- Agent name state ---
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // --- Token state ---
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [tokenLoading, setTokenLoading] = useState(true);

  // Fetch token usage from sessions.list; falls back to models.list for limit
  const fetchTokens = useCallback(async () => {
    try {
      const sessionKey = `agent:${agentId}:main`;
      // Fetch all sessions; agentId filter may not work for all gateway versions
      const res = await request('sessions.list', { agentId, limit: 50 }) as Record<string, unknown>;
      const raw = res?.sessions ?? res;
      const sessions = Array.isArray(raw) ? raw as Array<Record<string, unknown>> : [];
      const session = sessions.find(s => s.key === sessionKey)
        // Fallback: any session belonging to this agent
        ?? sessions.find(s => typeof s.key === 'string' && s.key.startsWith(`agent:${agentId}:`));

      if (!session) {
        setTokenInfo(null);
        setTokenLoading(false);
        return;
      }

      const used = Number(session.totalTokens ?? 0);
      let limit = Number(session.contextTokens ?? 0);
      const fresh = session.totalTokensFresh !== false;

      // Fallback: if limit missing, query models.list
      if (!limit && fullModel) {
        try {
          const mres = await request('models.list', {}) as Record<string, unknown>;
          const models = (mres?.models ?? mres) as Array<Record<string, unknown>>;
          if (Array.isArray(models)) {
            const found = models.find(m =>
              m.id === fullModel ||
              String(m.id).endsWith('/' + fullModel) ||
              String(m.id).endsWith('/' + model)
            );
            if (found) limit = Number(found.contextWindow ?? 0);
          }
        } catch {}
      }

      setTokenInfo({ used, limit, fresh });
      setTokenLoading(false);
    } catch {
      setTokenLoading(false);
    }
  }, [agentId, fullModel, model, request]);

  // Fetch name from gateway / IDENTITY.md fallback
  useEffect(() => {
    setDisplayName(null);
    setIsEditing(false);
    setNameError(null);
    setTokenInfo(null);
    setTokenLoading(true);

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

        try {
          const fileRes = await apiFetch(`/api/agents/${encodeURIComponent(agentId)}/files/IDENTITY.md`);
          if (!fileRes.ok) throw new Error('no file');
          const { content } = await fileRes.json() as { content: string };
          const match = /^You are ([^,\n]{1,64}),/m.exec(content);
          const extracted = match?.[1]?.trim();
          if (extracted && extracted !== 'Assistant' && extracted !== agentId && !cancelled) {
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

  // Poll token usage every 30s + immediate fetch on mount/agent change
  useEffect(() => {
    fetchTokens();
    const timer = setInterval(fetchTokens, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fetchTokens]);

  // Refresh tokens after chat events (debounced 1s — wait for session to update)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsub = onGatewayEvent('chat', () => {
      clearTimeout(timer);
      timer = setTimeout(fetchTokens, 1000);
    });
    return () => { unsub(); clearTimeout(timer); };
  }, [fetchTokens]);

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
    if (!trimmed) { setNameError("Name can't be blank"); return; }
    if (trimmed === displayName) { setIsEditing(false); return; }

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
                  nameError ? 'border-[#e74a3b]' : 'border-[#2a2a4a] focus:border-[#e94560]'
                } ${isSaving ? 'opacity-50' : ''}`}
              />
              {nameError && <span className="text-[10px] text-[#e74a3b]">{nameError}</span>}
            </div>
          ) : (
            <button
              onClick={startEdit}
              disabled={!isRunning || isSaving || displayName === null}
              title={isRunning ? 'Click to rename' : 'Agent must be running to rename'}
              className={`group flex items-center gap-1.5 max-w-[60%] ${
                isRunning && displayName !== null ? 'hover:text-[#e94560] cursor-pointer' : 'cursor-default'
              }`}
            >
              <span className="truncate text-xs font-medium text-[#e0e0e0]">
                {displayName === null
                  ? <span className="text-[#6c757d] italic">Loading…</span>
                  : displayName}
              </span>
              {isRunning && displayName !== null && (
                <span className="text-[#6c757d] opacity-0 group-hover:opacity-100 transition-opacity text-[10px] flex-shrink-0">✎</span>
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

        {/* Tokens row */}
        <div className="flex flex-col gap-0.5">
          <div className="flex justify-between items-center">
            <span className="text-[#6c757d]">Tokens</span>
            {tokenLoading && !tokenInfo && (
              <span className="text-xs text-[#6c757d] italic">Loading…</span>
            )}
            {!tokenLoading && !tokenInfo && (
              <span className="text-xs text-[#6c757d]">—</span>
            )}
          </div>
          {tokenInfo && tokenInfo.limit > 0 && (
            <TokenBar {...tokenInfo} />
          )}
          {tokenInfo && tokenInfo.limit === 0 && (
            <span className="text-xs text-[#6c757d]">
              {tokenInfo.fresh ? '' : '~'}{fmt(tokenInfo.used)} tokens
            </span>
          )}
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
