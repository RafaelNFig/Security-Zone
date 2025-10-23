// backend/src/prismaClient.js

import { PrismaClient } from '@prisma/client';

// O log 'query' é útil em desenvolvimento para ver o SQL gerado
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

export default prisma;