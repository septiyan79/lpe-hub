import { PrismaClient } from '../app/generated/prisma/index.js';
const prisma = new PrismaClient();

const permits = await prisma.expatPermit.findMany({
  where: { scanUrl: { not: null } },
  orderBy: { updatedAt: 'desc' },
  take: 10,
  select: { id: true, scanUrl: true, expatId: true, updatedAt: true }
});

console.log('=== ExpatPermit with scanUrl (latest 10) ===');
permits.forEach(p => console.log(p));

const familyPermits = await prisma.familyPermit.findMany({
  where: { scanUrl: { not: null } },
  orderBy: { updatedAt: 'desc' },
  take: 10,
  select: { id: true, scanUrl: true, familyId: true, updatedAt: true }
});

console.log('\n=== FamilyPermit with scanUrl (latest 10) ===');
familyPermits.forEach(p => console.log(p));

await prisma.$disconnect();
