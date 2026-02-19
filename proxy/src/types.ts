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

export interface AgentInfo {
  id: string;
  workspace?: string;
  model?: string;
  subagentModel?: string;
  status?: string;
}

export interface FileInfo {
  name: string;
  path: string;
  modified: string;
  size: number;
}
