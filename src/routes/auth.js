import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function signToken(user) {
  return jwt.sign(
    { sub: user.id, tenantId: user.tenantId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

export default async function authRoutes(app) {
  // Creates a brand-new tenant plus its first (owner) user.
  app.post('/signup', async (request, reply) => {
    const { companyName, email, password } = request.body ?? {};

    if (!companyName || !email || !password) {
      return reply.code(400).send({ error: 'companyName, email and password are required' });
    }
    if (password.length < 8) {
      return reply.code(400).send({ error: 'Password must be at least 8 characters' });
    }

    const slug = slugify(companyName);
    const existingTenant = await prisma.tenant.findUnique({ where: { slug } });
    if (existingTenant) {
      return reply.code(409).send({ error: 'A tenant with a similar name already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const tenant = await prisma.tenant.create({
      data: {
        name: companyName,
        slug,
        users: {
          create: { email, passwordHash, role: 'owner' },
        },
      },
      include: { users: true },
    });

    const user = tenant.users[0];
    const token = signToken(user);

    return reply.code(201).send({
      token,
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
      user: { id: user.id, email: user.email, role: user.role },
    });
  });

  // Logs an existing user into their tenant.
  app.post('/login', async (request, reply) => {
    const { email, password } = request.body ?? {};

    if (!email || !password) {
      return reply.code(400).send({ error: 'email and password are required' });
    }

    const user = await prisma.user.findFirst({ where: { email } });
    if (!user) {
      return reply.code(401).send({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return reply.code(401).send({ error: 'Invalid email or password' });
    }

    const token = signToken(user);
    return reply.send({ token, user: { id: user.id, email: user.email, role: user.role } });
  });
}
