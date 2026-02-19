import { useConnectionStore } from '../../stores/connection';
import { useErrorsStore, type AgentError } from '../../stores/errors';
import type { Agent } from '../../stores/agents';

const EMPTY_ERRORS: AgentError[] = [];

interface Props {
  agentId: string;
  agent: Agent;
}

export default function StatusSection({ agentId, agent }: Props) {
  const { status: connStatus, gatewayInfo } = useConnectionStore();
  const { agentErrors, toggleLogs } = useErrorsStore();
  const errors = agentErrors[agentId] ?? EMPTY_ERRORS;
  const model = agent.model ? String(agent.model).split('/').pop() : 'default';

  return (
    <div className="p-4">
      <h3 className="text-xs font-semibold text-[#6c757d] uppercase tracking-wider mb-3">
        Status
      </h3>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-[#6c757d]">State</span>
          <span className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${connStatus === 'connected' ? 'bg-[#00d97e]' : 'bg-[#f6c23e]'}`} />
            {connStatus === 'connected' ? 'Running' : connStatus}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#6c757d]">Model</span>
          <span className="font-mono text-xs">{model}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#6c757d]">Session</span>
          <span className="font-mono text-xs">agent:{agentId}:main</span>
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
