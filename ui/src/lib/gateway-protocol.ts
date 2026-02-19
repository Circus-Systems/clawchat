export interface GatewayRequest {
  type: 'request';
  id: string;
  method: string;
  params?: Record<string, unknown>;
}

export interface GatewayResponse {
  type: 'response';
  id: string;
  result?: unknown;
  error?: { code?: number; message: string };
}

export interface GatewayEvent {
  type: 'event';
  event: string;
  payload: Record<string, unknown>;
}

export type GatewayFrame = GatewayRequest | GatewayResponse | GatewayEvent;

export function makeRequest(method: string, params?: Record<string, unknown>): GatewayRequest {
  return {
    type: 'request',
    id: `ui-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    method,
    params,
  };
}
