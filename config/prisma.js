const { PrismaClient } = require('@prisma/client');

// Prisma Client-in tətbiq boyunca tək instansiyası (hot-reload / çoxlu instansiya problemlərinin qarşısını alır)
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

module.exports = prisma;
