import { PrismaClient } from "../app/generated/prisma/index.js";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("password123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "sep@dnp-g.com" },
    update: { role: "admin" },
    create: {
      name: "Admin",
      email: "sep@dnp-g.com",
      password: hashedPassword,
      role: "admin",
    },
  });

  const user = await prisma.user.upsert({
    where: { email: "admin.ga@dnp-g.com" },
    update: {},
    create: {
      name: "Wina",
      email: "admin.ga@dnp-g.com",
      password: hashedPassword,
      role: "employee",
    },
  });

  console.log("✅ Admin berhasil dibuat:", admin.name, "-", admin.email, "(role:", admin.role + ")");
  console.log("✅ User berhasil dibuat:", user.name, "-", user.email, "(role:", user.role + ")");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
