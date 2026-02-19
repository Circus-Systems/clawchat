import { useEffect } from 'react';
import { useAgentsStore } from '../../stores/agents';
import { useConfigStore } from '../../stores/config';
import StatusSection from './StatusSection';
import IdentityFiles from './IdentityFiles';
import FileEditor from './FileEditor';
import SessionManager from './SessionManager';
import DangerZone from './DangerZone';

interface Props {
  onClose: () => void;
}

export default function ControlPanel({ onClose }: Props) {
  const { activeAgentId, agents } = useAgentsStore();
  const { editingFile, fetchAgentFiles } = useConfigStore();
  const agent = agents.find(a => a.id === activeAgentId);

  useEffect(() => {
    if (activeAgentId) {
      fetchAgentFiles(activeAgentId);
    }
  }, [activeAgentId]);

  if (!activeAgentId || !agent) {
    return (
      <div className="p-4 text-[#6c757d] text-sm">No agent selected</div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-[#2a2a4a] flex-shrink-0">
        <span className="text-sm font-semibold">⚙ Control</span>
        <button
          onClick={onClose}
          className="text-[#6c757d] hover:text-[#e0e0e0] text-lg"
        >
          ×
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {editingFile && editingFile.agentId === activeAgentId ? (
          <FileEditor />
        ) : (
          <div className="divide-y divide-[#2a2a4a]">
            <StatusSection agentId={activeAgentId} agent={agent} />
            <IdentityFiles agentId={activeAgentId} />
            <SessionManager agentId={activeAgentId} />
            <DangerZone agentId={activeAgentId} />
          </div>
        )}
      </div>
    </div>
  );
}
