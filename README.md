# Chatbot Platform — Week 1 Scaffold

Multi-tenant foundation: tenant signup/login, JWT auth, and a tenant-scoped
Bot CRUD API. This is the base that Weeks 2–4 (conversation engine, widget,
dashboard, deploy) build on top of.

## What's here

```
src/
  server.js           # Fastify app entrypoint
  routes/
    auth.js           # POST /api/auth/signup, /api/auth/login
    bots.js           # CRUD for bots, all scoped to the caller's tenant
  middleware/
    auth.js            # verifies JWT, attaches request.auth = { userId, tenantId }
    rateLimit.js        # simple per-tenant rate limiting via Redis
  lib/
    prisma.js          # shared Prisma client
    redis.js            # shared Redis client
prisma/
  schema.prisma         # Tenant, User, Bot, Conversation, Message models
docker-compose.yml       # Postgres + Redis for local dev
Dockerfile               # for deploying the API later (Week 4)
```

## Requirements

- Node.js 20+ (you're on 22, that's fine)
- Docker Desktop (for Postgres + Redis locally) — or your own Postgres/Redis
- npm

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start Postgres + Redis**
   ```bash
   docker compose up -d
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   Open `.env` and set `JWT_SECRET` to any long random string. The
   `DATABASE_URL` and `REDIS_URL` defaults already match docker-compose.

4. **Create the database tables**
   ```bash
   npx prisma migrate dev --name init
   ```
   This reads `prisma/schema.prisma` and creates the tables in Postgres.

5. **Run the server**
   ```bash
   npm run dev
   ```
   You should see `chatbot-platform listening on port 3000`.

## Try it

Create a tenant + first user:
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"companyName":"Acme Inc","email":"you@acme.com","password":"supersecret1"}'
```

This returns a `token`. Use it to create a bot:
```bash
curl -X POST http://localhost:3000/api/bots \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer PASTE_TOKEN_HERE" \
  -d '{"name":"Support Bot","systemPrompt":"You help customers with billing questions."}'
```

List your tenant's bots:
```bash
curl http://localhost:3000/api/bots \
  -H "Authorization: Bearer PASTE_TOKEN_HERE"
```

Try that same `GET /api/bots` with no token, or a token from a different
tenant — you'll get a 401, and any bot IDs belonging to other tenants
come back as 404, never leaked.

## What's next (Week 2)

- Conversation + message endpoints
- Claude API integration for actual bot responses
- Basic knowledge upload for retrieval

## Notes

- `origin: true` in `src/server.js`'s CORS config is wide open for local
  dev — lock this down to a real domain allow-list before the public
  widget ships (Week 3).
- Passwords are hashed with bcrypt (cost factor 12); never store plaintext.
- If you don't have Docker, install Postgres 16 and Redis 7 locally instead
  and just point `DATABASE_URL` / `REDIS_URL` in `.env` at them.
