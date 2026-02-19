import { useState, useCallback } from 'react';
import { useConfigStore } from '../../stores/config';
import Toast from '../shared/Toast';

export default function FileEditor() {
  const { editingFile, hasUnsavedChanges, monitoring, updateEditingContent, saveFile, closeFileEditor } = useConfigStore();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    setSaving(true);
    const result = await saveFile();
    setSaving(false);

    if (result.success) {
      setToast({ message: `${editingFile?.filename} saved.`, type: 'success' });
    } else {
      setToast({ message: result.error || 'Save failed', type: 'error' });
    }
  }, [saveFile, editingFile]);

  if (!editingFile) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a4a]">
        <div className="flex items-center gap-2">
          <span>📄</span>
          <span className="text-sm font-semibold">{editingFile.filename}</span>
          {hasUnsavedChanges && (
            <span className="w-2 h-2 rounded-full bg-[#f6c23e]" title="Unsaved changes" />
          )}
        </div>
        <button
          onClick={closeFileEditor}
          className="text-[#6c757d] hover:text-[#e0e0e0]"
        >
          ×
        </button>
      </div>

      {monitoring && (
        <div className="px-4 py-2 bg-[#f6c23e]/10 border-b border-[#f6c23e]/30 text-xs text-[#f6c23e]">
          ⏳ Monitoring for errors...
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 min-h-0">
        <textarea
          value={editingFile.content}
          onChange={(e) => updateEditingContent(e.target.value)}
          className="w-full h-full p-4 bg-[#0d1117] text-[#e0e0e0] font-mono text-sm resize-none focus:outline-none"
          spellCheck={false}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-[#2a2a4a]">
        <span className="text-xs text-[#6c757d]">
          Last saved: {new Date(editingFile.modified).toLocaleString()}
        </span>
        <div className="flex gap-2">
          <button
            onClick={closeFileEditor}
            className="px-3 py-1.5 text-xs text-[#6c757d] hover:text-[#e0e0e0] border border-[#2a2a4a] rounded-lg"
          >
            Discard
          </button>
          <button
            onClick={handleSave}
            disabled={!hasUnsavedChanges || saving}
            className={`px-3 py-1.5 text-xs text-white rounded-lg transition-colors ${
              hasUnsavedChanges
                ? 'bg-[#f6c23e] hover:bg-[#e5b22e] text-[#1a1a2e]'
                : 'bg-[#e94560] opacity-50 cursor-not-allowed'
            }`}
          >
            {saving ? 'Saving...' : 'Save to File'}
          </button>
        </div>
      </div>

      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      )}
    </div>
  );
}
