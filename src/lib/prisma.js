import { PrismaClient } from '@prisma/client';

// A single shared Prisma instance — avoids exhausting DB connections
// by creating a new client on every import.
export const prisma = new PrismaClient();
