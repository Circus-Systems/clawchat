import { useConnectionStore } from '../../stores/connection';

const statusConfig = {
  connected: { color: 'bg-[#00d97e]', text: 'Connected' },
  connecting: { color: 'bg-[#f6c23e]', text: 'Connecting...' },
  reconnecting: { color: 'bg-[#f6c23e]', text: 'Reconnecting...' },
  disconnected: { color: 'bg-[#e74a3b]', text: 'Disconnected' },
};

export default function ConnectionBar() {
  const { status } = useConnectionStore();
  const config = statusConfig[status];

  if (status === 'connected') return null;

  return (
    <div className="h-8 flex items-center justify-center gap-2 bg-[#16213e] border-b border-[#2a2a4a] text-sm">
      <span className={`w-2 h-2 rounded-full ${config.color} animate-pulse`} />
      <span className="text-[#6c757d]">{config.text}</span>
    </div>
  );
}
