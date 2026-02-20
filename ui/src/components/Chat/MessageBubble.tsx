import { memo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { ChatMessage } from '../../stores/chat';
import ToolCallCard from './ToolCallCard';

interface Props {
  message: ChatMessage;
  onForward?: (content: string) => void;
  onAddToBacklog?: (content: string) => void;
}

interface CodeProps {
  node?: any;
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
  [key: string]: any;
}

function MessageBubble({ message, onForward, onAddToBacklog }: Props) {
  const [showMenu, setShowMenu] = useState(false);
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isError = !!message.error;

  if (isSystem) {
    return (
      <div className={`flex justify-center my-2 ${isError ? '' : ''}`}>
        <div
          className={`text-xs px-3 py-1.5 rounded-lg max-w-lg text-center ${
            isError
              ? 'bg-[#e74a3b]/15 text-[#e74a3b] border border-[#e74a3b]/30'
              : 'bg-[#2a2a4a]/50 text-[#6c757d]'
          }`}
        >
          {message.content}
        </div>
      </div>
    );
  }

  const statusIcon = isUser
    ? message.status === 'pending'
      ? '○'
      : message.status === 'read'
        ? '✓✓'
        : '✓'
    : null;

  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="py-1.5 group">
      <div
        className={`rounded-xl px-4 py-3 max-w-[85%] ${
          isUser
            ? 'bg-[#0f3460] ml-auto'
            : 'bg-[#1e1e3a]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-1 relative">
          <span className="text-xs font-semibold text-[#e0e0e0]">
            {isUser ? '🧑 You' : '🦞 Agent'}
          </span>
          <span className="text-xs text-[#6c757d]">{time}</span>
          {statusIcon && (
            <span className={`text-xs ${message.status === 'read' ? 'text-[#00d97e]' : 'text-[#6c757d]'}`}>
              {statusIcon}
            </span>
          )}
          
          {(onForward || onAddToBacklog) && (
            <div className="ml-auto relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className={`opacity-0 group-hover:opacity-100 text-[#6c757d] hover:text-[#e0e0e0] transition-opacity ${showMenu ? 'opacity-100 text-[#e0e0e0]' : ''}`}
                title="Options"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>

              {showMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-5 w-40 bg-[#16213e] border border-[#2a2a4a] rounded-lg shadow-xl z-50 overflow-hidden py-1">
                    {onForward && (
                      <button
                        onClick={() => { onForward(message.content); setShowMenu(false); }}
                        className="w-full text-left px-3 py-2 text-xs text-[#e0e0e0] hover:bg-[#1a1a2e] flex items-center gap-2"
                      >
                        <span>↪</span> Forward to Agent
                      </button>
                    )}
                    {onAddToBacklog && (
                      <button
                        onClick={() => { onAddToBacklog(message.content); setShowMenu(false); }}
                        className="w-full text-left px-3 py-2 text-xs text-[#e0e0e0] hover:bg-[#1a1a2e] flex items-center gap-2"
                      >
                        <span>📋</span> Add to Backlog
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="prose prose-invert prose-sm max-w-none text-[#e0e0e0]">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ node, inline, className, children, ...props }: CodeProps) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <SyntaxHighlighter
                    style={vscDarkPlus}
                    language={match[1]}
                    PreTag="div"
                    {...props}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              }
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>

        {/* Tool calls */}
        {message.toolCalls?.map((tc) => (
          <ToolCallCard key={tc.id} toolCall={tc} />
        ))}
      </div>
    </div>
  );
}

export default memo(MessageBubble, (prev, next) => {
  return prev.message.id === next.message.id
    && prev.message.content === next.message.content
    && prev.message.status === next.message.status;
});
