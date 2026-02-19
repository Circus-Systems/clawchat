import { useState, useRef, useCallback } from 'react';
import { useChatStore } from '../../stores/chat';

interface Props {
  agentId: string;
  sessionKey: string;
}

export default function ChatInput({ agentId, sessionKey }: Props) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { sendMessage, sendingMessage, isAgentTyping, abortRun } = useChatStore();

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || sendingMessage) return;
    sendMessage(agentId, sessionKey, trimmed);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [text, agentId, sessionKey, sendMessage, sendingMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape' && isAgentTyping) {
      abortRun(sessionKey);
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    // Auto-resize
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  };

  return (
    <div className="border-t border-[#2a2a4a] bg-[#1a1a2e] p-3">
      <div className="flex gap-2 items-end">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          className="flex-1 px-4 py-2.5 bg-[#16213e] border border-[#2a2a4a] rounded-xl text-sm text-[#e0e0e0] placeholder-[#6c757d] resize-none focus:outline-none focus:border-[#e94560] max-h-[200px]"
          disabled={sendingMessage}
        />

        {isAgentTyping ? (
          <button
            onClick={() => abortRun(sessionKey)}
            className="px-4 py-2.5 bg-[#e74a3b] text-white rounded-xl text-sm font-medium hover:bg-[#d43a2d] transition-colors flex-shrink-0"
            title="Cancel (Escape)"
          >
            Stop
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!text.trim() || sendingMessage}
            className="px-4 py-2.5 bg-[#e94560] text-white rounded-xl text-sm font-medium hover:bg-[#d13a52] disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            title="Send (Enter)"
          >
            Send
          </button>
        )}
      </div>
      <div className="flex items-center gap-2 mt-1.5 px-1">
        <span className="text-xs text-[#6c757d]">
          Enter to send • Shift+Enter for newline • Escape to cancel
        </span>
      </div>
    </div>
  );
}
