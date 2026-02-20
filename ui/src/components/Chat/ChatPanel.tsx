import { useEffect } from 'react';
import { useAgentsStore } from '../../stores/agents';
import { useChatStore } from '../../stores/chat';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';

interface Props {
  onToggleRight: () => void;
}

export default function ChatPanel({ onToggleRight }: Props) {
  const { activeAgentId, agents } = useAgentsStore();
  const { loadHistory, isAgentTyping, streamingMessage } = useChatStore();
  const agent = agents.find(a => a.id === activeAgentId);
  const sessionKey = activeAgentId ? `agent:${activeAgentId}:main` : '';

  useEffect(() => {
    if (activeAgentId && sessionKey) {
      loadHistory(activeAgentId, sessionKey);
    }
  }, [activeAgentId, sessionKey]);

  if (!activeAgentId || !agent) {
    return (
      <div className="flex-1 flex items-center justify-center text-[#6c757d]">
        <div className="text-center">
          <span className="text-4xl block mb-2">🦞</span>
          <p>Select an agent to start chatting</p>
        </div>
      </div>
    );
  }

  const rawModel = agent.model && typeof agent.model === 'object' && 'primary' in agent.model
    ? (agent.model as { primary: string }).primary
    : agent.model;
  const modelStr = String(rawModel || 'default');
  const model = modelStr.split('/').pop() || 'default';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-[#2a2a4a] bg-[#1a1a2e] flex-shrink-0">
        <div>
          <span className="font-semibold text-sm capitalize">
            {agent.id.replace(/-/g, ' ')}
          </span>
          <span className="text-xs text-[#6c757d] ml-2">
            {model} • session:main
          </span>
        </div>
        <button
          onClick={onToggleRight}
          className="text-[#6c757d] hover:text-[#e0e0e0] text-lg"
          title="Toggle config panel"
        >
          ⚙
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0">
        <MessageList sessionKey={sessionKey} />
      </div>

      {/* Typing indicator */}
      {(isAgentTyping || streamingMessage) && <TypingIndicator agentName={agent.id} />}

      {/* Input */}
      <ChatInput agentId={activeAgentId} sessionKey={sessionKey} />
    </div>
  );
}
