import { memo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import type { ChatMessage } from '../../stores/chat';
import ToolCallCard from './ToolCallCard';

interface Props {
  message: ChatMessage;
}

function MessageBubble({ message }: Props) {
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
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-[#e0e0e0]">
            {isUser ? '🧑 You' : '🦞 Agent'}
          </span>
          <span className="text-xs text-[#6c757d]">{time}</span>
          {statusIcon && (
            <span className={`text-xs ${message.status === 'read' ? 'text-[#00d97e]' : 'text-[#6c757d]'}`}>
              {statusIcon}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="prose prose-invert prose-sm max-w-none text-[#e0e0e0] [&_pre]:bg-[#0d1117] [&_pre]:rounded-lg [&_code]:text-[#e94560] [&_code]:bg-[#0d1117]/50 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_pre_code]:bg-transparent [&_pre_code]:px-0 [&_pre_code]:py-0 [&_a]:text-[#e94560]">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
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
