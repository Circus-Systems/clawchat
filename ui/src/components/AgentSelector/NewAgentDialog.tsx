import { useState } from 'react';
import { apiFetch } from '../../lib/auth';
import { useAgentsStore } from '../../stores/agents';

interface Props {
  onClose: () => void;
}

const AVAILABLE_MODELS = [
  'google/gemini-3-pro-preview',
  'google/gemini-2.5-pro',
  'google/gemini-flash-latest',
  'anthropic/claude-opus-4-6',
  'anthropic/claude-sonnet-4-6',
  'anthropic/claude-haiku-4-5',
];

export default function NewAgentDialog({ onClose }: Props) {
  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const [model, setModel] = useState('anthropic/claude-opus-4-6');
  const [subagentModel, setSubagentModel] = useState('anthropic/claude-sonnet-4-6');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const { fetchAgents, setActiveAgent } = useAgentsStore();

  const autoId = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const handleCreate = async () => {
    const agentId = id || autoId;
    if (!agentId) {
      setError('Agent ID is required');
      return;
    }
    if (!/^[a-z0-9][a-z0-9-]*$/.test(agentId)) {
      setError('ID must be lowercase alphanumeric with hyphens');
      return;
    }

    setCreating(true);
    try {
      const res = await apiFetch('/api/agents', {
        method: 'POST',
        body: JSON.stringify({ name: name || agentId, id: agentId, model, subagentModel }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      await fetchAgents();
      setActiveAgent(agentId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create agent');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#16213e] rounded-xl p-6 w-[28rem] border border-[#2a2a4a] shadow-2xl">
        <h2 className="text-lg font-bold mb-4">Create New Agent</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-[#6c757d] mb-1">Agent Name</label>
            <input
              value={name}
              onChange={(e) => { setName(e.target.value); if (!id) setId(''); }}
              placeholder='e.g. "Research Assistant"'
              className="w-full px-3 py-2 bg-[#1a1a2e] border border-[#2a2a4a] rounded-lg text-sm text-[#e0e0e0] placeholder-[#6c757d] focus:outline-none focus:border-[#e94560]"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs text-[#6c757d] mb-1">Agent ID (auto-generated)</label>
            <input
              value={id || autoId}
              onChange={(e) => setId(e.target.value)}
              placeholder="research-assistant"
              className="w-full px-3 py-2 bg-[#1a1a2e] border border-[#2a2a4a] rounded-lg text-sm text-[#e0e0e0] font-mono placeholder-[#6c757d] focus:outline-none focus:border-[#e94560]"
            />
          </div>

          <div>
            <label className="block text-xs text-[#6c757d] mb-1">Primary Model</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-2 bg-[#1a1a2e] border border-[#2a2a4a] rounded-lg text-sm text-[#e0e0e0] font-mono focus:outline-none focus:border-[#e94560]"
            >
              {AVAILABLE_MODELS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-[#6c757d] mb-1">Sub-Agent Model</label>
            <select
              value={subagentModel}
              onChange={(e) => setSubagentModel(e.target.value)}
              className="w-full px-3 py-2 bg-[#1a1a2e] border border-[#2a2a4a] rounded-lg text-sm text-[#e0e0e0] font-mono focus:outline-none focus:border-[#e94560]"
            >
              {AVAILABLE_MODELS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {error && <p className="text-[#e74a3b] text-sm">{error}</p>}
        </div>

        <div className="flex gap-3 justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-[#6c757d] hover:text-[#e0e0e0] border border-[#2a2a4a] rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="px-4 py-2 text-sm text-white bg-[#e94560] rounded-lg hover:bg-[#d13a52] disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create Agent'}
          </button>
        </div>
      </div>
    </div>
  );
}
