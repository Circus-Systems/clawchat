import { useEffect, useState } from 'react';

interface Props {
  message: string;
  type?: 'success' | 'error' | 'warning';
  duration?: number;
  onDismiss: () => void;
}

const typeStyles = {
  success: 'bg-[#00d97e]/20 border-[#00d97e] text-[#00d97e]',
  error: 'bg-[#e74a3b]/20 border-[#e74a3b] text-[#e74a3b]',
  warning: 'bg-[#f6c23e]/20 border-[#f6c23e] text-[#f6c23e]',
};

export default function Toast({ message, type = 'success', duration = 3000, onDismiss }: Props) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  return (
    <div
      className={`fixed bottom-4 right-4 px-4 py-2 rounded-lg border text-sm font-medium z-50 transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      } ${typeStyles[type]}`}
    >
      {message}
    </div>
  );
}
