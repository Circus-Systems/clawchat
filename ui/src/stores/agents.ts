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
}));
