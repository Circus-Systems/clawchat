import { create } from 'zustand';
import { apiFetch } from '../lib/auth';

export interface Agent {
  id: string;
  workspace?: string;
  model?: string;
  subagentModel?: string;
  status?: string;
  [key: string]: unknown;
}

interface AgentsState {
  agents: Agent[];
  activeAgentId: string | null;
  loading: boolean;
  error: string | null;

  fetchAgents: () => Promise<void>;
  setActiveAgent: (id: string) => void;
  deleteAgent: (id: string) => Promise<void>;
}

const LAST_AGENT_KEY = 'clawchat_last_agent';

export const useAgentsStore = create<AgentsState>((set, get) => ({
  agents: [],
  activeAgentId: localStorage.getItem(LAST_AGENT_KEY),
  loading: false,
  error: null,

  fetchAgents: async () => {
    set({ loading: true, error: null });
    try {
      const res = await apiFetch('/api/agents');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const agents = data.agents as Agent[];
      set({ agents, loading: false });

      // Auto-select if none selected
      const current = get().activeAgentId;
      if (!current || !agents.find(a => a.id === current)) {
        if (agents.length > 0) {
          const first = agents[0].id;
          set({ activeAgentId: first });
          localStorage.setItem(LAST_AGENT_KEY, first);
        }
      }
    } catch (err: unknown) {
      set({ loading: false, error: err instanceof Error ? err.message : 'Failed to load agents' });
    }
  },

  setActiveAgent: (id: string) => {
    set({ activeAgentId: id });
    localStorage.setItem(LAST_AGENT_KEY, id);
  },

  deleteAgent: async (id: string) => {
    const res = await apiFetch(`/api/agents/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || 'Failed to delete agent');
    }
    // Remove from local state and clear selection
    set(state => {
      const remaining = state.agents.filter(a => a.id !== id);
      const nextActive = remaining.length > 0 ? remaining[0].id : null;
      if (nextActive) localStorage.setItem(LAST_AGENT_KEY, nextActive);
      else localStorage.removeItem(LAST_AGENT_KEY);
      return { agents: remaining, activeAgentId: nextActive };
    });
  },
}));
