import { create } from 'zustand';
import { onGatewayEvent } from './connection';
import { MAX_LOG_BUFFER } from '../lib/constants';
import { apiFetch } from '../lib/auth';

export interface AgentError {
  id: string;
  message: string;
  timestamp: string;
  source: string; // 'chat.error' | 'agent.error' | etc.
  details?: Record<string, unknown>;
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  [key: string]: unknown;
}

interface ErrorsState {
  agentErrors: Record<string, AgentError[]>; // keyed by agentId
  gatewayLogs: LogEntry[];
  showLogs: boolean;

  addError: (agentId: string, error: AgentError) => void;
  clearErrors: (agentId: string) => void;
  fetchLogs: (lines?: number, level?: string) => Promise<void>;
  toggleLogs: () => void;
}

export const useErrorsStore = create<ErrorsState>((set) => ({
  agentErrors: {},
  gatewayLogs: [],
  showLogs: false,

  addError: (agentId, error) => {
    set(state => {
      const errors = [...(state.agentErrors[agentId] || []), error].slice(-50);
      return { agentErrors: { ...state.agentErrors, [agentId]: errors } };
    });
  },

  clearErrors: (agentId) => {
    set(state => ({
      agentErrors: { ...state.agentErrors, [agentId]: [] },
    }));
  },

  fetchLogs: async (lines = 100, level?: string) => {
    try {
      const params = new URLSearchParams({ lines: String(lines) });
      if (level) params.set('level', level);
      const res = await apiFetch(`/api/logs?${params}`);
      if (res.ok) {
        const data = await res.json();
        set({ gatewayLogs: (data.entries as LogEntry[]).slice(-MAX_LOG_BUFFER) });
      }
    } catch {}
  },

  toggleLogs: () => set(state => ({ showLogs: !state.showLogs })),
}));

// Wire up error events
onGatewayEvent('chat.error', (payload) => {
  const agentId = (payload.agentId || payload.agent || 'unknown') as string;
  useErrorsStore.getState().addError(agentId, {
    id: `err-${Date.now()}`,
    message: String(payload.message || payload.error || 'Unknown error'),
    timestamp: new Date().toISOString(),
    source: 'chat.error',
    details: payload,
  });
});

onGatewayEvent('agent.error', (payload) => {
  const agentId = (payload.agentId || payload.agent || 'unknown') as string;
  useErrorsStore.getState().addError(agentId, {
    id: `err-${Date.now()}`,
    message: String(payload.message || payload.error || 'Agent error'),
    timestamp: new Date().toISOString(),
    source: 'agent.error',
    details: payload,
  });
});
