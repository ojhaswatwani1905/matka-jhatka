import { PrismaClient } from '@prisma/client';

// Single shared PrismaClient singleton for maximum connection pooling efficiency under high traffic
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});
