import { useState } from 'react';
import { useAgentsStore } from '../../stores/agents';
import AgentItem from './AgentItem';
import NewAgentDialog from './NewAgentDialog';

interface Props {
  onToggle: () => void;
}

export default function AgentList({ onToggle }: Props) {
  const { agents, activeAgentId, setActiveAgent } = useAgentsStore();
  const [showNewAgent, setShowNewAgent] = useState(false);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-[#2a2a4a] flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">🦞</span>
          <span className="font-bold text-sm tracking-wide" style={{ fontFamily: 'DM Sans' }}>
            ClawChat
          </span>
        </div>
        <button
          onClick={onToggle}
          className="text-[#6c757d] hover:text-[#e0e0e0] text-sm"
          title="Collapse panel"
        >
          ‹
        </button>
      </div>

      {/* Agent list */}
      <div className="flex-1 overflow-y-auto py-2">
        {agents.map((agent) => (
          <AgentItem
            key={agent.id}
            agent={agent}
            isActive={agent.id === activeAgentId}
            onClick={() => setActiveAgent(agent.id)}
          />
        ))}
      </div>

      {/* New Agent button */}
      <div className="p-3 border-t border-[#2a2a4a]">
        <button
          onClick={() => setShowNewAgent(true)}
          className="w-full px-3 py-2 text-sm text-[#6c757d] hover:text-[#e0e0e0] border border-dashed border-[#2a2a4a] rounded-lg hover:border-[#e94560] hover:bg-[#e94560]/10 transition-colors"
        >
          + New Agent
        </button>
      </div>

      {showNewAgent && <NewAgentDialog onClose={() => setShowNewAgent(false)} />}
    </div>
  );
}
