import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Task {
  id: string;
  name: string;
  userNotes: string;
  agentMessage: string;
  createdAt: number;
}

export interface Backlog {
  id: string;
  name: string;
  tasks: Task[];
  createdAt: number;
}

interface BacklogState {
  backlogs: Backlog[];
  activeBacklogId: string | null;
  setActiveBacklog: (id: string | null) => void;
  createBacklog: (name: string) => void;
  updateBacklogName: (id: string, name: string) => void;
  deleteBacklog: (id: string) => void;
  addTask: (backlogId: string, task: { name: string; userNotes: string; agentMessage: string }) => void;
  updateTask: (backlogId: string, taskId: string, updates: Partial<Task>) => void;
  deleteTask: (backlogId: string, taskId: string) => void;
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export const useBacklogStore = create<BacklogState>()(
  persist(
    (set, get) => ({
      backlogs: [],
      activeBacklogId: null,

      setActiveBacklog: (id) => set({ activeBacklogId: id }),

      createBacklog: (name) => {
        const newBacklog: Backlog = {
          id: generateId(),
          name,
          tasks: [],
          createdAt: Date.now(),
        };
        set((state) => ({
          backlogs: [...state.backlogs, newBacklog],
          activeBacklogId: newBacklog.id,
        }));
      },

      updateBacklogName: (id, name) => set((state) => ({
        backlogs: state.backlogs.map((b) =>
          b.id === id ? { ...b, name } : b
        ),
      })),

      deleteBacklog: (id) => set((state) => {
        const backlog = state.backlogs.find((b) => b.id === id);
        if (backlog && backlog.tasks.length > 0) {
          // Prevent deletion if not empty (UI should also enforce this)
          return state;
        }
        return {
          backlogs: state.backlogs.filter((b) => b.id !== id),
          activeBacklogId: state.activeBacklogId === id ? null : state.activeBacklogId,
        };
      }),

      addTask: (backlogId, task) => set((state) => ({
        backlogs: state.backlogs.map((b) =>
          b.id === backlogId
            ? {
                ...b,
                tasks: [
                  ...b.tasks,
                  {
                    id: generateId(),
                    ...task,
                    createdAt: Date.now(),
                  },
                ],
              }
            : b
        ),
      })),

      updateTask: (backlogId, taskId, updates) => set((state) => ({
        backlogs: state.backlogs.map((b) =>
          b.id === backlogId
            ? {
                ...b,
                tasks: b.tasks.map((t) =>
                  t.id === taskId ? { ...t, ...updates } : t
                ),
              }
            : b
        ),
      })),

      deleteTask: (backlogId, taskId) => set((state) => ({
        backlogs: state.backlogs.map((b) =>
          b.id === backlogId
            ? {
                ...b,
                tasks: b.tasks.filter((t) => t.id !== taskId),
              }
            : b
        ),
      })),
    }),
    {
      name: 'clawchat-backlog',
    }
  )
);
