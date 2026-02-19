import { useConfigStore, type FileState } from '../../stores/config';

const EMPTY_FILES: FileState[] = [];

interface Props {
  agentId: string;
}

const FILE_ICONS: Record<string, string> = {
  'IDENTITY.md': '🪪',
  'AGENT.md': '🤖',
  'AGENTS.md': '🤖',
  'SOUL.md': '✨',
  'MEMORY.md': '🧠',
  'HEARTBEAT.md': '💓',
  'SKILLS.md': '🛠',
  'TOOLS.md': '🔧',
  'USER.md': '👤',
};

export default function IdentityFiles({ agentId }: Props) {
  const { agentFiles, openFileEditor } = useConfigStore();
  const files = agentFiles[agentId] ?? EMPTY_FILES;

  return (
    <div className="p-4">
      <h3 className="text-xs font-semibold text-[#6c757d] uppercase tracking-wider mb-3">
        Identity Files
      </h3>

      {files.length === 0 ? (
        <p className="text-xs text-[#6c757d]">No files found</p>
      ) : (
        <div className="space-y-1">
          {files.map((file) => (
            <button
              key={file.name}
              onClick={() => openFileEditor(agentId, file.name)}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-lg hover:bg-[#1a1a2e] transition-colors group"
            >
              <span className="text-base">{FILE_ICONS[file.name] || '📄'}</span>
              <span className="text-[#e0e0e0] flex-1 text-left truncate">{file.name}</span>
              <span className="text-xs text-[#6c757d] opacity-0 group-hover:opacity-100 transition-opacity">
                Edit
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
