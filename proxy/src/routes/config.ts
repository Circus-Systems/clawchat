import type { FastifyInstance } from 'fastify';
import fs from 'fs/promises';
import { resolveHomePath } from '../openclaw-home.js';
import { gatewayRpc } from '../gateway-ws.js';

export default async function configRoutes(app: FastifyInstance) {
  // Read config
  app.get('/api/config', async () => {
    const configPath = resolveHomePath('openclaw.json');
    const raw = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(raw);
    // Strip sensitive tokens
    const sanitized = { ...config };
    if (sanitized.gateway?.auth?.token) {
      sanitized.gateway.auth.token = '***';
    }
    if (sanitized.channels) {
      for (const [, ch] of Object.entries(sanitized.channels as Record<string, Record<string, unknown>>)) {
        if (ch.token) ch.token = '***';
      }
    }
    return { config: sanitized };
  });

  // Patch config via Gateway RPC
  app.patch<{ Body: Record<string, unknown> }>('/api/config', async (req, reply) => {
    try {
      const result = await gatewayRpc('config.patch', {
        raw: JSON.stringify(req.body),
      });
      return { patched: true, result };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return reply.code(500).send({ error: message });
    }
  });
}
