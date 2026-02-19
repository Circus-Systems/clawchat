import { useState } from 'react';
import ConfirmDialog from '../shared/ConfirmDialog';

interface Props {
  agentId: string;
}

export default function DangerZone({ agentId }: Props) {
  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  const handleConfirm = () => {
    // TODO: Implement actions
    console.log(`Action: ${confirmAction} for agent ${agentId}`);
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
      </div>

      {confirmAction && (
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
