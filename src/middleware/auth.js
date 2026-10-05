import jwt from 'jsonwebtoken';

/**
 * Fastify preHandler that verifies the JWT on incoming requests and
 * attaches { userId, tenantId } to request.auth.
 *
 * This is the single choke point that makes every route tenant-scoped:
 * every protected route reads request.auth.tenantId instead of trusting
 * anything the client sends in the body or query string.
 */
export async function requireAuth(request, reply) {
  const header = request.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return reply.code(401).send({ error: 'Missing or malformed Authorization header' });
  }

  const token = header.slice('Bearer '.length);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    request.auth = { userId: payload.sub, tenantId: payload.tenantId };
  } catch (err) {
    return reply.code(401).send({ error: 'Invalid or expired token' });
  }
}
