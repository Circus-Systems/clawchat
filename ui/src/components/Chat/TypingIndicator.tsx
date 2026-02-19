interface Props {
  agentName: string;
}

export default function TypingIndicator({ agentName }: Props) {
  return (
    <div className="px-4 py-2 flex items-center gap-2 text-xs text-[#6c757d]">
      <span>🦞</span>
      <span className="capitalize">{agentName.replace(/-/g, ' ')}</span>
      <span>is typing</span>
      <span className="flex gap-0.5">
        <span className="w-1 h-1 bg-[#6c757d] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1 h-1 bg-[#6c757d] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1 h-1 bg-[#6c757d] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </span>
    </div>
  );
}
