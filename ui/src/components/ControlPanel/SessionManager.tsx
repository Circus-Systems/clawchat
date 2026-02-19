import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/auth';

interface SessionInfo {
  key: string;
  messageCount: number;
  lastActive: string;
}

interface Props {
  agentId: string;
}

export default function SessionManager({ agentId }: Props) {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch(`/api/agents/${agentId}/sessions`);
        if (res.ok) {
          const data = await res.json();
          setSessions(data.sessions || []);
        }
      } catch {}
    })();
  }, [agentId]);

  return (
    <div className="p-4">
      <h3 className="text-xs font-semibold text-[#6c757d] uppercase tracking-wider mb-3">
        Sessions
      </h3>

      {sessions.length === 0 ? (
        <p className="text-xs text-[#6c757d]">No sessions found</p>
      ) : (
        <div className="space-y-1">
          {sessions.map((s) => (
            <div
              key={s.key}
              className="flex items-center justify-between px-2 py-1.5 text-sm rounded-lg hover:bg-[#1a1a2e]"
            >
              <span className="font-mono text-xs truncate">{s.key}</span>
              <span className="text-xs text-[#6c757d]">{s.messageCount} msgs</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
