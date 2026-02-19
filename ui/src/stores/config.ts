import { create } from 'zustand';
import { apiFetch } from '../lib/auth';

export interface FileState {
  name: string;
  content: string;
  modified: string;
  size: number;
  location: string;
  loading?: boolean;
}

interface ConfigState {
  config: Record<string, unknown> | null;
  agentFiles: Record<string, FileState[]>; // keyed by agentId
  editingFile: {
    agentId: string;
    filename: string;
    content: string;
    originalContent: string;
    modified: string;
  } | null;
  hasUnsavedChanges: boolean;
  monitoring: boolean; // post-save error monitoring

  fetchConfig: () => Promise<void>;
  fetchAgentFiles: (agentId: string) => Promise<void>;
  openFileEditor: (agentId: string, filename: string) => Promise<void>;
  updateEditingContent: (content: string) => void;
  saveFile: () => Promise<{ success: boolean; error?: string }>;
  closeFileEditor: () => void;
  patchConfig: (patch: Record<string, unknown>) => Promise<void>;
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  config: null,
  agentFiles: {},
  editingFile: null,
  hasUnsavedChanges: false,
  monitoring: false,

  fetchConfig: async () => {
    try {
      const res = await apiFetch('/api/config');
      if (res.ok) {
        const data = await res.json();
        set({ config: data.config });
      }
    } catch {}
  },

  fetchAgentFiles: async (agentId: string) => {
    try {
      const res = await apiFetch(`/api/agents/${agentId}/files`);
      if (!res.ok) return;
      const data = await res.json();
      set(state => ({
        agentFiles: { ...state.agentFiles, [agentId]: data.files },
      }));
    } catch {}
  },

  openFileEditor: async (agentId: string, filename: string) => {
    try {
      const res = await apiFetch(`/api/agents/${agentId}/files/${filename}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      set({
        editingFile: {
          agentId,
          filename,
          content: data.content,
          originalContent: data.content,
          modified: data.modified,
        },
        hasUnsavedChanges: false,
      });
    } catch (err) {
      console.error('Failed to open file:', err);
    }
  },

  updateEditingContent: (content: string) => {
    set(state => ({
      editingFile: state.editingFile ? { ...state.editingFile, content } : null,
      hasUnsavedChanges: state.editingFile ? content !== state.editingFile.originalContent : false,
    }));
  },

  saveFile: async () => {
    const { editingFile } = get();
    if (!editingFile) return { success: false, error: 'No file open' };

    try {
      const res = await apiFetch(
        `/api/agents/${editingFile.agentId}/files/${editingFile.filename}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            content: editingFile.content,
            expectedModified: editingFile.modified,
          }),
        }
      );

      if (res.status === 409) {
        return { success: false, error: 'File was modified externally. Reload or overwrite?' };
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return { success: false, error: data.error || `HTTP ${res.status}` };
      }

      const data = await res.json();
      set(state => ({
        editingFile: state.editingFile
          ? { ...state.editingFile, modified: data.modified, originalContent: state.editingFile.content }
          : null,
        hasUnsavedChanges: false,
        monitoring: true,
      }));

      // Clear monitoring after 5 seconds
      setTimeout(() => set({ monitoring: false }), 5000);

      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Save failed' };
    }
  },

  closeFileEditor: () => {
    set({ editingFile: null, hasUnsavedChanges: false });
  },

  patchConfig: async (patch: Record<string, unknown>) => {
    try {
      await apiFetch('/api/config', {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      // Refresh config
      get().fetchConfig();
    } catch (err) {
      console.error('Config patch failed:', err);
    }
  },
}));
