import dotenv from 'dotenv';
dotenv.config({ override: true });
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyCors from '@fastify/cors';
import fastifyWebsocket from '@fastify/websocket';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateUiToken, validateWsToken } from './auth.js';
import { connectToGateway, onGatewayEvent, sendRawToGateway, isGatewayConnected, getHelloOk } from './gateway-ws.js';
import agentRoutes from './routes/agents.js';
import fileRoutes from './routes/files.js';
import sessionRoutes from './routes/sessions.js';
import configRoutes from './routes/config.js';
import logRoutes from './routes/logs.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const app = Fastify({ logger: true });

  // CORS
  await app.register(fastifyCors, {
    origin: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
      : true,
    credentials: true,
  });

  // WebSocket support
  await app.register(fastifyWebsocket);

  // Auth hook for /api routes
  app.addHook('onRequest', (req, reply, done) => {
    if (req.url.startsWith('/api/')) {
      return validateUiToken(req, reply, done);
    }
    done();
  });

  // API routes
  await app.register(agentRoutes);
  await app.register(fileRoutes);
  await app.register(sessionRoutes);
  await app.register(configRoutes);
  await app.register(logRoutes);

  // Health check
  app.get('/api/health', async () => ({
    status: 'ok',
    gatewayConnected: isGatewayConnected(),
    helloOk: getHelloOk(),
  }));

  // WebSocket proxy: browser <-> Gateway
  app.register(async function wsRoutes(app) {
    app.get('/ws', { websocket: true }, (socket, req) => {
      // Validate UI token from query param
      const url = new URL(req.url!, `http://${req.headers.host}`);
      const token = url.searchParams.get('token');

      if (!validateWsToken(token || undefined)) {
        socket.close(4001, 'Unauthorized');
        return;
      }

      if (!isGatewayConnected()) {
        socket.close(4002, 'Gateway not connected');
        return;
      }

      console.log('[ws] Client connected');

      // Send hello-ok snapshot to client
      const helloOk = getHelloOk();
      if (helloOk) {
        socket.send(JSON.stringify({
          type: 'response',
          id: 'proxy-hello',
          result: helloOk,
        }));
      }

      // Forward Gateway events to this client
      const unsubscribe = onGatewayEvent((frame) => {
        if (socket.readyState === 1) { // OPEN
          socket.send(JSON.stringify(frame));
        }
      });

      // Forward client messages to Gateway
      socket.on('message', (data) => {
        try {
          const msg = data.toString();
          const parsed = JSON.parse(msg);
          // Don't forward connect requests (proxy handles auth)
          if (parsed.method === 'connect') {
            socket.send(JSON.stringify({
              type: 'response',
              id: parsed.id,
              result: helloOk,
            }));
            return;
          }
          sendRawToGateway(msg);
        } catch {}
      });

      socket.on('close', () => {
        console.log('[ws] Client disconnected');
        unsubscribe();
      });
    });
  });

  // Static SPA serving (production)
  const publicDir = path.join(__dirname, '..', 'public');
  const fs = await import('fs/promises');
  const hasIndexHtml = await fs.access(path.join(publicDir, 'index.html')).then(() => true).catch(() => false);

  if (hasIndexHtml) {
    await app.register(fastifyStatic, {
      root: publicDir,
      prefix: '/',
      wildcard: false,
    });

    // SPA fallback — serve index.html for non-API, non-WS routes
    app.setNotFoundHandler((req, reply) => {
      if (req.url.startsWith('/api/') || req.url.startsWith('/ws')) {
        reply.code(404).send({ error: 'Not found' });
      } else {
        reply.sendFile('index.html');
      }
    });
  } else {
    console.log('[server] No index.html in public/ — skipping static serving (dev mode)');
  }

  const host = process.env.HOST || '0.0.0.0';
  const port = parseInt(process.env.PORT || '3100', 10);

  // Connect to Gateway first
  try {
    await connectToGateway();
    console.log('[server] Connected to OpenClaw Gateway');
  } catch (err) {
    console.error('[server] Failed to connect to Gateway:', err);
    console.log('[server] Starting anyway, will retry connection...');
  }

  await app.listen({ host, port });
  console.log(`[server] ClawChat proxy listening on http://${host}:${port}`);
}

main().catch(console.error);
