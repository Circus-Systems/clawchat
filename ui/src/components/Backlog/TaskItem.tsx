import { useState } from 'react';
import type { Task } from '../../stores/backlog';

interface Props {
  task: Task;
  onUpdate: (updates: Partial<Task>) => void;
  onDelete: () => void;
}

export default function TaskItem({ task, onUpdate, onDelete }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(task.name);
  const [notes, setNotes] = useState(task.userNotes);
  const [agentMsg, setAgentMsg] = useState(task.agentMessage);

  const handleSave = () => {
    onUpdate({ name, userNotes: notes, agentMessage: agentMsg });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setName(task.name);
    setNotes(task.userNotes);
    setAgentMsg(task.agentMessage);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="bg-[#1e1e3a] p-4 rounded-xl border border-[#2a2a4a] space-y-3">
        <div>
          <label className="block text-xs text-[#6c757d] mb-1">Task Name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full bg-[#0d1117] px-3 py-2 rounded border border-[#2a2a4a] text-sm text-[#e0e0e0] focus:outline-none focus:border-[#e94560]"
          />
        </div>
        <div>
          <label className="block text-xs text-[#6c757d] mb-1">User Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            className="w-full bg-[#0d1117] px-3 py-2 rounded border border-[#2a2a4a] text-sm text-[#e0e0e0] focus:outline-none focus:border-[#e94560] resize-none"
          />
        </div>
        <div>
          <label className="block text-xs text-[#6c757d] mb-1">Agent Message</label>
          <textarea
            value={agentMsg}
            onChange={e => setAgentMsg(e.target.value)}
            rows={2}
            className="w-full bg-[#0d1117] px-3 py-2 rounded border border-[#2a2a4a] text-sm text-[#e0e0e0] focus:outline-none focus:border-[#e94560] resize-none font-mono text-xs"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={handleCancel} className="px-3 py-1.5 text-xs text-[#6c757d] hover:text-[#e0e0e0]">Cancel</button>
          <button onClick={handleSave} className="px-3 py-1.5 text-xs bg-[#e94560] text-white rounded hover:bg-[#d13a52]">Save</button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#1e1e3a] p-4 rounded-xl border border-[#2a2a4a] group">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-[#e0e0e0]">{task.name}</h3>
        <div className="hidden group-hover:flex gap-2">
          <button onClick={() => setIsEditing(true)} className="text-[#6c757d] hover:text-[#e0e0e0]">✎</button>
          <button onClick={onDelete} className="text-[#6c757d] hover:text-[#e74a3b]">×</button>
        </div>
      </div>
      
      {task.userNotes && (
        <div className="mb-2">
          <div className="text-[10px] uppercase tracking-wider text-[#6c757d] mb-0.5">Notes</div>
          <p className="text-sm text-[#b0b0b0] whitespace-pre-wrap">{task.userNotes}</p>
        </div>
      )}
      
      {task.agentMessage && (
        <div className="bg-[#0d1117]/50 p-2 rounded border border-[#2a2a4a]/50">
          <div className="text-[10px] uppercase tracking-wider text-[#6c757d] mb-0.5">Agent Message</div>
          <p className="text-xs font-mono text-[#e0e0e0] whitespace-pre-wrap">{task.agentMessage}</p>
        </div>
      )}
    </div>
  );
}
