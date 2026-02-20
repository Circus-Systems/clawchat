import BacklogList from './BacklogList';
import TaskList from './TaskList';

interface Props {
  onBack: () => void;
}

export default function BacklogPanel({ onBack }: Props) {
  return (
    <div className="flex h-full w-full bg-[#1a1a2e]">
      {/* Sidebar */}
      <div className="w-64 border-r border-[#2a2a4a] bg-[#16213e] flex flex-col">
        <div className="h-12 flex items-center px-4 border-b border-[#2a2a4a] flex-shrink-0">
          <button onClick={onBack} className="text-[#6c757d] hover:text-[#e0e0e0] mr-3 text-lg font-bold">
            ‹
          </button>
          <span className="font-bold text-sm text-[#e0e0e0]">Backlogs</span>
        </div>
        <BacklogList />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <TaskList />
      </div>
    </div>
  );
}
