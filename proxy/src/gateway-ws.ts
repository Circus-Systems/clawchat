import WebSocket from 'ws';

interface GatewayFrame {
  type: string;
  [key: string]: unknown;
}

let requestIdCounter = 0;
const pendingRequests = new Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();

let gatewaySocket: WebSocket | null = null;
let isConnectedFlag = false;
let helloOkPayload: unknown = null;

const eventListeners = new Set<(frame: GatewayFrame) => void>();

export function onGatewayEvent(listener: (frame: GatewayFrame) => void) {
  eventListeners.add(listener);
  return () => eventListeners.delete(listener);
}

export function getHelloOk() { return helloOkPayload; }
export function isGatewayConnected() { return isConnectedFlag; }

export async function connectToGateway(): Promise<unknown> {
  const url = process.env.OPENCLAW_GATEWAY_URL || 'ws://127.0.0.1:18789';
  const token = process.env.OPENCLAW_GATEWAY_TOKEN;
  if (!token) throw new Error('OPENCLAW_GATEWAY_TOKEN not configured');

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url, {
      headers: { Origin: 'http://127.0.0.1:18789' },
    });
    let handshakeDone = false;

    ws.on('open', () => {
      console.log('[gateway-ws] Connected to Gateway, waiting for challenge...');
      gatewaySocket = ws;
    });

    ws.on('message', (data) => {
      let frame: GatewayFrame;
      try {
        frame = JSON.parse(data.toString());
      } catch { return; }

      // Handle connect challenge
      if (frame.type === 'event' && frame.event === 'connect.challenge' && !handshakeDone) {
        const connectId = `connect-${Date.now()}`;
        const connectFrame = {
          type: 'req',
          id: connectId,
          method: 'connect',
          params: {
            minProtocol: 3,
            maxProtocol: 3,
            client: {
              id: 'openclaw-control-ui',
              version: '2026.2.17',
              platform: 'macos',
              mode: 'webchat',
            },
            role: 'operator',
            scopes: ['operator.admin', 'operator.approvals', 'operator.pairing'],
            caps: [],
            commands: [],
            permissions: {},
            auth: { token },
            locale: 'en-US',
            userAgent: 'clawchat-proxy/1.0.0',
          }
        };
        ws.send(JSON.stringify(connectFrame));

        // Listen for the response
        const onHandshakeResp = (respData: WebSocket.RawData) => {
          try {
            const resp = JSON.parse(respData.toString());
            if (resp.type === 'res' && resp.id === connectId) {
              ws.off('message', onHandshakeResp);
              handshakeDone = true;
              if (resp.ok) {
                helloOkPayload = resp.payload;
                isConnectedFlag = true;
                console.log('[gateway-ws] Authenticated with Gateway');
                resolve(resp.payload);
              } else {
                reject(new Error(resp.error?.message || 'Connect rejected'));
              }
            }
          } catch {}
        };
        ws.on('message', onHandshakeResp);
        return;
      }

      // After handshake: handle responses
      if (frame.type === 'res') {
        const id = frame.id as string;
        const pending = pendingRequests.get(id);
        if (pending) {
          pendingRequests.delete(id);
          if (frame.ok) {
            pending.resolve(frame.payload);
          } else {
            pending.reject(new Error((frame.error as Record<string, string>)?.message || 'RPC error'));
          }
        }
      }

      // Forward all frames to listeners
      for (const listener of eventListeners) {
        listener(frame);
      }
    });

    ws.on('close', () => {
      console.log('[gateway-ws] Disconnected from Gateway');
      isConnectedFlag = false;
      gatewaySocket = null;
      handshakeDone = false;
      for (const [, pending] of pendingRequests) {
        pending.reject(new Error('Gateway disconnected'));
      }
      pendingRequests.clear();

      // Auto-reconnect after 3s
      setTimeout(() => {
        console.log('[gateway-ws] Reconnecting...');
        connectToGateway().catch(err => {
          console.error('[gateway-ws] Reconnect failed:', err.message);
        });
      }, 3000);
    });

    ws.on('error', (err) => {
      console.error('[gateway-ws] Error:', err.message);
      if (!handshakeDone) reject(err);
    });
  });
}

export function gatewayRpc(method: string, params?: Record<string, unknown>): Promise<unknown> {
  if (!gatewaySocket || gatewaySocket.readyState !== WebSocket.OPEN) {
    return Promise.reject(new Error('Not connected to Gateway'));
  }

  const id = `rpc-${++requestIdCounter}-${Date.now()}`;
  const frame = { type: 'req', id, method, params };

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingRequests.delete(id);
      reject(new Error(`RPC timeout: ${method}`));
    }, 30000);

    pendingRequests.set(id, {
      resolve: (v) => { clearTimeout(timeout); resolve(v); },
      reject: (e) => { clearTimeout(timeout); reject(e); }
    });

    gatewaySocket!.send(JSON.stringify(frame));
  });
}

export function sendRawToGateway(data: string) {
  if (gatewaySocket && gatewaySocket.readyState === WebSocket.OPEN) {
    gatewaySocket.send(data);
  }
}
