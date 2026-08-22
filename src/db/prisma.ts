import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __bafnaPrisma: PrismaClient | undefined;
}

export const prisma = global.__bafnaPrisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') global.__bafnaPrisma = prisma;

export async function connectPostgres(): Promise<void> {
  await prisma.$connect();
  console.log('✅ PostgreSQL Connected');
}

export async function disconnectPostgres(): Promise<void> {
  await prisma.$disconnect();
}

