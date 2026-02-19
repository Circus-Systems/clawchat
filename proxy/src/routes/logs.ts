import type { FastifyInstance } from 'fastify';
import fs from 'fs/promises';
import path from 'path';
import { getOpenClawHome } from '../openclaw-home.js';

export default async function logRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { lines?: string; level?: string } }>('/api/logs', async (req) => {
    const maxLines = parseInt(req.query.lines || '100', 10);
    const levelFilter = req.query.level;
    const logsDir = path.join(getOpenClawHome(), 'logs');

    try {
      const files = await fs.readdir(logsDir);
      const logFiles = files.filter(f => f.endsWith('.log')).sort().reverse();

      if (logFiles.length === 0) {
        return { entries: [] };
      }

      // Read most recent log file
      const logPath = path.join(logsDir, logFiles[0]);
      const content = await fs.readFile(logPath, 'utf-8');
      let lines = content.split('\n').filter(l => l.trim());

      // Parse and filter
      const entries = [];
      for (const line of lines.slice(-maxLines * 2)) {
        try {
          const parsed = JSON.parse(line);
          if (levelFilter && parsed.level !== levelFilter) continue;
          entries.push(parsed);
        } catch {
          // Plain text log line
          if (!levelFilter) {
            entries.push({ message: line, level: 'info', timestamp: new Date().toISOString() });
          }
        }
      }

      return { entries: entries.slice(-maxLines) };
    } catch {
      return { entries: [] };
    }
  });
}
