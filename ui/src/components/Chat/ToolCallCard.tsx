import { memo, useState } from 'react';
import type { ToolCall } from '../../stores/chat';

interface Props {
  toolCall: ToolCall;
}

function ToolCallCard({ toolCall }: Props) {
  const [expanded, setExpanded] = useState(false);

  const statusIcon =
    toolCall.status === 'running' ? '⏳' :
    toolCall.status === 'completed' ? '✓' : '✗';

  const statusColor =
    toolCall.status === 'running' ? 'text-[#f6c23e]' :
    toolCall.status === 'completed' ? 'text-[#00d97e]' : 'text-[#e74a3b]';

  return (
    <div className="mt-2 border border-[#2a2a4a] rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 flex items-center gap-2 text-xs hover:bg-[#2a2a4a]/30 transition-colors"
      >
        <span className={statusColor}>{statusIcon}</span>
        <span className="font-mono text-[#e94560]">{toolCall.name}</span>
        {toolCall.duration && (
          <span className="text-[#6c757d] ml-auto">{(toolCall.duration / 1000).toFixed(1)}s</span>
        )}
        <span className="text-[#6c757d]">{expanded ? '▾' : '▸'}</span>
      </button>

      {expanded && (
        <div className="px-3 py-2 border-t border-[#2a2a4a] bg-[#0d1117]/50">
          {toolCall.args && (
            <div className="mb-2">
              <span className="text-[#6c757d] text-xs">Args:</span>
              <pre className="text-xs text-[#e0e0e0] mt-1 overflow-x-auto font-mono whitespace-pre-wrap break-all">
                {toolCall.args}
              </pre>
            </div>
          )}
          {toolCall.result && (
            <div>
              <span className="text-[#6c757d] text-xs">Result:</span>
              <pre className="text-xs text-[#e0e0e0] mt-1 overflow-x-auto font-mono whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
                {toolCall.result}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default memo(ToolCallCard);
