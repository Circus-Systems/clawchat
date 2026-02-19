import { create } from 'zustand';
import { apiFetch } from '../lib/auth';
import { useConnectionStore, onGatewayEvent } from './connection';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: string;
  status?: 'pending' | 'sent' | 'read';
  toolCalls?: ToolCall[];
  error?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  args?: string;
  status: 'running' | 'completed' | 'failed';
  result?: string;
  duration?: number;
}

export interface StreamState {
  agentId: string;
  sessionKey: string;
  text: string;
  toolCalls: ToolCall[];
  startedAt: number;
}

interface ChatState {
  // Messages keyed by session key
  messages: Record<string, ChatMessage[]>;
  streamingMessage: StreamState | null;
  isAgentTyping: boolean;
  sendingMessage: boolean;

  // Actions
  loadHistory: (agentId: string, sessionKey: string) => Promise<void>;
  sendMessage: (agentId: string, sessionKey: string, message: string) => Promise<void>;
  abortRun: (sessionKey: string) => Promise<void>;
  appendStreamChunk: (text: string) => void;
  addToolCall: (toolCall: ToolCall) => void;
  finalizeStream: () => void;
  clearMessages: (sessionKey: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: {},
  streamingMessage: null,
  isAgentTyping: false,
  sendingMessage: false,

  loadHistory: async (agentId: string, sessionKey: string) => {
    try {
      const encodedKey = encodeURIComponent(sessionKey);
      const res = await apiFetch(`/api/agents/${agentId}/sessions/${encodedKey}/history?limit=100`);
      if (!res.ok) return;
      const data = await res.json();

      const messages: ChatMessage[] = (data.messages || []).map((m: Record<string, unknown>, i: number) => ({
        id: `hist-${i}`,
        role: m.role || 'assistant',
        content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
        timestamp: (m.timestamp as string) || new Date().toISOString(),
        status: 'read',
      }));

      set(state => ({
        messages: { ...state.messages, [sessionKey]: messages },
      }));
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  },

  sendMessage: async (agentId: string, sessionKey: string, message: string) => {
    const msgId = `msg-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: msgId,
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
      status: 'pending',
    };

    // Optimistic add
    set(state => ({
      messages: {
        ...state.messages,
        [sessionKey]: [...(state.messages[sessionKey] || []), userMsg],
      },
      sendingMessage: true,
    }));

    try {
      const { request } = useConnectionStore.getState();
      await request('chat.send', {
        session: sessionKey,
        message,
      });

      // Update status to sent
      set(state => ({
        messages: {
          ...state.messages,
          [sessionKey]: state.messages[sessionKey]?.map(m =>
            m.id === msgId ? { ...m, status: 'sent' as const } : m
          ) || [],
        },
        sendingMessage: false,
        isAgentTyping: true,
        streamingMessage: {
          agentId,
          sessionKey,
          text: '',
          toolCalls: [],
          startedAt: Date.now(),
        },
      }));
    } catch (err) {
      set(state => ({
        messages: {
          ...state.messages,
          [sessionKey]: state.messages[sessionKey]?.map(m =>
            m.id === msgId ? { ...m, status: 'sent' as const, error: err instanceof Error ? err.message : 'Send failed' } : m
          ) || [],
        },
        sendingMessage: false,
      }));
    }
  },

  abortRun: async (sessionKey: string) => {
    try {
      const { request } = useConnectionStore.getState();
      await request('chat.abort', { session: sessionKey });
    } catch {}
    set({ isAgentTyping: false, streamingMessage: null });
  },

  appendStreamChunk: (text: string) => {
    set(state => {
      if (!state.streamingMessage) return state;
      return {
        streamingMessage: {
          ...state.streamingMessage,
          text: state.streamingMessage.text + text,
        },
      };
    });
  },

  addToolCall: (toolCall: ToolCall) => {
    set(state => {
      if (!state.streamingMessage) return state;
      const existing = state.streamingMessage.toolCalls.findIndex(t => t.id === toolCall.id);
      const toolCalls = [...state.streamingMessage.toolCalls];
      if (existing >= 0) {
        toolCalls[existing] = { ...toolCalls[existing], ...toolCall };
      } else {
        toolCalls.push(toolCall);
      }
      return {
        streamingMessage: { ...state.streamingMessage, toolCalls },
      };
    });
  },

  finalizeStream: () => {
    const state = get();
    if (!state.streamingMessage) return;

    const { sessionKey, text, toolCalls } = state.streamingMessage;
    const assistantMsg: ChatMessage = {
      id: `agent-${Date.now()}`,
      role: 'assistant',
      content: text,
      timestamp: new Date().toISOString(),
      status: 'read',
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    };

    set(state => ({
      messages: {
        ...state.messages,
        [sessionKey]: [...(state.messages[sessionKey] || []), assistantMsg],
      },
      streamingMessage: null,
      isAgentTyping: false,
      // Mark user messages as read
    }));
  },

  clearMessages: (sessionKey: string) => {
    set(state => ({
      messages: { ...state.messages, [sessionKey]: [] },
    }));
  },
}));

// Wire up Gateway events to chat store
onGatewayEvent('chat.message', (payload) => {
  const chunk = payload.text || payload.chunk || payload.content;
  if (typeof chunk === 'string') {
    useChatStore.getState().appendStreamChunk(chunk);
  }
});

onGatewayEvent('chat.tool_call', (payload) => {
  useChatStore.getState().addToolCall({
    id: (payload.id || payload.callId || `tool-${Date.now()}`) as string,
    name: (payload.name || payload.tool || 'unknown') as string,
    args: payload.args ? JSON.stringify(payload.args) : undefined,
    status: (payload.status as 'running' | 'completed' | 'failed') || 'running',
    result: payload.result ? String(payload.result) : undefined,
    duration: payload.duration as number | undefined,
  });
});

onGatewayEvent('chat.done', () => {
  useChatStore.getState().finalizeStream();
});

onGatewayEvent('chat.error', (payload) => {
  const store = useChatStore.getState();
  if (store.streamingMessage) {
    store.finalizeStream();
  }
  // Add error message
  const sessionKey = (payload.session as string) || '';
  if (sessionKey) {
    const errorMsg: ChatMessage = {
      id: `err-${Date.now()}`,
      role: 'system',
      content: `Error: ${payload.message || payload.error || 'Unknown error'}`,
      timestamp: new Date().toISOString(),
      error: String(payload.message || payload.error),
    };
    useChatStore.setState(state => ({
      messages: {
        ...state.messages,
        [sessionKey]: [...(state.messages[sessionKey] || []), errorMsg],
      },
    }));
  }
});
