import { useState } from 'react';
import { useBacklogStore } from '../../stores/backlog';

interface Props {
  content: string;
  onClose: () => void;
}

export default function AddToBacklogDialog({ content, onClose }: Props) {
  const { backlogs, addTask } = useBacklogStore();
  const [backlogId, setBacklogId] = useState(backlogs[0]?.id || '');
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');

  const handleSave = () => {
    if (!backlogId || !name.trim()) return;
    
    addTask(backlogId, {
      name: name.trim(),
      userNotes: notes.trim(),
      agentMessage: content
    });
    onClose();
  };

  if (backlogs.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
        <div className="bg-[#16213e] rounded-xl p-6 w-[28rem] border border-[#2a2a4a] shadow-2xl text-center">
          <h2 className="text-lg font-bold mb-2 text-[#e0e0e0]">No Backlogs Found</h2>
          <p className="text-sm text-[#6c757d] mb-4">Please create a backlog in the Backlog view first.</p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-white bg-[#e94560] rounded-lg hover:bg-[#d13a52]"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#16213e] rounded-xl p-6 w-[32rem] border border-[#2a2a4a] shadow-2xl">
        <h2 className="text-lg font-bold mb-4">Add to Backlog</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-[#6c757d] mb-1">Select Backlog</label>
            <select
              value={backlogId}
              onChange={(e) => setBacklogId(e.target.value)}
              className="w-full px-3 py-2 bg-[#1a1a2e] border border-[#2a2a4a] rounded-lg text-sm text-[#e0e0e0] focus:outline-none focus:border-[#e94560]"
            >
              {backlogs.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-[#6c757d] mb-1">Task Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Update API implementation"
              className="w-full px-3 py-2 bg-[#1a1a2e] border border-[#2a2a4a] rounded-lg text-sm text-[#e0e0e0] placeholder-[#6c757d] focus:outline-none focus:border-[#e94560]"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs text-[#6c757d] mb-1">User Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              rows={2}
              className="w-full px-3 py-2 bg-[#1a1a2e] border border-[#2a2a4a] rounded-lg text-sm text-[#e0e0e0] placeholder-[#6c757d] focus:outline-none focus:border-[#e94560] resize-none"
            />
          </div>

          <div>
            <label className="block text-xs text-[#6c757d] mb-1">Agent Message (Preview)</label>
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
            onClick={handleSave}
            disabled={!name.trim() || !backlogId}
            className="px-4 py-2 text-sm text-white bg-[#e94560] rounded-lg hover:bg-[#d13a52] disabled:opacity-50"
          >
            Save Task
          </button>
        </div>
      </div>
    </div>
  );
}
