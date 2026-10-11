import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();
async function main() {
  await prisma.church.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", name: process.env.CHURCH_NAME || "Church" }
  });
  const email = (process.env.ADMIN_EMAIL || "admin@church.local").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "ChangeMe123!";
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { name: "Church Administrator", email, passwordHash, role: "ADMIN" }
  });
  console.log(`Admin account ready: ${email}`);
  if (!process.env.ADMIN_PASSWORD) console.warn("Temporary development password: ChangeMe123! Set ADMIN_PASSWORD before seeding any shared environment.");
}
main().finally(() => prisma.$disconnect());