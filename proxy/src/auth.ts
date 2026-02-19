import type { FastifyRequest, FastifyReply } from 'fastify';

export function validateUiToken(req: FastifyRequest, reply: FastifyReply, done: (err?: Error) => void) {
  const token = process.env.CLAWCHAT_UI_TOKEN;
  if (!token) {
    reply.code(500).send({ error: 'CLAWCHAT_UI_TOKEN not configured' });
    return done();
  }

  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ') || auth.slice(7) !== token) {
    reply.code(401).send({ error: 'Unauthorized' });
    return done();
  }
  done();
}

export function validateWsToken(tokenParam: string | undefined): boolean {
  const token = process.env.CLAWCHAT_UI_TOKEN;
  if (!token) return false;
  return tokenParam === token;
}
