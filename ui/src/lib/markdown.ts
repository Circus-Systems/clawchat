// Markdown configuration for streaming-safe rendering
// Split text at the last complete block boundary for safe incremental rendering
export function splitAtSafeBoundary(text: string): [string, string] {
  // Find the last double newline (block boundary)
  const lastBlock = text.lastIndexOf('\n\n');
  if (lastBlock === -1) return ['', text];

  // Check if we're in the middle of a code fence
  const before = text.slice(0, lastBlock);
  const fenceCount = (before.match(/```/g) || []).length;
  if (fenceCount % 2 !== 0) {
    // Inside a code fence — find the opening fence
    const lastFence = before.lastIndexOf('```');
    if (lastFence > 0) {
      const safeBoundary = before.lastIndexOf('\n\n', lastFence);
      if (safeBoundary > 0) {
        return [text.slice(0, safeBoundary), text.slice(safeBoundary)];
      }
    }
    return ['', text];
  }

  return [text.slice(0, lastBlock), text.slice(lastBlock)];
}
