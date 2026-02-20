import { memo } from 'react';
import type { Agent } from '../../stores/agents';

interface Props {
  agent: Agent;
  isActive: boolean;
  onClick: () => void;
}

function AgentItem({ agent, isActive, onClick }: Props) {
  const statusColor = agent.status === 'error' ? 'bg-[#e74a3b]' : 'bg-[#00d97e]';
  const rawModel = agent.model && typeof agent.model === 'object' && 'primary' in agent.model
    ? (agent.model as { primary: string }).primary
    : agent.model;
  const modelStr = String(rawModel || 'default');
  const model = modelStr.split('/').pop() || 'default';

  return (
    <button
      onClick={onClick}
      className={`w-full px-4 py-2.5 flex items-start gap-3 text-left transition-colors ${
        isActive
          ? 'bg-[#e94560]/15 border-l-2 border-[#e94560]'
          : 'hover:bg-[#1a1a2e]/50 border-l-2 border-transparent'
      }`}
    >
      <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${statusColor}`} />
      <div className="min-w-0">
        <div className="text-sm font-medium text-[#e0e0e0] truncate capitalize">
          {agent.id.replace(/-/g, ' ')}
        </div>
        <div className="text-xs text-[#6c757d] truncate">{model}</div>
      </div>
    </button>
  );
}

export default memo(AgentItem);
