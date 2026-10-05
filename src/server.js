import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import authRoutes from './routes/auth.js';
import botRoutes from './routes/bots.js';

const app = Fastify({
  logger: {
    transport: process.env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
  },
});

await app.register(cors, {
  origin: true, // tighten this to a real allow-list before launch (see Week 3)
});

app.get('/health', async () => ({ status: 'ok', time: new Date().toISOString() }));

app.register(authRoutes, { prefix: '/api/auth' });
app.register(botRoutes, { prefix: '/api/bots' });

const port = Number(process.env.PORT) || 3000;

app
  .listen({ port, host: '0.0.0.0' })
  .then(() => app.log.info(`chatbot-platform listening on port ${port}`))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
