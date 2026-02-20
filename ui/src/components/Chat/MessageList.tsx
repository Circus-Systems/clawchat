import { useEffect, useRef, useState } from 'react';
import { useChatStore } from '../../stores/chat';
import { useAgentsStore } from '../../stores/agents';
import MessageBubble from './MessageBubble';
import StreamingMessage from './StreamingMessage';
import ForwardDialog from './ForwardDialog';

const EMPTY_MESSAGES: never[] = [];

interface Props {
  sessionKey: string;
}

export default function MessageList({ sessionKey }: Props) {
  const messages = useChatStore(state => state.messages[sessionKey] ?? EMPTY_MESSAGES);
  const streamingMessage = useChatStore(state => state.streamingMessage);
  const { activeAgentId } = useAgentsStore();
  const [forwardContent, setForwardContent] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);

  // Check if user has scrolled up
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    shouldAutoScroll.current = scrollHeight - scrollTop - clientHeight < 100;
  };

  // Auto-scroll on new messages
  useEffect(() => {
    if (shouldAutoScroll.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingMessage?.text]);

  // Group messages by date
  let lastDate = '';

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="h-full overflow-y-auto px-4 py-4 space-y-1"
    >
      {messages.length === 0 && !streamingMessage && (
        <div className="flex items-center justify-center h-full text-[#6c757d] text-sm">
          <div className="text-center">
            <p>No messages yet</p>
            <p className="text-xs mt-1">Send a message to get started</p>
          </div>
        </div>
      )}

      {messages.map((msg) => {
        const date = new Date(msg.timestamp).toLocaleDateString();
        const showDate = date !== lastDate;
        lastDate = date;

        return (
          <div key={msg.id}>
            {showDate && (
              <div className="flex items-center justify-center my-4">
                <span className="text-xs text-[#6c757d] bg-[#16213e] px-3 py-1 rounded-full">
                  {date}
                </span>
              </div>
            )}
            <MessageBubble message={msg} onForward={setForwardContent} />
          </div>
        );
      })}

      {streamingMessage && streamingMessage.sessionKey === sessionKey && (
        <StreamingMessage stream={streamingMessage} />
      )}

      <div ref={bottomRef} />

      {forwardContent && (
        <ForwardDialog
          content={forwardContent}
          onClose={() => setForwardContent(null)}
          currentAgentId={activeAgentId || undefined}
        />
      )}
    </div>
  );
}
