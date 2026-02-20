import { useState } from 'react';
import { useAgentsStore } from '../../stores/agents';
import ConfirmDialog from '../shared/ConfirmDialog';

interface Props {
  agentId: string;
}

export default function DangerZone({ agentId }: Props) {
  const { deleteAgent } = useAgentsStore();
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (confirmAction === 'delete-agent') {
      setIsDeleting(true);
      setDeleteError(null);
      try {
        await deleteAgent(agentId);
        // Store already navigates to next agent on success
      } catch (err: unknown) {
        setDeleteError(err instanceof Error ? err.message : 'Failed to delete agent');
        setIsDeleting(false);
      }
    } else {
      // TODO: Implement other actions
      console.log(`Action: ${confirmAction} for agent ${agentId}`);
    }
    setConfirmAction(null);
  };

  return (
    <div className="p-4">
      <h3 className="text-xs font-semibold text-[#e74a3b] uppercase tracking-wider mb-3">
        Danger Zone
      </h3>

      <div className="space-y-2">
        <button
          onClick={() => setConfirmAction('reset-sessions')}
          className="w-full px-3 py-2 text-xs text-left text-[#e74a3b] border border-[#e74a3b]/30 rounded-lg hover:bg-[#e74a3b]/10"
        >
          Reset All Sessions
        </button>
        <button
          onClick={() => setConfirmAction('clear-memory')}
          className="w-full px-3 py-2 text-xs text-left text-[#e74a3b] border border-[#e74a3b]/30 rounded-lg hover:bg-[#e74a3b]/10"
        >
          Clear Memory
        </button>

        <div className="border-t border-[#e74a3b]/20 pt-2 mt-2">
          <button
            onClick={() => { setDeleteError(null); setConfirmAction('delete-agent'); }}
            disabled={isDeleting}
            className="w-full px-3 py-2 text-xs text-left font-semibold text-white bg-[#e74a3b]/20 border border-[#e74a3b]/50 rounded-lg hover:bg-[#e74a3b]/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isDeleting ? '⏳ Deleting...' : '🗑 Delete Agent'}
          </button>

          {deleteError && (
            <p className="mt-2 text-xs text-[#e74a3b] bg-[#e74a3b]/10 px-3 py-2 rounded-lg">
              ⚠ {deleteError}
            </p>
          )}
        </div>
      </div>

      {confirmAction === 'delete-agent' && (
        <ConfirmDialog
          title={`Delete agent "${agentId}"?`}
          message={`This will permanently remove the agent's configuration and workspace state using "openclaw agents delete ${agentId} --force". This cannot be undone.`}
          confirmLabel="Yes, Delete"
          cancelLabel="Cancel"
          danger
          onConfirm={handleConfirm}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {confirmAction && confirmAction !== 'delete-agent' && (
        <ConfirmDialog
          title={`Confirm: ${confirmAction}`}
          message={`Are you sure you want to ${confirmAction} for agent "${agentId}"? This cannot be undone.`}
          danger
          onConfirm={handleConfirm}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}
