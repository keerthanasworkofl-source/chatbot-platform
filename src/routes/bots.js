import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { tenantRateLimit } from '../middleware/rateLimit.js';

export default async function botRoutes(app) {
  // Every route in this file runs requireAuth first, so request.auth.tenantId
  // is always available and every Prisma call below filters by it.
  app.addHook('preHandler', requireAuth);
  app.addHook('preHandler', tenantRateLimit());

  // List all bots belonging to the caller's tenant.
  app.get('/', async (request) => {
    const bots = await prisma.bot.findMany({
      where: { tenantId: request.auth.tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return { bots };
  });

  // Create a new bot for the caller's tenant.
  app.post('/', async (request, reply) => {
    const { name, systemPrompt, model } = request.body ?? {};

    if (!name) {
      return reply.code(400).send({ error: 'name is required' });
    }

    const bot = await prisma.bot.create({
      data: {
        tenantId: request.auth.tenantId,
        name,
        systemPrompt: systemPrompt || undefined,
        model: model || undefined,
      },
    });

    return reply.code(201).send({ bot });
  });

  // Fetch a single bot — 404s (not 403) if it belongs to another tenant,
  // so we never confirm to a caller that another tenant's bot exists.
  app.get('/:id', async (request, reply) => {
    const bot = await prisma.bot.findFirst({
      where: { id: request.params.id, tenantId: request.auth.tenantId },
    });
    if (!bot) return reply.code(404).send({ error: 'Bot not found' });
    return { bot };
  });

  app.patch('/:id', async (request, reply) => {
    const { name, systemPrompt, model, isActive } = request.body ?? {};

    const existing = await prisma.bot.findFirst({
      where: { id: request.params.id, tenantId: request.auth.tenantId },
    });
    if (!existing) return reply.code(404).send({ error: 'Bot not found' });

    const bot = await prisma.bot.update({
      where: { id: existing.id },
      data: {
        name: name ?? undefined,
        systemPrompt: systemPrompt ?? undefined,
        model: model ?? undefined,
        isActive: typeof isActive === 'boolean' ? isActive : undefined,
      },
    });

    return { bot };
  });

  app.delete('/:id', async (request, reply) => {
    const existing = await prisma.bot.findFirst({
      where: { id: request.params.id, tenantId: request.auth.tenantId },
    });
    if (!existing) return reply.code(404).send({ error: 'Bot not found' });

    await prisma.bot.delete({ where: { id: existing.id } });
    return reply.code(204).send();
  });
}
