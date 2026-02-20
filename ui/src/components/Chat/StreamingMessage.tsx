import { memo, useRef, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { StreamState } from '../../stores/chat';
import { STREAM_FLUSH_INTERVAL } from '../../lib/constants';
import ToolCallCard from './ToolCallCard';

interface Props {
  stream: StreamState;
}

interface CodeProps {
  node?: any;
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
  [key: string]: any;
}

function StreamingMessage({ stream }: Props) {
  const [displayText, setDisplayText] = useState('');
  const lastTextRef = useRef('');
  const rafRef = useRef<number | null>(null);

  // Throttled flush of stream text
  useEffect(() => {
    const interval = setInterval(() => {
      if (stream.text !== lastTextRef.current) {
        lastTextRef.current = stream.text;
        setDisplayText(stream.text);
      }
    }, STREAM_FLUSH_INTERVAL);

    return () => clearInterval(interval);
  }, [stream.text]);

  // Immediate sync on mount and when text actually changes
  useEffect(() => {
    setDisplayText(stream.text);
    lastTextRef.current = stream.text;
  }, []);

  return (
    <div className="py-1.5">
      <div className="rounded-xl px-4 py-3 max-w-[85%] bg-[#1e1e3a]">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-[#e0e0e0]">🦞 Agent</span>
          <span className="text-xs text-[#6c757d]">typing...</span>
        </div>

        {displayText && (
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
              {displayText}
            </ReactMarkdown>
          </div>
        )}

        {/* Tool calls */}
        {stream.toolCalls.map((tc) => (
          <ToolCallCard key={tc.id} toolCall={tc} />
        ))}

        {/* Cursor blink */}
        {!displayText && stream.toolCalls.length === 0 && (
          <span className="inline-block w-2 h-4 bg-[#e94560] animate-pulse rounded-sm" />
        )}
      </div>
    </div>
  );
}

export default memo(StreamingMessage);
