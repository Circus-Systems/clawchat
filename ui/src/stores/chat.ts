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

// Extract text from message content (handles both string and content array formats)
function extractText(message: unknown): string | null {
  if (typeof message === 'string') return message;
  if (Array.isArray(message)) {
    return message
      .filter((p: Record<string, unknown>) => p.type === 'text')
      .map((p: Record<string, unknown>) => p.text)
      .join('');
  }
  if (message && typeof message === 'object' && 'content' in (message as Record<string, unknown>)) {
    return extractText((message as Record<string, unknown>).content);
  }
  return null;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: {},
  streamingMessage: null,
  isAgentTyping: false,
  sendingMessage: false,

  loadHistory: async (agentId: string, sessionKey: string) => {
    try {
      const res = await apiFetch(`/api/ui/chat/history?agentId=${agentId}&limit=100`);
      if (!res.ok) return;
      const data = await res.json();

      const messages: ChatMessage[] = (data.messages || [])
        .filter((m: Record<string, unknown>) => m.type === 'message')
        .map((m: Record<string, unknown>, i: number) => {
          // History entries are nested: { type, id, timestamp, message: { role, content, ... } }
          const inner = (m.message as Record<string, unknown>) || m;
          const role = (inner.role as string) || 'assistant';
          const rawContent = inner.content;
          const text = extractText(rawContent);
          return {
            id: (m.id as string) || `hist-${i}`,
            role: role as ChatMessage['role'],
            content: text ?? '',
            timestamp: (m.timestamp as string) || new Date().toISOString(),
            status: 'read' as const,
          };
        });

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
      const idempotencyKey = `clawchat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      console.log('[chat] Sending:', { sessionKey, message, idempotencyKey });
      const sendResult = await request('chat.send', {
        sessionKey,
        message,
        deliver: false,
        idempotencyKey,
      });
      console.log('[chat] Send result:', sendResult);

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

// Expose store for debugging
(window as any).__chatStore = useChatStore;

// Wire up Gateway events — the Gateway sends a single "chat" event with state field
onGatewayEvent('chat', (payload) => {
  console.log('[chat-event]', payload.state, 'streaming:', !!useChatStore.getState().streamingMessage);
  const store = useChatStore.getState();
  const state = payload.state as string;

  if (state === 'delta') {
    // Streaming delta — extract text from message
    const text = extractText(payload.message);
    if (text !== null) {
      // The delta sends the full accumulated text, not a diff
      const currentStream = store.streamingMessage;
      if (currentStream) {
        const newText = text;
        if (newText.length > currentStream.text.length) {
          // Replace with full text (Gateway sends cumulative deltas)
          useChatStore.setState({
            streamingMessage: { ...currentStream, text: newText },
          });
        }
      }
    }
  } else if (state === 'final') {
    store.finalizeStream();
  } else if (state === 'aborted') {
    store.finalizeStream();
  } else if (state === 'error') {
    store.finalizeStream();
    const sessionKey = (payload.sessionKey as string) || '';
    if (sessionKey) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'system',
        content: `Error: ${payload.errorMessage || 'Unknown error'}`,
        timestamp: new Date().toISOString(),
        error: String(payload.errorMessage || 'chat error'),
      };
      useChatStore.setState(state => ({
        messages: {
          ...state.messages,
          [sessionKey]: [...(state.messages[sessionKey] || []), errorMsg],
        },
      }));
    }
  }
});
