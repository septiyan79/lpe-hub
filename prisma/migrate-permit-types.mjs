/**
 * One-time migration:
 * - Rename "RPTKA" → "Pengesahan RPTKA"
 * - Set linkedToWorkPermit = true for work-permit-linked types
 *
 * Run: node prisma/migrate-permit-types.mjs
 */
import { PrismaClient } from "../app/generated/prisma/index.js";

const prisma = new PrismaClient();

const LINKED = [
  "Pengesahan RPTKA",
  "RPTKA",        // handle both names in case rename runs second
  "ITAS",
  "SKTT",
  "TTKOA",
  "SKLK-Karawang",
  "TTP-Karawang",
  "Keberadaan-Karawang",
];

async function main() {
  // 1. Rename RPTKA → Pengesahan RPTKA (only if old name still exists)
  const rptka = await prisma.permitType.findUnique({ where: { name: "RPTKA" } });
  if (rptka) {
    await prisma.permitType.update({
      where: { id: rptka.id },
      data: { name: "Pengesahan RPTKA", linkedToWorkPermit: true },
    });
    console.log('✓ Renamed "RPTKA" → "Pengesahan RPTKA" + linkedToWorkPermit = true');
  } else {
    console.log('· "RPTKA" not found (may already be renamed)');
  }

  // 2. Set linkedToWorkPermit = true for the rest
  const others = LINKED.filter(n => n !== "RPTKA" && n !== "Pengesahan RPTKA");
  for (const name of others) {
    const t = await prisma.permitType.findUnique({ where: { name } });
    if (t) {
      await prisma.permitType.update({ where: { id: t.id }, data: { linkedToWorkPermit: true } });
      console.log(`✓ ${name} → linkedToWorkPermit = true`);
    } else {
      console.log(`· "${name}" not found in DB (skip)`);
    }
  }

  // 3. Also ensure "Pengesahan RPTKA" is flagged (if rename already done)
  const pRptka = await prisma.permitType.findUnique({ where: { name: "Pengesahan RPTKA" } });
  if (pRptka && !pRptka.linkedToWorkPermit) {
    await prisma.permitType.update({ where: { id: pRptka.id }, data: { linkedToWorkPermit: true } });
    console.log('✓ "Pengesahan RPTKA" → linkedToWorkPermit = true');
  }

  console.log("\nDone.");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
