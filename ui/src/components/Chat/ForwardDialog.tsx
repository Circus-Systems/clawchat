import { useState } from 'react';
import { useAgentsStore } from '../../stores/agents';
import { useChatStore } from '../../stores/chat';

interface Props {
  content: string;
  onClose: () => void;
  currentAgentId?: string;
}

export default function ForwardDialog({ content, onClose, currentAgentId }: Props) {
  const { agents } = useAgentsStore();
  const { sendMessage } = useChatStore();
  // Default to first agent that isn't the current one, or just the first one
  const defaultAgent = agents.find(a => a.id !== currentAgentId) || agents[0];
  const [targetId, setTargetId] = useState(defaultAgent?.id || '');
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!targetId) return;
    setSending(true);
    try {
      // Format: Comment + Quote of original
      const fullMessage = `${comment.trim()}\n\n> ${content.split('\n').join('\n> ')}`;
      const sessionKey = `agent:${targetId}:main`;
      
      await sendMessage(targetId, sessionKey, fullMessage);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const getModelName = (model: unknown) => {
    const raw = (model && typeof model === 'object' && 'primary' in model) 
      ? (model as { primary: string }).primary 
      : model;
    return String(raw || 'default').split('/').pop();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#16213e] rounded-xl p-6 w-[32rem] border border-[#2a2a4a] shadow-2xl">
        <h2 className="text-lg font-bold mb-4">Forward Message</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-[#6c757d] mb-1">To Agent</label>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="w-full px-3 py-2 bg-[#1a1a2e] border border-[#2a2a4a] rounded-lg text-sm text-[#e0e0e0] font-mono focus:outline-none focus:border-[#e94560]"
            >
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.id} ({getModelName(a.model)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-[#6c757d] mb-1">Add Comment</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="e.g. Please handle this request..."
              rows={3}
              className="w-full px-3 py-2 bg-[#1a1a2e] border border-[#2a2a4a] rounded-lg text-sm text-[#e0e0e0] placeholder-[#6c757d] focus:outline-none focus:border-[#e94560] resize-none"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs text-[#6c757d] mb-1">Original Message</label>
            <div className="bg-[#1a1a2e]/50 p-3 rounded-lg border border-[#2a2a4a] text-xs text-[#6c757d] max-h-32 overflow-y-auto italic whitespace-pre-wrap">
              {content}
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-[#6c757d] hover:text-[#e0e0e0] border border-[#2a2a4a] rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !targetId}
            className="px-4 py-2 text-sm text-white bg-[#e94560] rounded-lg hover:bg-[#d13a52] disabled:opacity-50"
          >
            {sending ? 'Sending...' : 'Forward'}
          </button>
        </div>
      </div>
    </div>
  );
}
