import { useEffect, useState } from 'react';
import { useConnectionStore } from './stores/connection';
import { useAgentsStore } from './stores/agents';
import { useConfigStore } from './stores/config';
import { getStoredToken } from './lib/auth';
import ConnectionBar from './components/shared/ConnectionBar';
import TokenEntry from './components/shared/TokenEntry';
import AgentList from './components/AgentSelector/AgentList';
import ChatPanel from './components/Chat/ChatPanel';
import ControlPanel from './components/ControlPanel/ControlPanel';

export default function App() {
  const [hasToken, setHasToken] = useState(!!getStoredToken());
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const { status, connect } = useConnectionStore();
  const { fetchAgents } = useAgentsStore();
  const { fetchConfig } = useConfigStore();

  useEffect(() => {
    if (hasToken) {
      connect();
      fetchAgents();
      fetchConfig();
    }
  }, [hasToken]);

  if (!hasToken) {
    return <TokenEntry onTokenSet={() => setHasToken(true)} />;
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      <ConnectionBar />
      <div className="flex flex-1 min-h-0">
        {/* Left: Agent Selector */}
        <div
          className={`${leftPanelOpen ? 'w-64' : 'w-0'} flex-shrink-0 bg-[#16213e] border-r border-[#2a2a4a] transition-all duration-200 overflow-hidden`}
        >
          <AgentList onToggle={() => setLeftPanelOpen(!leftPanelOpen)} />
        </div>

        {/* Toggle button when left panel is closed */}
        {!leftPanelOpen && (
          <button
            onClick={() => setLeftPanelOpen(true)}
            className="flex-shrink-0 w-8 bg-[#16213e] border-r border-[#2a2a4a] flex items-center justify-center hover:bg-[#1e2d4f] text-[#6c757d] hover:text-[#e0e0e0]"
          >
            ›
          </button>
        )}

        {/* Centre: Chat */}
        <div className="flex-1 min-w-0 flex flex-col">
          <ChatPanel
            onToggleRight={() => setRightPanelOpen(!rightPanelOpen)}
          />
        </div>

        {/* Right: Control & Config */}
        {rightPanelOpen && (
          <div className="w-80 flex-shrink-0 bg-[#16213e] border-l border-[#2a2a4a] overflow-y-auto">
            <ControlPanel onClose={() => setRightPanelOpen(false)} />
          </div>
        )}
      </div>
    </div>
  );
}
