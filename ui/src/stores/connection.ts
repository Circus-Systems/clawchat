import { create } from 'zustand';
import { getStoredToken } from '../lib/auth';
import { WS_RECONNECT_DELAYS } from '../lib/constants';
import type { GatewayFrame, GatewayResponse, GatewayEvent } from '../lib/gateway-protocol';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

interface ConnectionState {
  status: ConnectionStatus;
  gatewayInfo: Record<string, unknown> | null;
  latency: number;
  error: string | null;
  reconnectAttempt: number;

  // WebSocket instance (not serializable, kept as module-level)
  connect: () => void;
  disconnect: () => void;
  sendRaw: (data: string) => void;
  request: (method: string, params?: Record<string, unknown>) => Promise<unknown>;
}

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
const pendingRequests = new Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }>();
const eventListeners = new Map<string, Set<(payload: Record<string, unknown>) => void>>();

export function onGatewayEvent(event: string, handler: (payload: Record<string, unknown>) => void) {
  if (!eventListeners.has(event)) eventListeners.set(event, new Set());
  eventListeners.get(event)!.add(handler);
  return () => eventListeners.get(event)?.delete(handler);
}

export function onAnyGatewayEvent(handler: (event: string, payload: Record<string, unknown>) => void) {
  const wrapper = (payload: Record<string, unknown>) => handler('*', payload);
  if (!eventListeners.has('*')) eventListeners.set('*', new Set());
  eventListeners.get('*')!.add(wrapper);
  return () => eventListeners.get('*')?.delete(wrapper);
}

// Raw frame listener for WS proxy forwarding
const rawFrameListeners = new Set<(frame: GatewayFrame) => void>();
export function onRawFrame(handler: (frame: GatewayFrame) => void) {
  rawFrameListeners.add(handler);
  return () => rawFrameListeners.delete(handler);
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  status: 'disconnected',
  gatewayInfo: null,
  latency: 0,
  error: null,
  reconnectAttempt: 0,

  connect: () => {
    const token = getStoredToken();
    if (!token) {
      set({ status: 'disconnected', error: 'No UI token' });
      return;
    }

    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const url = `${protocol}//${host}/ws?token=${encodeURIComponent(token)}`;

    set({ status: get().reconnectAttempt > 0 ? 'reconnecting' : 'connecting', error: null });

    const socket = new WebSocket(url);
    ws = socket;

    socket.onopen = () => {
      console.log('[ws] Connected');
      set({ status: 'connected', reconnectAttempt: 0, error: null });
    };

    socket.onmessage = (event) => {
      try {
        const frame = JSON.parse(event.data) as GatewayFrame;

        // Forward to raw listeners
        for (const listener of rawFrameListeners) listener(frame);

        if (frame.type === 'response') {
          const resp = frame as GatewayResponse;

          // Handle proxy hello
          if (resp.id === 'proxy-hello' && resp.result) {
            set({ gatewayInfo: resp.result as Record<string, unknown> });
          }

          const pending = pendingRequests.get(resp.id);
          if (pending) {
            pendingRequests.delete(resp.id);
            clearTimeout(pending.timer);
            if (resp.error) {
              pending.reject(new Error(resp.error.message));
            } else {
              pending.resolve(resp.result);
            }
          }
        }

        if (frame.type === 'event') {
          const evt = frame as GatewayEvent;
          const handlers = eventListeners.get(evt.event);
          if (handlers) {
            for (const h of handlers) h(evt.payload);
          }
          // Wildcard listeners
          const wildcardHandlers = eventListeners.get('*');
          if (wildcardHandlers) {
            for (const h of wildcardHandlers) h({ event: evt.event, ...evt.payload });
          }
        }
      } catch {}
    };

    socket.onclose = () => {
      console.log('[ws] Disconnected');
      ws = null;
      const attempt = get().reconnectAttempt;
      set({ status: 'reconnecting', reconnectAttempt: attempt + 1 });

      // Reject pending requests
      for (const [, pending] of pendingRequests) {
        clearTimeout(pending.timer);
        pending.reject(new Error('Disconnected'));
      }
      pendingRequests.clear();

      // Reconnect with backoff
      const delay = WS_RECONNECT_DELAYS[Math.min(attempt, WS_RECONNECT_DELAYS.length - 1)];
      reconnectTimer = setTimeout(() => get().connect(), delay);
    };

    socket.onerror = () => {
      set({ error: 'WebSocket error' });
    };
  },

  disconnect: () => {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (ws) {
      ws.onclose = null;
      ws.close();
      ws = null;
    }
    set({ status: 'disconnected', reconnectAttempt: 0 });
  },

  sendRaw: (data: string) => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  },

  request: (method: string, params?: Record<string, unknown>) => {
    return new Promise((resolve, reject) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        return reject(new Error('Not connected'));
      }

      const id = `ui-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const timer = setTimeout(() => {
        pendingRequests.delete(id);
        reject(new Error(`Timeout: ${method}`));
      }, 30000);

      pendingRequests.set(id, { resolve, reject, timer });
      ws.send(JSON.stringify({ type: 'request', id, method, params }));
    });
  },
}));
