import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import "dotenv/config";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding SmartCampus AI database...");

  // Create roles
  const roles = [
    { name: "SUPER_ADMIN", label: "Super Admin" },
    { name: "INSTITUTION_ADMIN", label: "Institution Admin" },
    { name: "TEACHER", label: "Teacher" },
    { name: "DEVICE_MANAGER", label: "Device Manager" },
    { name: "RESEARCH_ANALYST", label: "Research Analyst" },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { label: role.label },
      create: role,
    });
  }

  console.log("✅ Roles seeded successfully");
  console.log("🌱 Seed complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
