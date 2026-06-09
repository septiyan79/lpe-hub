import { PrismaClient } from '../app/generated/prisma/index.js';
const prisma = new PrismaClient();

const expat = await prisma.expatriate.findUnique({
  where: { id: 'cmp2cpq2y001w7fx8xb9lapt7' },
  include: {
    permits: true,
    families: { include: { permits: true } }
  }
});

if (!expat) { console.log('NOT FOUND'); process.exit(1); }

console.log('Name:', expat.name);
console.log('\n=== Expat Permits ===');
expat.permits.forEach(p => {
  console.log(`  [${p.id}] ${p.permitType} | status:${p.status} | scanUrl:${p.scanUrl ?? 'null'}`);
});

console.log('\n=== Family ===');
expat.families.forEach(f => {
  console.log(`  ${f.name} (${f.id})`);
  f.permits.forEach(p => {
    console.log(`    [${p.id}] ${p.permitType} | scanUrl:${p.scanUrl ?? 'null'}`);
  });
});

await prisma.$disconnect();
