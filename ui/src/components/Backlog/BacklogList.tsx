import { useState } from 'react';
import { useBacklogStore } from '../../stores/backlog';

export default function BacklogList() {
  const { backlogs, activeBacklogId, setActiveBacklog, createBacklog, deleteBacklog, updateBacklogName } = useBacklogStore();
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      createBacklog(newName.trim());
      setNewName('');
      setIsCreating(false);
    }
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId && editName.trim()) {
      updateBacklogName(editingId, editName.trim());
      setEditingId(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-1">
      {backlogs.map(b => (
        <div
          key={b.id}
          className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-sm ${
            b.id === activeBacklogId ? 'bg-[#e94560]/15 text-[#e0e0e0]' : 'text-[#6c757d] hover:bg-[#1a1a2e]'
          }`}
          onClick={() => setActiveBacklog(b.id)}
        >
          {editingId === b.id ? (
            <form onSubmit={handleUpdate} className="flex-1">
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="w-full bg-[#0d1117] px-2 py-1 rounded border border-[#2a2a4a] text-[#e0e0e0] focus:outline-none focus:border-[#e94560]"
                autoFocus
                onBlur={() => setEditingId(null)}
                onClick={e => e.stopPropagation()}
              />
            </form>
          ) : (
            <>
              <span className="truncate flex-1">{b.name}</span>
              <div className="hidden group-hover:flex items-center gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); setEditingId(b.id); setEditName(b.name); }}
                  className="p-1 hover:text-[#e0e0e0]"
                  title="Rename"
                >
                  ✎
                </button>
                {b.tasks.length === 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteBacklog(b.id); }}
                    className="p-1 hover:text-[#e74a3b]"
                    title="Delete (Empty only)"
                  >
                    ×
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      ))}

      {isCreating ? (
        <form onSubmit={handleCreate} className="px-2 py-1">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="New Backlog Name"
            className="w-full bg-[#0d1117] px-2 py-1.5 rounded border border-[#2a2a4a] text-sm text-[#e0e0e0] focus:outline-none focus:border-[#e94560]"
            autoFocus
            onBlur={() => setIsCreating(false)}
          />
        </form>
      ) : (
        <button
          onClick={() => setIsCreating(true)}
          className="w-full mt-2 px-3 py-2 text-sm text-[#6c757d] hover:text-[#e0e0e0] border border-dashed border-[#2a2a4a] rounded-lg hover:border-[#e94560] hover:bg-[#e94560]/10 transition-colors"
        >
          + Create Backlog
        </button>
      )}
    </div>
  );
}
