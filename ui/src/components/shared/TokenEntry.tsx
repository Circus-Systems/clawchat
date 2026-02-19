import { useState } from 'react';
import { setStoredToken } from '../../lib/auth';

interface Props {
  onTokenSet: () => void;
}

export default function TokenEntry({ onTokenSet }: Props) {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      setError('Token is required');
      return;
    }

    // Test the token
    try {
      const res = await fetch('/api/health', {
        headers: { Authorization: `Bearer ${token.trim()}` },
      });
      if (res.ok) {
        setStoredToken(token.trim());
        onTokenSet();
      } else {
        setError('Invalid token');
      }
    } catch {
      setError('Cannot reach ClawChat proxy');
    }
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-[#1a1a2e]">
      <form
        onSubmit={handleSubmit}
        className="bg-[#16213e] rounded-xl p-8 w-96 border border-[#2a2a4a] shadow-2xl"
      >
        <div className="text-center mb-6">
          <span className="text-4xl">🦞</span>
          <h1 className="text-2xl font-bold mt-2 text-[#e0e0e0]" style={{ fontFamily: 'DM Sans' }}>
            ClawChat
          </h1>
          <p className="text-[#6c757d] text-sm mt-1">Enter your UI token to continue</p>
        </div>

        <input
          type="password"
          value={token}
          onChange={(e) => { setToken(e.target.value); setError(''); }}
          placeholder="CLAWCHAT_UI_TOKEN"
          className="w-full px-4 py-3 bg-[#1a1a2e] border border-[#2a2a4a] rounded-lg text-[#e0e0e0] placeholder-[#6c757d] focus:outline-none focus:border-[#e94560] font-mono text-sm"
          autoFocus
        />

        {error && (
          <p className="text-[#e74a3b] text-sm mt-2">{error}</p>
        )}

        <button
          type="submit"
          className="w-full mt-4 px-4 py-3 bg-[#e94560] text-white rounded-lg font-semibold hover:bg-[#d13a52] transition-colors"
        >
          Connect
        </button>
      </form>
    </div>
  );
}
