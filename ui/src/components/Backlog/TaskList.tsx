import { useState } from 'react';
import { useBacklogStore } from '../../stores/backlog';
import TaskItem from './TaskItem';

export default function TaskList() {
  const { backlogs, activeBacklogId, addTask, updateTask, deleteTask } = useBacklogStore();
  const backlog = backlogs.find(b => b.id === activeBacklogId);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');

  if (!backlog) {
    return (
      <div className="flex-1 flex items-center justify-center text-[#6c757d]">
        <div className="text-center">
          <p className="mb-2">No backlog selected</p>
          <p className="text-xs">Create or select a backlog to manage tasks</p>
        </div>
      </div>
    );
  }

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      addTask(backlog.id, {
        name: newName.trim(),
        userNotes: '',
        agentMessage: ''
      });
      setNewName('');
      setIsAdding(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-[#e0e0e0]">{backlog.name}</h2>
        <span className="text-xs text-[#6c757d]">{backlog.tasks.length} tasks</span>
      </div>

      <div className="space-y-3">
        {backlog.tasks.map(task => (
          <TaskItem
            key={task.id}
            task={task}
            onUpdate={(updates) => updateTask(backlog.id, task.id, updates)}
            onDelete={() => deleteTask(backlog.id, task.id)}
          />
        ))}

        {isAdding ? (
          <form onSubmit={handleAdd} className="bg-[#1e1e3a] p-4 rounded-xl border border-[#2a2a4a]">
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Task Name"
              className="w-full bg-[#0d1117] px-3 py-2 rounded border border-[#2a2a4a] text-sm text-[#e0e0e0] focus:outline-none focus:border-[#e94560] mb-2"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setIsAdding(false)} className="px-3 py-1.5 text-xs text-[#6c757d]">Cancel</button>
              <button type="submit" className="px-3 py-1.5 text-xs bg-[#e94560] text-white rounded">Add Task</button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full py-3 border-2 border-dashed border-[#2a2a4a] rounded-xl text-[#6c757d] hover:border-[#e94560] hover:text-[#e0e0e0] hover:bg-[#e94560]/5 transition-all text-sm font-medium"
          >
            + Add New Task
          </button>
        )}
      </div>
    </div>
  );
}
