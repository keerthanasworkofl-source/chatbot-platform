import { redis } from '../lib/redis.js';

/**
 * Very simple fixed-window rate limiter, keyed by tenant.
 * Good enough for Week 1 — swap for a token-bucket or @fastify/rate-limit
 * plugin once real traffic patterns show up.
 */
export function tenantRateLimit({ windowSeconds = 60, maxRequests = 120 } = {}) {
  return async function rateLimitHandler(request, reply) {
    const tenantId = request.auth?.tenantId;
    if (!tenantId) return; // requireAuth should run first; skip if no tenant yet

    const key = `ratelimit:${tenantId}:${Math.floor(Date.now() / 1000 / windowSeconds)}`;
    const count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(key, windowSeconds);
    }

    if (count > maxRequests) {
      return reply.code(429).send({ error: 'Rate limit exceeded, slow down.' });
    }
  };
}
